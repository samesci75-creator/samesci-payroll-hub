import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Pencil, Trash2, Loader2, Upload, FileSpreadsheet, User, History, Eye, X, Phone, Banknote, Image as ImageIcon, ClipboardCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { saveAndShareFile } from '@/lib/exportUtils';

interface Personnel {
  id: string;
  photo_profil_url?: string | null;
  matricule: string;
  nom_prenom: string;
  type_contrat: string;
  montant_journalier_frais: number;
  chantier: string;
  entite?: string;
  telephone: string | null;
  agent_chantiers?: any[];
}

interface Paiement {
  id: string;
  montant: number;
  date_paiement: string;
  photo_decharge_url: string | null;
  created_at: string;
}

const PersonnelPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'directeur';

  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [newAgentEntite, setNewAgentEntite] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fiche agent state
  const [selectedAgent, setSelectedAgent] = useState<Personnel | null>(null);
  const [ficheOpen, setFicheOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [paiementsLoading, setPaiementsLoading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Affectations state
  const [affectations, setAffectations] = useState<any[]>([]);
  const [affectationsLoading, setAffectationsLoading] = useState(false);
  const [affectationLoading, setAffectationLoading] = useState(false);

  const fetchAffectations = async (personnelId: string) => {
    setAffectationsLoading(true);
    const { data } = await supabase.from('agent_chantiers').select('*').eq('personnel_id', personnelId).eq('actif', true);
    setAffectations(data || []);
    setAffectationsLoading(false);
  };

  // Real chantiers state
  const [allChantiers, setAllChantiers] = useState<any[]>([]);

  // Filter state
  const [filterChantier, setFilterChantier] = useState<string>('all');
  const [chantiers, setChantiers] = useState<string[]>([]);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<Personnel>>({});

  const fetchPersonnel = async () => {
    let query = supabase.from('personnel').select('*, agent_chantiers(chantier, montant_journalier_frais, actif)').order('created_at', { ascending: false });
    
    const { data } = await query;
    let list = (data as Personnel[]) || [];

    // RBAC: Chef de chantier ne voit que ses chantiers assignés
    if (user?.role === 'chef_chantier') {
      if (user?.chantiers_autorises && user.chantiers_autorises.length > 0) {
        if (!user.chantiers_autorises.includes('*') && !user.chantiers_autorises.includes('TOUS')) {
          list = list.filter(p => {
            if (p.chantier && user.chantiers_autorises.includes(p.chantier)) return true;
            if (p.agent_chantiers && p.agent_chantiers.some(ac => ac.actif && user.chantiers_autorises.includes(ac.chantier))) return true;
            return false;
          });
        }
      } else {
        list = [];
      }
    }
    setPersonnel(list);
    
    // Extract unique chantiers (if chef_chantier, there will likely just be one)
    const uniqueChantiers = [...new Set(list.map(p => p.chantier).filter(Boolean))].sort();
    setChantiers(uniqueChantiers);
    
    // Fetch real chantiers for dropdowns
    const { data: chs } = await supabase.from('chantiers').select('id, nom').order('nom');
    setAllChantiers(chs || []);
    
    setLoading(false);
  };

  useEffect(() => { fetchPersonnel(); }, []);

  const fetchPaiements = async (personnelId: string) => {
    setPaiementsLoading(true);
    // On récupère tout ce qui appartient à l'ID ou qui pourrait être lié par erreur (si plusieurs IDs existent pour le même matricule/nom)
    const { data, error } = await supabase
      .from('paiements')
      .select('*')
      .eq('personnel_id', personnelId)
      .order('date_paiement', { ascending: false });
      
    if (error) {
      console.error("Fetch paiements error:", error);
    }
    
    const formatted = (data || []).map((p: any) => ({
      ...p,
      montant: Number(p.montant) || Number(p.montant_paye) || 0
    }));
    setPaiements(formatted as Paiement[]);
    setPaiementsLoading(false);
  };

  const openFiche = (agent: Personnel) => {
    setSelectedAgent(agent);
    setEditForm({ ...agent });
    setFicheOpen(true);
    fetchPaiements(agent.id);
    fetchAffectations(agent.id);
  };

  const filtered = personnel.filter(p => {
    const matchesSearch = p.nom_prenom.toLowerCase().includes(search.toLowerCase()) || p.matricule.toLowerCase().includes(search.toLowerCase());
    const matchesChantier = filterChantier === 'all' || p.chantier === filterChantier;
    return matchesSearch && matchesChantier;
  });

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploadingPhoto(true);
    const fd = new FormData(e.currentTarget);
    
    let photoUrl = null;
    const photoFile = fd.get('photo') as File;
    if (photoFile && photoFile.size > 0) {
      const ext = photoFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const { data, error: uploadError } = await supabase.storage.from('profils').upload(fileName, photoFile);
      if (!uploadError && data) {
        photoUrl = supabase.storage.from('profils').getPublicUrl(fileName).data.publicUrl;
      }
    }

    // Use state value for entite since it's a controlled input (FormData won't capture it reliably)
    const entiteValue = newAgentEntite || (fd.get('entite') as string) || 'SAMES CI';

    try {
      const { error } = await supabase.from('personnel').insert({
        matricule: fd.get('matricule') as string,
        nom_prenom: fd.get('nom_prenom') as string,
        type_contrat: fd.get('type_contrat') as string,
        entite: entiteValue,
        telephone: (fd.get('telephone') as string) || null,
        photo_profil_url: photoUrl,
      });
      
      if (error) {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      } else {
        setOpen(false);
        toast({ title: 'Personnel ajouté' });
        fetchPersonnel();
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAgent) return;
    setEditSaving(true);
    
    const fd = new FormData(e.currentTarget);
    let photoUrl = editForm.photo_profil_url;
    
    const photoFile = fd.get('photo') as File;
    if (photoFile && photoFile.size > 0) {
      const ext = photoFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const { data, error: uploadError } = await supabase.storage.from('profils').upload(fileName, photoFile);
      if (!uploadError && data) {
        photoUrl = supabase.storage.from('profils').getPublicUrl(fileName).data.publicUrl;
      }
    }

    const { error } = await supabase.from('personnel').update({
      nom_prenom: editForm.nom_prenom,
      type_contrat: editForm.type_contrat,
      montant_journalier_frais: editForm.montant_journalier_frais,
      chantier: editForm.chantier,
      numero_affaire: editForm.chantier, // Mirroring for DB compatibility
      entite: editForm.entite,
      telephone: editForm.telephone || null,
      photo_profil_url: photoUrl,
    }).eq('id', selectedAgent.id);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profil mis à jour', description: `${editForm.nom_prenom} — informations enregistrées.` });
      setFicheOpen(false);
      fetchPersonnel();
    }
    setEditSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('personnel').delete().eq('id', id);
    if (!error) {
      toast({ title: 'Personnel supprimé' });
      fetchPersonnel();
    }
  };

  const handleAddAffectation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAgent) return;
    setAffectationLoading(true);
    const fd = new FormData(e.currentTarget);
    const chantierId = fd.get('nouveau_chantier_id') as string;
    const montantNum = Number(fd.get('nouveau_montant'));
    
    const chantierObj = allChantiers.find(c => c.id === chantierId);
    const chantierNom = chantierObj ? chantierObj.nom : 'Inconnu';
    
    const { error } = await supabase.from('agent_chantiers').insert({
      personnel_id: selectedAgent.id,
      chantier_id: chantierId,
      chantier: chantierNom,
      numero_affaire: chantierNom,
      montant_journalier_frais: montantNum,
      actif: true
    });
    
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Affectation ajoutée' });
      fetchAffectations(selectedAgent.id);
      fetchPersonnel();
    }
    setAffectationLoading(false);
  };

  const handleDeleteAffectation = async (id: string) => {
    const { error } = await supabase.from('agent_chantiers').delete().eq('id', id);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Affectation supprimée' });
      if (selectedAgent) fetchAffectations(selectedAgent.id);
      fetchPersonnel();
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const buffer = await importFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      // Get raw data as an array of arrays to find the actual header row
      const rawRows = XLSX.utils.sheet_to_json<any[][]>(sheet, { header: 1, defval: '' });
      if (rawRows.length === 0) throw new Error('Le fichier est vide.');

      // Find the header row index (where Matricule/Mle is)
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(20, rawRows.length); i++) {
        const row = rawRows[i];
        if (!row) continue;
        const rowStr = row.join(' ').toLowerCase();
        if (rowStr.includes('matricule') || rowStr.includes('mle')) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
        throw new Error('Impossible de trouver la ligne d\'en-tête avec "Matricule" ou "Mle".');
      }

      // Convert to JSON using the found header row
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { 
        range: headerRowIndex,
        defval: '' 
      });

      let imported = 0;
      let skipped = 0;
      let errors = 0;
      let duplicates = 0;

      for (const row of rows) {
        const matricule = String(row['Mle'] || row['Matricule'] || row['matricule'] || '').trim();
        const nom = String(row['Nom & Prénoms'] || row['Nom et Prénoms'] || row['Nom prénoms'] || row['Nom'] || row['nom_prenom'] || '').trim();
        const chantier = String(row['Entreprise'] || row['Affaire'] || row['Chantier'] || row['chantier'] || row['numero_affaire'] || 'SAMES CI').trim();
        const entite = String(row['Entité'] || row['Société'] || row['entite'] || 'SAMES CI').trim();
        const typeRaw = String(row['Fonction'] || row['Nature'] || row['Type'] || row['type_contrat'] || '').trim().toLowerCase();
        
        let montant = 0;
        const mtRaw = row['M. Journalier'] || row['Taux Journalier'] || row['Montant'] || row['montant_journalier_frais'];
        if (mtRaw) {
          montant = Number(String(mtRaw).replace(/[^0-9.-]+/g, ''));
        }

        const telephone = String(row['Téléphone'] || row['telephone'] || '').trim() || null;
        const photoUrl = String(row['Photo'] || row['photo_url'] || row['photo_profil_url'] || '').trim() || null;

        if (!matricule || !nom) { 
          skipped++; 
          continue; 
        }

        const type_contrat = (typeRaw.includes('mensuel') || typeRaw.includes('mois')) ? 'mensuel' : 'journalier';

        // Check for existing agent by matricule
        const { data: existing, error: fetchError } = await supabase
          .from('personnel')
          .select('id')
          .eq('matricule', matricule)
          .maybeSingle();
        
        if (fetchError) {
          console.error(`Erreur recherche matricule ${matricule}:`, fetchError);
          errors++;
          continue;
        }

        if (existing) { 
          duplicates++; 
          continue; 
        }

        const { error } = await supabase.from('personnel').insert({
          matricule,
          nom_prenom: nom,
          type_contrat,
          montant_journalier_frais: montant || 0,
          chantier: chantier || 'SAMES CI',
          numero_affaire: chantier || 'SAMES CI',
          entite: entite || 'SAMES CI',
          telephone,
          photo_profil_url: photoUrl,
        });

        if (error) { 
          console.error(`Erreur insertion matricule ${matricule}:`, error);
          errors++; 
        } else { 
          imported++; 
        }
      }

      toast({
        title: 'Importation terminée',
        description: `${imported} agent(s) ajouté(s). Doublons: ${duplicates}, Ignorés (vides): ${skipped}, Erreurs: ${errors}.`,
      });
      setImportOpen(false);
      setImportFile(null);
      fetchPersonnel();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const getBase64ImageFromUrl = async (imageUrl: string) => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(reader.result as string), false);
        reader.addEventListener("error", () => reject());
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return null;
    }
  };

  const fmtNum = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const ascii = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u2013/g, '-').replace(/[^\x00-\x7F]/g, '?');

  const exportHistoriquePDF = async () => {
    if (!selectedAgent) return;
    const doc = new jsPDF();
    const dateStr = format(new Date(), 'dd/MM/yyyy HH:mm');

    doc.setFontSize(18);
    doc.text(ascii('SAMES CI - Historique des paiements'), 14, 20);
    doc.setFontSize(10);
    doc.text(ascii(`Genere le ${dateStr}`), 14, 28);

    doc.setFontSize(12);
    doc.text('Informations de l\'agent', 14, 38);
    doc.setFontSize(10);
    doc.text(`Matricule : ${selectedAgent.matricule}`, 14, 46);
    doc.text(ascii(`Nom & Prenom : ${selectedAgent.nom_prenom}`), 14, 52);
    doc.text(ascii(`Chantier : ${selectedAgent.chantier}`), 14, 58);

    if (selectedAgent.photo_profil_url) {
      try {
        const imgData = await getBase64ImageFromUrl(selectedAgent.photo_profil_url);
        if (imgData) {
          // Photo de profil en haut à droite avec bordure
          doc.setDrawColor(35, 95, 50); // Vert SAMES
          doc.setLineWidth(0.5);
          doc.rect(160, 15, 30, 30);
          doc.addImage(imgData, 'JPEG', 160.5, 15.5, 29, 29);
        }
      } catch (e) {
        console.warn("PDF Photo CORS/Fetch error:", e);
        // Fallback visuel
        doc.setDrawColor(200);
        doc.rect(160, 15, 30, 30);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("Photo non", 165, 28);
        doc.text("disponible", 165, 33);
      }
    }

    if (paiements.length > 0) {
      autoTable(doc, {
        startY: 75,
        head: [['Date', 'Montant', 'Statut Decharge']],
        body: paiements.map(p => [
          format(new Date(p.date_paiement), 'dd/MM/yyyy'),
          `${fmtNum(p.montant)}F`,
          p.photo_decharge_url ? 'Signe (Oui)' : 'Non Signe'
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [35, 95, 50] },
      });
    } else {
      doc.setFontSize(11);
      doc.text('Aucun paiement enregistre.', 14, 75);
    }

    const fileName = `recu-paiement-${selectedAgent.matricule}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    const blob = doc.output('blob');
    saveAndShareFile(blob, fileName);
  };

  if (loading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion du Personnel</h1>
          <p className="text-muted-foreground">{personnel.length} agents enregistrés</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />Importer
            </Button>
          )}
          {isAdmin && (
            <Dialog open={open} onOpenChange={(val) => {
              setOpen(val);
              if (!val) setNewAgentEntite('');
            }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Ajouter</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nouvel agent</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label>Photo de profil</Label>
                  <Input name="photo" type="file" accept="image/*" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Matricule</Label><Input name="matricule" placeholder="SAM-007" required /></div>
                  <div className="space-y-2"><Label>Nom & Prénom</Label><Input name="nom_prenom" placeholder="Nom complet" required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type de contrat</Label>
                    <Select 
                      name="type_contrat" 
                      defaultValue="journalier"
                      onValueChange={(val) => {
                        if (val === 'mensuel') setNewAgentEntite('SAMES CI');
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="journalier">Journalier</SelectItem>
                        <SelectItem value="mensuel">Mensuel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Entité</Label>
                    <Input name="entite" value={newAgentEntite} onChange={e => setNewAgentEntite(e.target.value)} placeholder="SAMES CI" required />
                  </div>
                </div>
                <div className="space-y-2"><Label>Téléphone</Label><Input name="telephone" placeholder="0708001122" /></div>
                <Button type="submit" className="w-full" disabled={uploadingPhoto}>
                  {uploadingPhoto ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Traitement...</> : 'Enregistrer'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Importer du personnel depuis Excel</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Le fichier sera analysé automatiquement pour trouver la ligne d'en-tête. Colonnes reconnues :<br/>
              <strong>Mle / Matricule</strong>, <strong>Nom & Prénoms / Nom</strong>, <strong>Entreprise / Affaire / Chantier</strong>, <strong>Fonction / Type</strong>, <strong>M. Journalier / Taux Journalier / Montant</strong>.
            </p>
            <div
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 p-8 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {importFile ? (
                <>
                  <FileSpreadsheet className="h-10 w-10 text-primary mb-3" />
                  <p className="font-medium">{importFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(importFile.size / 1024).toFixed(1)} KB</p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="font-medium">Cliquez pour sélectionner un fichier</p>
                  <p className="text-xs text-muted-foreground">Formats : XLSX, XLS</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => setImportFile(e.target.files?.[0] || null)}
            />
            <Button onClick={handleImport} disabled={!importFile || importing} className="w-full">
              {importing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importation...</> : "Lancer l'import"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fiche Agent Dialog */}
      <Dialog open={ficheOpen} onOpenChange={setFicheOpen}>
        <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 border-b pb-4">
              {selectedAgent?.photo_profil_url ? (
                <button 
                  type="button" 
                  onClick={() => setLightboxUrl(selectedAgent.photo_profil_url!)}
                  className="group relative h-12 w-12 sm:h-16 sm:w-16 overflow-hidden rounded-full border-2 border-primary/20 shadow-md shrink-0 transition hover:scale-105"
                >
                  <img src={selectedAgent.photo_profil_url} alt="Profil" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                </button>
              ) : (
                <div className="h-12 w-12 sm:h-16 sm:w-16 flex items-center justify-center rounded-full bg-muted border-2 shadow-sm shrink-0">
                  <User className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-base sm:text-xl truncate">{selectedAgent?.nom_prenom}</span>
                <span className="text-xs sm:text-sm font-mono text-muted-foreground font-normal">Matricule: {selectedAgent?.matricule}</span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="infos">
            <TabsList className="w-full mb-4 h-auto flex">
              <TabsTrigger value="infos" className="flex-1 flex items-center gap-1 text-xs sm:text-sm py-2">
                <User className="h-3 w-3 sm:h-4 sm:w-4" /><span className="hidden xs:inline">Informations</span><span className="xs:hidden">Infos</span>
              </TabsTrigger>
              <TabsTrigger value="affectations" className="flex-1 flex items-center gap-1 text-xs sm:text-sm py-2">
                <ClipboardCheck className="h-3 w-3 sm:h-4 sm:w-4" />Affectations
              </TabsTrigger>
              <TabsTrigger value="historique" className="flex-1 flex items-center gap-1 text-xs sm:text-sm py-2">
                <History className="h-3 w-3 sm:h-4 sm:w-4" /><span className="hidden sm:inline">Historique</span><span className="sm:hidden">Histo.</span>
              </TabsTrigger>
            </TabsList>

            {/* ── Onglet Informations ── */}
            <TabsContent value="infos" className="mt-4">
              <form onSubmit={handleEdit} className="space-y-4">
                {isAdmin && (
                  <div className="space-y-2">
                    <Label>Modifier la photo de profil</Label>
                    <Input name="photo" type="file" accept="image/*" />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Matricule</Label>
                    <Input value={editForm.matricule || ''} disabled className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom & Prénom</Label>
                    <Input
                      value={editForm.nom_prenom || ''}
                      onChange={e => setEditForm(f => ({ ...f, nom_prenom: e.target.value }))}
                      required
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type de contrat</Label>
                    {isAdmin ? (
                      <Select
                        value={editForm.type_contrat || 'journalier'}
                        onValueChange={v => setEditForm(f => ({ ...f, type_contrat: v }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="journalier">Journalier</SelectItem>
                          <SelectItem value="mensuel">Mensuel</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={editForm.type_contrat || ''} disabled className="bg-muted/50" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Phone className="h-3 w-3" />Téléphone</Label>
                    <Input
                      value={editForm.telephone || ''}
                      onChange={e => setEditForm(f => ({ ...f, telephone: e.target.value }))}
                      placeholder="0708001122"
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                {isAdmin && (
                  <Button type="submit" className="w-full" disabled={editSaving}>
                    {editSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement...</> : 'Enregistrer les modifications'}
                  </Button>
                )}

                {!isAdmin && (
                  <p className="text-center text-xs text-muted-foreground">
                    Seul un administrateur peut modifier le profil d'un agent.
                  </p>
                )}
              </form>
            </TabsContent>

            {/* ── Onglet Affectations ── */}
            <TabsContent value="affectations" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Chantiers Assignés</h3>
                  {isAdmin && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nouvelle affectation</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Assigner à un chantier</DialogTitle></DialogHeader>
                        <form onSubmit={handleAddAffectation} className="space-y-4 pt-2">
                          <div className="space-y-2">
                            <Label>Chantier à assigner</Label>
                            <Select name="nouveau_chantier_id" required>
                              <SelectTrigger><SelectValue placeholder="Sélectionnez un chantier" /></SelectTrigger>
                              <SelectContent>
                                {allChantiers.map(c => (
                                  <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Frais de Mission Journaliers (FCFA)</Label>
                            <Input name="nouveau_montant" type="number" defaultValue={selectedAgent?.montant_journalier_frais || 0} required />
                          </div>
                          <Button type="submit" className="w-full" disabled={affectationLoading}>
                            {affectationLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Assignation...</> : 'Assigner au chantier'}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                
                {affectationsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : affectations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg bg-muted/10">Aucune affectation à chantiers multiples définie.</div>
                ) : (
                  <div className="grid gap-3 max-h-[350px] overflow-y-auto pr-1">
                    {affectations.map(aff => (
                      <div key={aff.id} className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3 gap-3">
                        <div className="flex-1">
                          <p className="font-bold text-base text-primary">{aff.chantier}</p>
                          <p className="text-sm font-medium text-muted-foreground">{aff.montant_journalier_frais.toLocaleString('fr-FR')} FCFA / jour</p>
                        </div>
                        {isAdmin && (
                          <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-white hover:bg-destructive h-8 w-8 transition-colors" 
                                  onClick={() => handleDeleteAffectation(aff.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Onglet Historique Paiements ── */}
            <TabsContent value="historique" className="mt-4">
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={exportHistoriquePDF} disabled={paiementsLoading || paiements.length === 0}>
                  <Upload className="h-4 w-4 mr-2" />
                  Exporter Reçu (PDF)
                </Button>
              </div>
              {paiementsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : paiements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                  <Banknote className="h-10 w-10 opacity-30" />
                  <p className="text-sm">Aucun paiement enregistré pour cet agent.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {paiements.map(p => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3 gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">
                          {p.montant.toLocaleString('fr-FR')} <span className="text-muted-foreground font-normal">FCFA</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(p.date_paiement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      {p.photo_decharge_url ? (
                        <button
                          type="button"
                          onClick={() => setLightboxUrl(p.photo_decharge_url)}
                          className="flex-shrink-0 group relative overflow-hidden rounded-md border h-14 w-20 bg-muted hover:opacity-90 transition"
                          title="Voir la décharge signée"
                        >
                          <img
                            src={p.photo_decharge_url}
                            alt="Décharge signée"
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
                            <Eye className="h-5 w-5 text-white" />
                          </div>
                        </button>
                      ) : (
                        <div className="flex-shrink-0 flex flex-col items-center justify-center h-14 w-20 rounded-md border border-dashed text-muted-foreground/40 bg-muted/10">
                          <ImageIcon className="h-5 w-5" />
                          <span className="text-[9px] mt-0.5">Pas de décharge</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Lightbox plein écran */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Décharge signée — plein écran"
            className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher par nom ou matricule..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="w-full sm:w-64">
          <Select value={filterChantier} onValueChange={setFilterChantier}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrer par Chantier/Affaire" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les chantiers</SelectItem>
              {chantiers.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Mobile: card list */}
          <div className="block sm:hidden divide-y">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 active:bg-muted/50 transition-colors"
                onClick={() => openFiche(p)}
              >
                {/* Avatar */}
                {p.photo_profil_url ? (
                  <div
                    className="h-10 w-10 rounded-full overflow-hidden border shadow-sm shrink-0"
                    onClick={(e) => { e.stopPropagation(); setLightboxUrl(p.photo_profil_url!); }}
                  >
                    <img src={p.photo_profil_url} alt="Profil" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border shrink-0">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{p.nom_prenom}</p>
                  <p className="text-xs font-mono text-muted-foreground">{p.matricule}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant={p.type_contrat === 'journalier' ? 'default' : 'secondary'} className="text-[10px] py-0 px-1.5">
                      {p.type_contrat}
                    </Badge>
                    {(p.agent_chantiers && p.agent_chantiers.filter(a => a.actif).length > 0) && (
                      <span className="text-[10px] text-muted-foreground truncate">
                        {p.agent_chantiers.filter(a => a.actif).map(ac => ac.chantier).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openFiche(p)}>
                    {isAdmin ? <Pencil className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: full table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Matricule</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Nom & Prénom</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Contrat</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Affectations (Chantiers & Taux)</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Tél.</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() => openFiche(p)}
                  >
                    <td className="px-4 py-3 font-mono text-xs">{p.matricule}</td>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        {p.photo_profil_url ? (
                          <div 
                            className="h-8 w-8 rounded-full overflow-hidden border shadow-sm shrink-0 hover:scale-110 transition cursor-zoom-in"
                            onClick={(e) => { e.stopPropagation(); setLightboxUrl(p.photo_profil_url!); }}
                          >
                            <img src={p.photo_profil_url} alt="Profil" className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center border shrink-0">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="truncate max-w-[150px]">{p.nom_prenom}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={p.type_contrat === 'journalier' ? 'default' : 'secondary'}>{p.type_contrat}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[250px]">
                        {(p.agent_chantiers && p.agent_chantiers.length > 0) ? (
                          p.agent_chantiers.filter(a => a.actif).map((ac, idx) => (
                            <Badge key={idx} variant="outline" className="bg-muted/30 text-xs py-0">
                              {ac.chantier} : <span className="font-semibold ml-1">{ac.montant_journalier_frais?.toLocaleString('fr-FR')} F</span>
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Aucune affectation</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{p.telephone || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openFiche(p)}>
                          {isAdmin ? <Pencil className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default PersonnelPage;
