import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Banknote, Camera, CheckCircle, Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNotification } from '@/hooks/useNotification';

// Multiplier: T=100%, V=50%, A=50%
const attendanceMultiplier: Record<string, number> = { T: 1, V: 0.5, A: 0.5 };

interface PointageLink {
  id: string;
  date: string;
  type: string;
  montant: number;
}

interface SoldeAgent {
  unique_id: string;
  id: string;
  matricule: string;
  nom_prenom: string;
  chantier: string;
  total_du: number;
  unpaid_pointages: PointageLink[];
}

const PaiementPage = () => {
  const [agents, setAgents] = useState<SoldeAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<SoldeAgent | null>(null);
  const [selectedPointages, setSelectedPointages] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { notify } = useNotification();

  const fetchSoldes = async () => {
    const { data: pointages } = await supabase
      .from('pointages')
      .select('id, date_pointage, attendance_type, chantier, chantier_id, montant_calcule, personnel_id, personnel:personnel_id ( matricule, nom_prenom )')
      .eq('present', true)
      .eq('valide_par_dt', true)
      .filter('paiement_id', 'is', 'null')
      .order('date_pointage', { ascending: true });

    const grouped = new Map<string, SoldeAgent>();

    for (const pt of (pointages || [])) {
      const key = `${pt.personnel_id}_${pt.chantier_id || pt.chantier || 'default'}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          unique_id: key,
          id: pt.personnel_id,
          matricule: (pt.personnel as any)?.matricule || '',
          nom_prenom: (pt.personnel as any)?.nom_prenom || 'Inconnu',
          chantier: pt.chantier || 'Autre',
          total_du: 0,
          unpaid_pointages: []
        });
      }
      
      const amt = pt.montant_calcule || 0;
      const agentGroup = grouped.get(key)!;
      agentGroup.total_du += amt;
      agentGroup.unpaid_pointages.push({
        id: pt.id, date: pt.date_pointage, type: pt.attendance_type, montant: amt
      });
    }

    setAgents(Array.from(grouped.values()));
    setLoading(false);
  };

  useEffect(() => { fetchSoldes(); }, []);
  
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  };

  const uploadPhoto = async (agentId: string, file: File): Promise<{ url: string | null; error: string | null }> => {
    const ext = file.name ? file.name.split('.').pop() || 'jpg' : 'jpg';
    const path = `decharges/${agentId}/${Date.now()}.${ext}`;
    const contentType = file.type || 'image/jpeg';
    
    const { error: uploadError } = await supabase.storage
      .from('decharges')
      .upload(path, file, { upsert: false, contentType: contentType });
      
    if (uploadError) {
      return { url: null, error: uploadError.message };
    }
    
    const { data } = supabase.storage.from('decharges').getPublicUrl(path);
    return { url: data?.publicUrl || null, error: null };
  };

  const totalSelected = selectedAgent 
    ? selectedAgent.unpaid_pointages
        .filter(pt => selectedPointages[pt.id])
        .reduce((sum, pt) => sum + pt.montant, 0)
    : 0;

  const handlePay = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAgent) return;
    
    const idsToPay = Object.keys(selectedPointages).filter(id => selectedPointages[id]);
    if (idsToPay.length === 0) {
      toast({ title: 'Attention', description: 'Veuillez sélectionner au moins un jour à payer.', variant: 'destructive' });
      return;
    }

    setPayLoading(true);
    const fd = new FormData(e.currentTarget);
    const date = fd.get('date') as string;

    let photoUrl: string | null = null;
    if (photoFile) {
      const result = await uploadPhoto(selectedAgent.id, photoFile);
      photoUrl = result.url;
      if (!photoUrl) {
        setPayLoading(false);
        return;
      }
    }

    // 1. Créer le paiement
    const { data: paiement, error: pError } = await supabase.from('paiements').insert({
      personnel_id: selectedAgent.id,
      montant: totalSelected,
      montant_paye: totalSelected,
      date_paiement: date,
      photo_decharge_url: photoUrl,
    }).select('id').single();

    if (pError) {
      toast({ title: 'Erreur Paiement', description: pError.message, variant: 'destructive' });
      setPayLoading(false);
      return;
    }

    // 2. Lier les pointages au paiement (MANDATOIRE)
    const { error: linkError } = await supabase.from('pointages')
      .update({ paiement_id: paiement.id } as any)
      .in('id', idsToPay);
    
    if (linkError) {
      // Si on n'arrive pas à lier, on doit idéalement supprimer le paiement créé pour éviter l'incohérence
      await supabase.from('paiements').delete().eq('id', paiement.id);
      toast({ 
        title: 'Erreur de liaison', 
        description: "Impossible de lier les jours au paiement. Opération annulée.", 
        variant: 'destructive' 
      });
      setPayLoading(false);
      return;
    }

    // 3. Mise à jour optimiste : On retire immédiatement l'agent de la liste locale
    setAgents(prev => prev.filter(a => a.unique_id !== selectedAgent.unique_id));
    
    setPayLoading(false);
    setOpen(false);
    setPhotoFile(null);
    setPhotoPreview(null);
    setSelectedPointages({});
    
    toast({
      title: 'Paiement enregistré',
      description: `${selectedAgent.nom_prenom} — ${totalSelected.toLocaleString('fr-FR')} F (${idsToPay.length} jours payés)`,
    });

    // Notify RH admin
    notify({
      action: 'paiement',
      details: `Paiement de ${totalSelected.toLocaleString('fr-FR')} FCFA effectué pour ${selectedAgent.nom_prenom} (${selectedAgent.matricule}) — ${idsToPay.length} jour(s).`,
      chantier: selectedAgent.chantier,
    });

    // Rafraîchissement réel en arrière-plan
    fetchSoldes();
  };

  if (loading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 bg-warning/10 rounded-xl flex items-center justify-center text-warning border border-warning/20 shadow-sm">
              <Banknote className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Paiement du Personnel</h1>
          </div>
          <p className="text-muted-foreground ml-[52px]">Sélectionnez les jours spécifiques à régler</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map(agent => (
          <Card key={agent.unique_id} className="border-l-4 border-l-[#5C6288] premium-hover overflow-hidden group">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">{agent.nom_prenom}</CardTitle>
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground font-mono">{agent.matricule}</p>
                <Badge variant="outline" className="text-[10px]">{agent.chantier}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Reste à payer</span>
                    <span className="text-xl font-black text-warning leading-none">{agent.total_du.toLocaleString('fr-FR')} F</span>
                  </div>
                  <Badge className="bg-success/10 text-success border-success/20">
                    {agent.unpaid_pointages.length} jrs validés
                  </Badge>
                </div>
              </div>
              
              <Dialog
                open={open && selectedAgent?.unique_id === agent.unique_id}
                onOpenChange={v => {
                  setOpen(v);
                  if (v) {
                    setSelectedAgent(agent);
                    const initial: Record<string, boolean> = {};
                    agent.unpaid_pointages.forEach(pt => initial[pt.id] = true); // Par défaut on coche tout
                    setSelectedPointages(initial);
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button className="w-full shadow-lg transition-all font-bold bg-[#D32F2F] hover:bg-[#B71C1C] pulse-glow">
                    <Banknote className="h-4 w-4 mr-2" />
                    Régler des jours
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Règlement — {agent.nom_prenom}</DialogTitle></DialogHeader>
                  <form onSubmit={handlePay} className="space-y-4 pt-2">
                    
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Sélectionnez les jours à payer</Label>
                      <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/30">
                        {agent.unpaid_pointages.map(pt => {
                          const isSelected = !!selectedPointages[pt.id];
                          return (
                            <button
                              key={pt.id}
                              type="button"
                              onClick={() => setSelectedPointages(prev => ({ ...prev, [pt.id]: !prev[pt.id] }))}
                              className={`
                                flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all
                                ${isSelected 
                                  ? 'bg-primary border-primary text-white shadow-md scale-105' 
                                  : 'bg-background border-muted text-muted-foreground hover:border-primary/50'}
                              `}
                            >
                              <span className="text-[10px] uppercase font-bold">{pt.date.split('-').slice(1).reverse().join('/')}</span>
                              <span className="text-xs font-black">{pt.montant}F</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 flex justify-between items-center">
                      <span className="text-sm font-medium">Total à régler :</span>
                      <span className="text-lg font-black text-primary">{totalSelected.toLocaleString('fr-FR')} FCFA</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold">Date de remise</Label>
                        <Input 
                          name="date" 
                          type="date" 
                          defaultValue={new Date().toISOString().split('T')[0]} 
                          className="h-9 text-xs"
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold flex items-center gap-1">
                          <Camera className="h-3 w-3" />Preuve (Décharge)
                        </Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className={`w-full h-9 border-dashed ${photoFile ? 'bg-success/5 border-success text-success' : ''}`}
                          onClick={() => photoInputRef.current?.click()}
                        >
                          {photoFile ? <CheckCircle className="h-3 w-3 mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                          {photoFile ? 'Photo OK' : 'Prendre photo'}
                        </Button>
                      </div>
                    </div>

                    <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />

                    <Button 
                      type="submit" 
                      className={`
                        w-full font-black py-7 shadow-xl relative overflow-hidden transition-all duration-500
                        ${!payLoading && totalSelected > 0 ? 'bg-[#D32F2F] hover:bg-[#B71C1C] pulse-glow scale-[1.02]' : 'bg-muted'}
                      `} 
                      disabled={payLoading || totalSelected === 0}
                    >
                      {!payLoading && totalSelected > 0 && <div className="absolute inset-0 animate-shimmer pointer-events-none" />}
                      {payLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Validation...</> : `VALIDER LE PAIEMENT (${totalSelected.toLocaleString('fr-FR')} F)`}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>


      {agents.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-success mb-4" />
            <p className="text-lg font-medium">Tous les paiements sont à jour</p>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
};

export default PaiementPage;
