import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { saveAndShareFile } from '@/lib/exportUtils';

interface ImportResult {
  total: number;
  imported: number;
  duplicates: number;
  errors: number;
  message?: string;
}

function parseCsvToJson(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = line.split(';').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
}

function parseXlsxToJson(buffer: ArrayBuffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
}

const ImportPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingExport, setDownloadingExport] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setProgress(10);
    setError(null);

    try {
      let rows: Record<string, string>[];
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        setProgress(30);
        rows = parseXlsxToJson(buffer);
      } else {
        const text = await file.text();
        setProgress(30);
        rows = parseCsvToJson(text);
      }

      if (rows.length === 0) {
        throw new Error('Le fichier est vide ou mal formaté.');
      }
      setProgress(50);

      const { data, error: fnError } = await supabase.functions.invoke('process-attendance', {
        body: { rows, filename: file.name },
      });

      setProgress(90);

      if (fnError) {
        throw new Error(fnError.message || 'Erreur lors du traitement du fichier.');
      }

      const importResult: ImportResult = {
        total: data?.total ?? rows.length,
        imported: data?.imported ?? rows.length,
        duplicates: data?.duplicates ?? 0,
        errors: data?.errors ?? 0,
        message: data?.message,
      };

      setResult(importResult);
      setProgress(100);
      setDone(true);
      toast({ title: 'Import réussi', description: `${importResult.imported} enregistrements importés.` });
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
      toast({ title: "Erreur d'import", description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setDownloadingExport(true);
    try {
      // Fetch personnel
      const { data: personnel, error: pErr } = await supabase.from('personnel').select('*');
      if (pErr) throw pErr;

      // Fetch pointages
      const { data: pointages, error: ptErr } = await supabase.from('pointages').select('*');
      if (ptErr) throw ptErr;

      // Build personnel sheet
      const personnelRows = (personnel || []).map(p => ({
        Matricule: p.matricule,
        Nom: p.nom_prenom,
        Chantier: p.chantier,
        Contrat: p.type_contrat,
        'Montant Journalier': p.montant_journalier_frais,
        Téléphone: p.telephone || '',
      }));

      // Build pointages sheet with personnel names
      const personnelMap = new Map((personnel || []).map(p => [p.id, p]));
      const pointageRows = (pointages || []).map(pt => {
        const p = personnelMap.get(pt.personnel_id);
        return {
          Matricule: p?.matricule || '',
          Nom: p?.nom_prenom || '',
          Date: pt.date_pointage,
          Présent: pt.present ? 'Oui' : 'Non',
          'Validé DT': pt.valide_par_dt ? 'Oui' : 'Non',
        };
      });

      const wb = XLSX.utils.book_new();
      const wsPersonnel = XLSX.utils.json_to_sheet(personnelRows);
      const wsPointages = XLSX.utils.json_to_sheet(pointageRows);
      XLSX.utils.book_append_sheet(wb, wsPersonnel, 'Personnel');
      XLSX.utils.book_append_sheet(wb, wsPointages, 'Pointages');

      const fileName = `export_sames_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAndShareFile(blob, fileName);
      toast({ title: 'Export réussi', description: 'Le fichier XLSX a été généré.' });
    } catch (err: any) {
      toast({ title: "Erreur d'export", description: err.message, variant: 'destructive' });
    } finally {
      setDownloadingExport(false);
    }
  };

  const reset = () => {
    setDone(false);
    setFile(null);
    setProgress(0);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Importation & Export</h1>
          <p className="text-muted-foreground">Importer des données CSV / XLSX ou exporter en XLSX</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={downloadingExport}>
          <Download className="h-4 w-4 mr-2" />
          {downloadingExport ? 'Export en cours…' : 'Exporter en XLSX'}
        </Button>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-lg">Charger un fichier</CardTitle>
        </CardHeader>
        <CardContent>
          {done && result ? (
            <div className="flex flex-col items-center py-8">
              <CheckCircle2 className="h-16 w-16 text-primary mb-4" />
              <p className="text-lg font-medium">Import terminé !</p>
              <p className="text-sm text-muted-foreground mt-1">{file?.name}</p>
              <div className="mt-4 rounded-lg bg-muted p-4 w-full">
                <p className="text-sm font-medium mb-2">Récapitulatif :</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {result.total} lignes traitées</li>
                  <li>• {result.imported} enregistrements importés</li>
                  {result.duplicates > 0 && <li>• {result.duplicates} doublons ignorés</li>}
                  {result.errors > 0 && <li>• {result.errors} erreurs</li>}
                </ul>
                {result.message && <p className="text-xs text-muted-foreground mt-2">{result.message}</p>}
              </div>
              <Button variant="outline" className="mt-4" onClick={reset}>
                Nouvel import
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 p-8 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {file ? (
                  <>
                    <FileSpreadsheet className="h-10 w-10 text-primary mb-3" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="font-medium">Cliquez pour sélectionner un fichier</p>
                    <p className="text-xs text-muted-foreground">Formats acceptés : CSV, XLSX, XLS</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />

              {importing && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    {progress < 30 ? 'Lecture du fichier...' : progress < 50 ? 'Analyse des données...' : progress < 90 ? 'Envoi au serveur...' : 'Finalisation...'}
                  </p>
                </div>
              )}

              <Button onClick={handleImport} disabled={!file || importing} className="w-full">
                {importing ? 'Importation en cours...' : "Lancer l'import"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default ImportPage;
