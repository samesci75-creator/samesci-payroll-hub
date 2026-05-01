import { useEffect, useState, useCallback, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ClipboardCheck, Banknote, AlertTriangle, Loader2, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { saveAndShareFile } from '@/lib/exportUtils';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { DashboardSoldes, type SoldeRow } from '@/components/dashboard/DashboardSoldes';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const attendanceMultiplier: Record<string, number> = { T: 1, V: 0.5, A: 0.5 };

interface PersonnelRow {
  id: string;
  matricule: string;
  nom_prenom: string;
  chantier: string;
  montant_journalier_frais: number;
}

interface DailyPointage {
  date: string;
  label: string;
  presents: number;
  valides: number;
}

interface MonthlyPaiement {
  date: string;
  label: string;
  montant: number;
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [selectedChantier, setSelectedChantier] = useState('all');

  const [personnelList, setPersonnelList] = useState<PersonnelRow[]>([]);
  const [personnelCount, setPersonnelCount] = useState(0);
  const [pointagesTodayCount, setPointagesTodayCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [paiementsMoisTotal, setPaiementsMoisTotal] = useState(0);
  // Store validated pointages with attendance_type for proper multiplier calculation
  const [validatedPointages, setValidatedPointages] = useState<{ personnel_id: string; attendance_type: string }[]>([]);
  const [paidMap, setPaidMap] = useState<Map<string, number>>(new Map());
  const [recentPointages, setRecentPointages] = useState<any[]>([]);
  const [recentPaiements, setRecentPaiements] = useState<any[]>([]);
  const [personnelChantierMap, setPersonnelChantierMap] = useState<Map<string, string>>(new Map());

  const fetchData = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.slice(0, 7) + '-01';
    const thirtyDaysAgo = subDays(new Date(), 29).toISOString().split('T')[0];

    const [personnelRes, pointagesTodayRes, pendingRes, personnelListRes, allPointagesRes, allPaiementsRes, paiementsMoisRes, recentPointagesRes, recentPaiementsRes] = await Promise.all([
      supabase.from('personnel').select('id', { count: 'exact', head: true }),
      supabase.from('pointages').select('id', { count: 'exact', head: true }).eq('date_pointage', today).eq('present', true),
      supabase.from('pointages').select('id', { count: 'exact', head: true }).eq('present', true).eq('valide_par_dt', false),
      supabase.from('agent_chantiers').select('personnel_id, chantier, montant_journalier_frais, personnel(matricule, nom_prenom)').eq('actif', true),
      supabase.from('pointages').select('personnel_id, attendance_type, chantier, montant_calcule').eq('present', true).eq('valide_par_dt', true),
      supabase.from('paiements').select('personnel_id, montant, montant_paye'),
      supabase.from('paiements').select('montant, montant_paye').gte('date_paiement', monthStart),
      supabase.from('pointages').select('date_pointage, present, valide_par_dt, personnel_id, attendance_type').gte('date_pointage', thirtyDaysAgo).eq('present', true),
      supabase.from('paiements').select('date_paiement, montant, montant_paye, personnel_id').gte('date_paiement', thirtyDaysAgo),
    ]);

    const pList = (personnelListRes.data || []).map((ac: any) => ({
      id: ac.personnel_id,
      matricule: ac.personnel?.matricule || '',
      nom_prenom: ac.personnel?.nom_prenom || 'Inconnu',
      chantier: ac.chantier,
      montant_journalier_frais: ac.montant_journalier_frais
    }));
    setPersonnelList(pList);
    setPersonnelCount(personnelRes.count || 0);
    setPointagesTodayCount(pointagesTodayRes.count || 0);
    setPendingCount(pendingRes.count || 0);

    const chantierMap = new Map<string, string>();
    for (const p of pList) chantierMap.set(p.id, p.chantier);
    setPersonnelChantierMap(chantierMap);

    setValidatedPointages((allPointagesRes.data || []).map((p: any) => ({
      personnel_id: p.personnel_id,
      attendance_type: p.attendance_type || 'T',
      chantier: p.chantier,
      montant_calcule: p.montant_calcule || 0
    })));

    const pmMap = new Map<string, number>();
    for (const p of allPaiementsRes.data || []) {
      const val = Number(p.montant) || Number(p.montant_paye) || 0;
      pmMap.set(p.personnel_id, (pmMap.get(p.personnel_id) || 0) + val);
    }
    setPaidMap(pmMap);

    setPaiementsMoisTotal((paiementsMoisRes.data || []).reduce((s: number, r: any) => s + (Number(r.montant) || Number(r.montant_paye) || 0), 0));
    setRecentPointages(recentPointagesRes.data || []);
    setRecentPaiements(recentPaiementsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pointages' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paiements' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personnel' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const chantiers = useMemo(() => {
    const set = new Set(personnelList.map(p => p.chantier).filter(Boolean));
    return Array.from(set).sort();
  }, [personnelList]);

  const filteredPersonnelIds = useMemo(() => {
    if (selectedChantier === 'all') return null;
    return new Set(personnelList.filter(p => p.chantier === selectedChantier).map(p => p.id));
  }, [selectedChantier, personnelList]);

  const isIncluded = useCallback((personnelId: string) => {
    return filteredPersonnelIds === null || filteredPersonnelIds.has(personnelId);
  }, [filteredPersonnelIds]);

  // Computed soldes with attendance multipliers
  const soldes = useMemo(() => {
    const duMap = new Map<string, number>();
    for (const vp of validatedPointages as any[]) {
      if (!isIncluded(vp.personnel_id)) continue;
      duMap.set(vp.personnel_id, (duMap.get(vp.personnel_id) || 0) + (vp.montant_calcule || 0));
    }

    const rows: SoldeRow[] = [];
    const processedIds = new Set<string>();
    for (const p of personnelList) {
      if (!isIncluded(p.id)) continue;
      if (processedIds.has(p.id)) continue;
      processedIds.add(p.id);

      const totalDu = duMap.get(p.id) || 0;
      const dejaPaye = paidMap.get(p.id) || 0;
      const reste = totalDu - dejaPaye;
      if (totalDu > 0 || dejaPaye > 0) {
        rows.push({
          id: p.id, matricule: p.matricule, nom_prenom: p.nom_prenom,
          chantier: p.chantier, total_du: totalDu, deja_paye: dejaPaye,
          reste_a_payer: Math.max(0, reste),
        });
      }
    }
    return rows;
  }, [personnelList, validatedPointages, paidMap, isIncluded]);

  const totalRestant = useMemo(() => soldes.reduce((s, r) => s + r.reste_a_payer, 0), [soldes]);

  const dailyPointages = useMemo(() => {
    const byDay = new Map<string, { presents: number; valides: number }>();
    for (const p of recentPointages) {
      if (!isIncluded(p.personnel_id)) continue;
      const entry = byDay.get(p.date_pointage) || { presents: 0, valides: 0 };
      entry.presents++;
      if (p.valide_par_dt) entry.valides++;
      byDay.set(p.date_pointage, entry);
    }
    const data: DailyPointage[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const key = format(d, 'yyyy-MM-dd');
      const label = format(d, 'dd MMM', { locale: fr });
      const entry = byDay.get(key) || { presents: 0, valides: 0 };
      data.push({ date: key, label, presents: entry.presents, valides: entry.valides });
    }
    return data;
  }, [recentPointages, isIncluded]);

  const monthlyPaiements = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const p of recentPaiements) {
      if (!isIncluded(p.personnel_id)) continue;
      const val = Number(p.montant) || Number(p.montant_paye) || 0;
      // Normalisation de la date (pour gérer les timestamps comme les dates simples)
      const dayKey = p.date_paiement ? p.date_paiement.split('T')[0] : '';
      if (dayKey) {
        byDay.set(dayKey, (byDay.get(dayKey) || 0) + val);
      }
    }
    const data: MonthlyPaiement[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const key = format(d, 'yyyy-MM-dd');
      const label = format(d, 'dd MMM', { locale: fr });
      data.push({ date: key, label, montant: byDay.get(key) || 0 });
    }
    return data;
  }, [recentPaiements, isIncluded]);

  const filteredPersonnelCount = useMemo(() => {
    if (selectedChantier === 'all') return personnelCount;
    return personnelList.filter(p => p.chantier === selectedChantier).length;
  }, [selectedChantier, personnelCount, personnelList]);

  const filteredPointagesToday = useMemo(() => {
    if (selectedChantier === 'all') return pointagesTodayCount;
    const today = new Date().toISOString().split('T')[0];
    return recentPointages.filter(p => p.date_pointage === today && isIncluded(p.personnel_id)).length;
  }, [selectedChantier, pointagesTodayCount, recentPointages, isIncluded]);

  const filteredPending = useMemo(() => {
    if (selectedChantier === 'all') return pendingCount;
    return recentPointages.filter(p => !p.valide_par_dt && isIncluded(p.personnel_id)).length;
  }, [selectedChantier, pendingCount, recentPointages, isIncluded]);

  const filteredPaiementsMois = useMemo(() => {
    if (selectedChantier === 'all') return paiementsMoisTotal;
    const monthStart = new Date().toISOString().slice(0, 7) + '-01';
    return recentPaiements
      .filter(p => p.date_paiement >= monthStart && isIncluded(p.personnel_id))
      .reduce((s, p) => s + (Number(p.montant) || Number(p.montant_paye) || 0), 0);
  }, [selectedChantier, paiementsMoisTotal, recentPaiements, isIncluded]);

  // Helper: format number with dot separator (jsPDF ASCII safe)
  const fmtNum = (n: number) =>
    Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Helper: strip diacritics so jsPDF default font renders correctly
  const ascii = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u2013/g, '-').replace(/[^\x00-\x7F]/g, '?');

  const handleExportPDF = useCallback(() => {
    const doc = new jsPDF();
    const chantierLabel = selectedChantier === 'all' ? 'Tous les chantiers' : selectedChantier;
    const dateStr = format(new Date(), 'dd/MM/yyyy HH:mm');

    doc.setFontSize(18);
    doc.text(ascii('SAMES CI - Tableau de bord'), 14, 20);
    doc.setFontSize(10);
    doc.text(ascii(`Chantier : ${chantierLabel}  |  Genere le ${dateStr}`), 14, 28);
    doc.setFontSize(12);
    doc.text('Resume', 14, 38);
    doc.setFontSize(10);
    doc.text(`Personnel : ${filteredPersonnelCount}`, 14, 46);
    doc.text(`Pointages du jour : ${filteredPointagesToday}`, 14, 52);
    doc.text(`Paiements du mois : ${fmtNum(filteredPaiementsMois)}FCFA`, 14, 58);
    doc.text(`Total Net a Payer : ${fmtNum(totalRestant)}FCFA`, 14, 64);
    doc.text(`En attente validation : ${filteredPending}`, 14, 70);

    if (soldes.length > 0) {
      doc.setFontSize(12);
      doc.text('Soldes du personnel', 14, 82);
      autoTable(doc, {
        startY: 86,
        head: [['Matricule', ascii('Nom & Prenom'), 'Chantier', ascii('Total Du'), ascii('Deja Paye'), ascii('Reste a Payer')]],
        body: soldes.map(s => [
          s.matricule,
          ascii(s.nom_prenom),
          ascii(s.chantier),
          `${fmtNum(s.total_du)}F`,
          `${fmtNum(s.deja_paye)}F`,
          `${fmtNum(s.reste_a_payer)}F`,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [35, 95, 50] },
      });
    }

    const fileName = `dashboard-sames-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    const blob = doc.output('blob');
    saveAndShareFile(blob, fileName);
  }, [selectedChantier, filteredPersonnelCount, filteredPointagesToday, filteredPaiementsMois, totalRestant, filteredPending, soldes]);

  const handleExportExcel = useCallback(() => {
    const chantierLabel = selectedChantier === 'all' ? 'Tous les chantiers' : selectedChantier;
    const dateStr = format(new Date(), 'dd/MM/yyyy HH:mm');

    // Sheet 1: Résumé
    const resumeData = [
      ['SAMES CI - Tableau de bord'],
      [`Chantier : ${chantierLabel}  |  Généré le ${dateStr}`],
      [],
      ['Indicateur', 'Valeur'],
      ['Personnel total', filteredPersonnelCount],
      ['Pointages du jour', filteredPointagesToday],
      ['Paiements du mois (FCFA)', filteredPaiementsMois],
      ['Total Net à Payer (FCFA)', totalRestant],
      ['En attente validation', filteredPending],
    ];

    // Sheet 2: Soldes du personnel
    const soldesData = [
      ['Matricule', 'Nom & Prénom', 'Chantier', 'Total Dû (FCFA)', 'Déjà Payé (FCFA)', 'Reste à Payer (FCFA)'],
      ...soldes.map(s => [
        s.matricule,
        s.nom_prenom,
        s.chantier,
        s.total_du,
        s.deja_paye,
        s.reste_a_payer,
      ]),
    ];

    const wb = XLSX.utils.book_new();
    const wsResume = XLSX.utils.aoa_to_sheet(resumeData);
    wsResume['!cols'] = [{ wch: 35 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, wsResume, 'Résumé');

    const wsSoldes = XLSX.utils.aoa_to_sheet(soldesData);
    wsSoldes['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSoldes, 'Soldes Personnel');

    const fileName = `dashboard-sames-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAndShareFile(blob, fileName);
  }, [selectedChantier, filteredPersonnelCount, filteredPointagesToday, filteredPaiementsMois, totalRestant, filteredPending, soldes]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </AppLayout>
    );
  }

  const statCards = [
    { label: 'Personnel total', value: filteredPersonnelCount, icon: Users, color: 'bg-primary/10 text-primary' },
    { label: 'Pointages du jour', value: filteredPointagesToday, icon: ClipboardCheck, color: 'bg-success/10 text-success' },
    { label: 'Paiements du mois', value: filteredPaiementsMois.toLocaleString('fr-FR') + ' FCFA', icon: TrendingUp, color: 'bg-accent/10 text-accent-foreground' },
    { label: 'Total Net à Payer', value: totalRestant.toLocaleString('fr-FR') + ' FCFA', icon: Banknote, color: 'bg-warning/10 text-warning' },
    { label: 'En attente validation', value: filteredPending, icon: AlertTriangle, color: 'bg-destructive/10 text-destructive' },
  ];

  return (
    <AppLayout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground">Vue d'ensemble de l'activité SAMES CI</p>
        </div>
        <DashboardFilters
          chantiers={chantiers}
          selectedChantier={selectedChantier}
          onChantierChange={setSelectedChantier}
          onExportPDF={handleExportPDF}
          onExportExcel={handleExportExcel}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <DashboardCharts dailyPointages={dailyPointages} monthlyPaiements={monthlyPaiements} />
      <DashboardSoldes soldes={soldes} />
    </AppLayout>
  );
};

export default Dashboard;
