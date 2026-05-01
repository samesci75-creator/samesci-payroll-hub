import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Save, Loader2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/hooks/useNotification';

type AttendanceType = 'T' | 'V' | 'A' | '';

interface Agent {
  id: string;
  matricule: string;
  nom_prenom: string;
  chantier: string;
}

const attendanceConfig: Record<string, { label: string; color: string; bgClass: string }> = {
  T: { label: 'Travail (100%)', color: 'bg-blue-500', bgClass: 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30' },
  V: { label: 'Voyage (50%)', color: 'bg-violet-500', bgClass: 'ring-2 ring-violet-500 bg-violet-50 dark:bg-violet-950/30' },
  A: { label: 'Arrêt (50%)', color: 'bg-red-500', bgClass: 'ring-2 ring-red-500 bg-red-50 dark:bg-red-950/30' },
};

const PointagePage = () => {
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [chantierId, setChantierId] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceType>>({});
  const [validated, setValidated] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const { user } = useAuth();
  const { notify } = useNotification();
  
  // Date calculation
  const todayRaw = new Date();
  const todayISO = todayRaw.toISOString().split('T')[0];
  const minDateRaw = new Date();
  minDateRaw.setDate(todayRaw.getDate() - 2);
  const minDateISO = minDateRaw.toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(todayISO);
  const { toast } = useToast();

  const formattedSelectedDate = new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.from('chantiers').select('id, nom').eq('statut', 'En cours').order('nom');
      const allChantiers = data || [];
      
      if (user?.role === 'chef_chantier' && user?.chantiers_autorises && user.chantiers_autorises.length > 0) {
        let matched = [];
        if (user.chantiers_autorises.includes('*') || user.chantiers_autorises.includes('TOUS')) {
          matched = allChantiers;
        } else {
          matched = allChantiers.filter(c => user.chantiers_autorises.includes(c.nom));
        }
        setChantiers(matched);
        if (matched.length > 0) setChantierId(matched[0].id);
        else setChantiers([]);
      } else if (user?.role === 'chef_chantier' && (!user?.chantiers_autorises || user.chantiers_autorises.length === 0)) {
        setChantiers([]);
      } else {
        setChantiers(allChantiers);
        if (allChantiers.length > 0) setChantierId(allChantiers[0].id);
      }
      setLoading(false);
    };
    init();
  }, [user?.role, user?.chantier_assigne]);

  useEffect(() => {
    if (!chantierId) return;
    const fetchAgents = async () => {
      const { data } = await supabase
        .from('agent_chantiers')
        .select(`
          personnel_id,
          chantier_id,
          personnel:personnel_id ( id, matricule, nom_prenom )
        `)
        .eq('chantier_id', chantierId)
        .eq('actif', true);
        
      const agentList = (data || []).map((row: any) => ({
        id: row.personnel_id,
        matricule: row.personnel?.matricule || '',
        nom_prenom: row.personnel?.nom_prenom || 'Inconnu',
        chantier: row.chantier
      }));
      setAgents(agentList);

      const { data: existing } = await supabase
        .from('pointages')
        .select('personnel_id, present, attendance_type, valide_par_dt')
        .eq('date_pointage', selectedDate)
        .eq('chantier_id', chantierId)
        .in('personnel_id', agentList.map(a => a.id));

      const attMap: Record<string, AttendanceType> = {};
      const valMap: Record<string, boolean> = {};
      (existing || []).forEach((e: any) => {
        valMap[e.personnel_id] = !!e.valide_par_dt;
        if (e.present) {
          attMap[e.personnel_id] = (e.attendance_type as AttendanceType) || 'T';
        }
      });
      setAttendance(attMap);
      setValidated(valMap);
    };
    fetchAgents();
  }, [chantierId, selectedDate]);

  const setAgentAttendance = (id: string, type: AttendanceType) => {
    if (validated[id]) {
      toast({ title: 'Pointage verrouillé', description: 'Ce pointage a déjà été validé et ne peut plus être modifié.', variant: 'destructive' });
      return;
    }
    
    setAttendance(prev => {
      if (type === '' || (prev[id] === type)) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: type };
    });
  };

  const presentCount = Object.keys(attendance).length;

  const handleSave = async () => {
    setSaving(true);
    const rows = agents.map(a => ({
      personnel_id: a.id,
      date_pointage: selectedDate,
      chantier_id: chantierId,
      chantier: chantiers.find(c => c.id === chantierId)?.nom || '',
      present: !!attendance[a.id],
      attendance_type: attendance[a.id] || 'T',
    }));

    const { error } = await supabase.from('pointages').upsert(rows, { onConflict: 'personnel_id,date_pointage,chantier_id' });

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      const chantierName = chantiers.find(c => c.id === chantierId)?.nom || '';
      toast({ title: 'Pointage enregistré', description: `${presentCount} agent(s) pointé(s).` });
      // Notify RH admin (async, non-blocking)
      notify({
        action: 'pointage',
        details: `${presentCount} agent(s) pointé(s) pour la date du ${selectedDate}.`,
        chantier: chantierName,
      });
    }
    setSaving(false);
  };

  if (loading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pointage Journalier</h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2">
          <div className="flex items-center gap-2 text-muted-foreground w-full sm:w-auto">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span className="capitalize hidden sm:inline">{formattedSelectedDate}</span>
            <input
              type="date"
              value={selectedDate}
              min={minDateISO}
              max={todayISO}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex h-9 w-full sm:w-[150px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-3">
        {Object.entries(attendanceConfig).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            <span className={`inline-block h-4 w-4 rounded ${cfg.color}`} />
            <span className="font-medium">{key}</span>
            <span className="text-muted-foreground">— {cfg.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-block h-4 w-4 rounded bg-muted border" />
          <span className="text-muted-foreground">Absent</span>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium">Chantier / Affaire</label>
          <Select value={chantierId} onValueChange={v => { setChantierId(v); setAttendance({}); }} disabled={user?.role === 'chef_chantier'}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {chantiers.map(c => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Badge variant="outline" className="h-9 px-4 text-sm">
          {presentCount} / {agents.length} pointé(s)
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map(agent => {
          const att = attendance[agent.id];
          const cfg = att ? attendanceConfig[att] : null;
          return (
            <Card
              key={agent.id}
              className={`transition-all ${cfg ? cfg.bgClass : 'hover:shadow-md'}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate flex items-center gap-2">
                      {agent.nom_prenom}
                      {validated[agent.id] && <span title="Validé (Verrouillé)"><Lock className="h-3 w-3 text-muted-foreground" /></span>}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">{agent.matricule}</p>
                  </div>
                  {cfg && (
                    <Badge className={`${cfg.color} text-white`}>{att}</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  {(['T', 'V', 'A'] as AttendanceType[]).map(type => {
                    const c = attendanceConfig[type];
                    const isActive = att === type;
                    return (
                      <Button
                        key={type}
                        size="sm"
                        variant={isActive ? 'default' : 'outline'}
                        className={`transition-colors ${isActive ? `${c.color} text-white hover:opacity-90 border-0` : ''}`}
                        onClick={() => setAgentAttendance(agent.id, type)}
                        disabled={validated[agent.id]}
                      >
                        {type}
                      </Button>
                    );
                  })}
                  <Button
                    size="sm"
                    variant={!att ? 'secondary' : 'ghost'}
                    onClick={() => setAgentAttendance(agent.id, '')}
                    disabled={validated[agent.id]}
                  >
                    Abs
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={handleSave} size="lg" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer le pointage
        </Button>
      </div>
    </AppLayout>
  );
};

export default PointagePage;
