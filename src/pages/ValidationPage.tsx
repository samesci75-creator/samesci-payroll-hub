import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldCheck, CheckCheck, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNotification } from '@/hooks/useNotification';

const attendanceMultiplier: Record<string, number> = { T: 1, V: 0.5, A: 0.5 };
const attendanceColors: Record<string, string> = {
  T: 'bg-blue-500 text-white',
  V: 'bg-violet-500 text-white',
  A: 'bg-red-500 text-white',
};

interface PendingPointage {
  id: string;
  personnel_id: string;
  date_pointage: string;
  attendance_type: string;
  matricule: string;
  nom_prenom: string;
  chantier: string;
}

const ValidationPage = () => {
  const [pending, setPending] = useState<PendingPointage[]>([]);
  const [chantiers, setChantiers] = useState<string[]>([]);
  const [selectedChantier, setSelectedChantier] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [totalNet, setTotalNet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const { toast } = useToast();
  const { notify } = useNotification();

  const fetchData = async () => {
    const { data: pointages } = await supabase
      .from('pointages')
      .select('id, personnel_id, chantier, chantier_id, date_pointage, attendance_type')
      .eq('present', true)
      .eq('valide_par_dt', false);

    const pIds = [...new Set((pointages || []).map((p: any) => p.personnel_id))];
    let personnelMap: Record<string, { matricule: string; nom_prenom: string; chantier: string }> = {};

    if (pIds.length > 0) {
      const { data: pers } = await supabase.from('personnel').select('id, matricule, nom_prenom, chantier').in('id', pIds);
      (pers || []).forEach((p: any) => { 
        personnelMap[p.id] = { matricule: p.matricule, nom_prenom: p.nom_prenom, chantier: p.chantier || 'Autre' }; 
      });
    }

    const { data: allAgentChantiers } = await supabase.from('agent_chantiers').select('personnel_id, chantier, chantier_id, montant_journalier_frais');

    const rows: (PendingPointage & { montant_propose: number })[] = (pointages || []).map((p: any) => {
      const ac = (allAgentChantiers || []).find((a: any) => a.personnel_id === p.personnel_id && (a.chantier_id === p.chantier_id || a.chantier === p.chantier));
      const rate = ac ? ac.montant_journalier_frais : 0;
      const mult = attendanceMultiplier[p.attendance_type] || 1;
      
      return {
        id: p.id,
        personnel_id: p.personnel_id,
        date_pointage: p.date_pointage,
        attendance_type: p.attendance_type || 'T',
        matricule: personnelMap[p.personnel_id]?.matricule || '',
        nom_prenom: personnelMap[p.personnel_id]?.nom_prenom || 'Inconnu',
        chantier: p.chantier || personnelMap[p.personnel_id]?.chantier || 'Autre',
        montant_propose: rate * mult
      };
    });

    setPending(rows);
    setChantiers([...new Set(rows.map(r => r.chantier))]);

    const { data: validPts } = await supabase.from('pointages')
      .select('montant_calcule')
      .eq('present', true)
      .eq('valide_par_dt', true)
      .is('paiement_id', null);

    let total = 0;
    for (const pt of (validPts || [])) {
      total += pt.montant_calcule || 0;
    }
    setTotalNet(total);
    setTotalNet(total);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredPending = pending.filter(p => selectedChantier === 'all' || p.chantier === selectedChantier);

  const handleValidateSelection = async () => {
    const idsToValidate = Object.keys(selectedIds).filter(id => selectedIds[id]);
    if (idsToValidate.length === 0) {
      toast({ title: 'Attention', description: 'Veuillez sélectionner au moins un pointage.', variant: 'destructive' });
      return;
    }
    
    setValidating(true);
    let errorMsg = null;
    
    // Process validations safely
    await Promise.all(idsToValidate.map(async id => {
      const p = pending.find((r: any) => r.id === id) as any;
      const val = p?.montant_propose || 0;
      const { error } = await supabase.from('pointages').update({ valide_par_dt: true, montant_calcule: val }).eq('id', id);
      if (error) errorMsg = error.message;
    }));
    
    setValidating(false);

    if (errorMsg) {
      toast({ title: 'Erreur', description: errorMsg || 'Un problème est survenu.', variant: 'destructive' });
    } else {
      toast({ title: 'Validé', description: `${idsToValidate.length} pointage(s) ont été validés.` });
      // Notify RH admin
      const chantiersValidated = [...new Set(idsToValidate.map(id => pending.find(p => p.id === id)?.chantier).filter(Boolean))].join(', ');
      notify({
        action: 'validation',
        details: `${idsToValidate.length} pointage(s) validé(s) par le Directeur des Travaux.`,
        chantier: chantiersValidated || undefined,
      });
      setSelectedIds({});
      fetchData();
    }
  };

  const handleValidateAllFiltered = async () => {
    const ids = filteredPending.map(p => p.id);
    if (ids.length === 0) return;
    
    setValidating(true);
    let errorMsg = null;
    
    // Process validations safely
    await Promise.all(ids.map(async id => {
      const p = pending.find((r: any) => r.id === id) as any;
      const val = p?.montant_propose || 0;
      const { error } = await supabase.from('pointages').update({ valide_par_dt: true, montant_calcule: val }).eq('id', id);
      if (error) errorMsg = error.message;
    }));
    
    setValidating(false);

    if (errorMsg) {
      toast({ title: 'Erreur', description: errorMsg || 'Un problème est survenu.', variant: 'destructive' });
    } else {
      const label = selectedChantier === 'all' ? 'tous les chantiers' : selectedChantier;
      toast({ title: 'Tout validé', description: `Tous les pointages de ${label} ont été validés.` });
      // Notify RH admin
      notify({
        action: 'validation',
        details: `Tous les pointages (${ids.length}) de ${label} ont été validés.`,
        chantier: selectedChantier === 'all' ? undefined : selectedChantier,
      });
      fetchData();
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;
  }

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 bg-white rounded-xl shadow-inner p-1">
              <img src="/logo.png" alt="SAMES Logo" className="h-full w-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Validation des Pointages</h1>
          </div>
          <p className="text-muted-foreground ml-[52px]">Espace Directeur des Travaux</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground ml-[52px]">
            <span><strong className="text-blue-500">T</strong> = Travail (100%)</span>
            <span><strong className="text-violet-500">V</strong> = Voyage (50%)</span>
            <span><strong className="text-red-500">A</strong> = Arrêt (50%)</span>
          </div>
        </div>

        <div className="flex gap-4">
          <Card className="min-w-[180px]">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <ShieldCheck className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">À Payer (Validé)</p>
                <p className="text-lg font-bold">{totalNet.toLocaleString('fr-FR')} F</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              Pointages en attente ({pending.length})
              {selectedCount > 0 && <Badge variant="secondary">{selectedCount} sélectionnés</Badge>}
            </CardTitle>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={handleValidateSelection} 
                variant="default" 
                size="sm" 
                disabled={selectedCount === 0 || validating} 
                className={`
                  relative overflow-hidden transition-all duration-500 font-bold px-6
                  ${selectedCount > 0 
                    ? 'bg-[#D32F2F] hover:bg-[#B71C1C] text-white shadow-[0_0_20px_rgba(211,47,47,0.4)] scale-105 active:scale-95 pulse-glow' 
                    : 'bg-muted text-muted-foreground'}
                `}
              >
                {selectedCount > 0 && <div className="absolute inset-0 animate-shimmer pointer-events-none" />}
                <CheckCheck className={`h-4 w-4 mr-2 ${selectedCount > 0 ? 'animate-bounce' : ''}`} />
                Valider la sélection ({selectedCount})
              </Button>
              <Button 
                onClick={handleValidateAllFiltered} 
                variant="outline" 
                size="sm" 
                disabled={filteredPending.length === 0 || validating}
                className="border-[#5C6288] text-[#5C6288] hover:bg-[#5C6288] hover:text-white premium-hover transition-all font-semibold"
              >
                Tout valider ({filteredPending.length})
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-lg">
            <span className="text-sm font-medium ml-2">Filtrer par Chantier :</span>
            <select 
              value={selectedChantier} 
              onChange={(e) => setSelectedChantier(e.target.value)}
              className="bg-transparent border rounded p-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Tous les chantiers</option>
              {chantiers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPending.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Aucun pointage en attente pour ce filtre.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 px-2">
                      <Checkbox 
                        checked={filteredPending.length > 0 && filteredPending.every(p => selectedIds[p.id])}
                        onCheckedChange={(checked) => {
                          const newSelection = { ...selectedIds };
                          filteredPending.forEach(p => newSelection[p.id] = !!checked);
                          setSelectedIds(newSelection);
                        }}
                      />
                    </th>
                    <th className="pb-3 font-medium">Agent</th>
                    <th className="pb-3 font-medium">Chantier</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPending.map(p => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2">
                        <Checkbox checked={!!selectedIds[p.id]} onCheckedChange={() => toggleSelection(p.id)} />
                      </td>
                      <td className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{p.nom_prenom}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{p.matricule}</span>
                        </div>
                      </td>
                      <td className="py-3 text-xs">{p.chantier}</td>
                      <td className="py-3 text-muted-foreground text-xs">{p.date_pointage}</td>
                      <td className="py-3">
                        <Badge className={`${attendanceColors[p.attendance_type] || 'bg-muted'} px-1.5 py-0 text-[10px]`}>
                          {p.attendance_type}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge variant="outline" className="text-warning border-warning text-[10px]">En attente</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default ValidationPage;
