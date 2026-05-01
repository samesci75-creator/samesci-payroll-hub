import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Pencil, Trash2, Loader2, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Chantier {
  id: string;
  nom: string;
  lieu: string | null;
  description: string | null;
  statut: string;
}

const ChantiersPage = () => {
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [editForm, setEditForm] = useState<Partial<Chantier>>({});
  const [saving, setSaving] = useState(false);

  const fetchChantiers = async () => {
    const { data, error } = await supabase.from('chantiers').select('*').order('created_at', { ascending: false });
    if (error) console.error(error);
    setChantiers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchChantiers(); }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      nom: fd.get('nom') as string,
      lieu: fd.get('lieu') as string,
      description: fd.get('description') as string,
      statut: fd.get('statut') as string || 'En cours'
    };

    if (editForm.id) {
      const { error } = await supabase.from('chantiers').update(payload).eq('id', editForm.id);
      if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      else toast({ title: 'Chantier mis à jour' });
    } else {
      const { error } = await supabase.from('chantiers').insert(payload);
      if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      else toast({ title: 'Nouveau chantier créé' });
    }

    setSaving(false);
    setOpen(false);
    fetchChantiers();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer ce chantier supprimera également toutes ses liaisons. Continuer ?")) return;
    const { error } = await supabase.from('chantiers').delete().eq('id', id);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Chantier supprimé' });
      fetchChantiers();
    }
  };

  const filtered = chantiers.filter(c => c.nom.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6 text-primary" /> Gestion des Chantiers</h1>
          <p className="text-muted-foreground">Administrer la liste des chantiers et leurs statuts.</p>
        </div>
        
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditForm({}); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nouveau Chantier</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editForm.id ? 'Modifier Chantier' : 'Créer un nouveau Chantier'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nom du chantier *</Label>
                <Input name="nom" defaultValue={editForm.nom || ''} required placeholder="Ex: Chantier Plateau" />
              </div>
              <div className="space-y-2">
                <Label>Lieu / Ville</Label>
                <Input name="lieu" defaultValue={editForm.lieu || ''} placeholder="Ex: Abidjan" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input name="description" defaultValue={editForm.description || ''} placeholder="Brève description..." />
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <select name="statut" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" defaultValue={editForm.statut || 'En cours'}>
                  <option value="En cours">En cours</option>
                  <option value="Terminé">Terminé</option>
                  <option value="En pause">En pause</option>
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Enregistrement...</> : 'Enregistrer'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher par nom..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg bg-card">Aucun chantier trouvé.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(c => (
            <Card key={c.id} className="relative overflow-hidden group premium-hover">
              <div className={`absolute top-0 left-0 w-1 h-full ${c.statut === 'En cours' ? 'bg-success' : c.statut === 'Terminé' ? 'bg-muted-foreground' : 'bg-warning'}`}></div>
              <CardContent className="p-5 pl-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg truncate pr-2" title={c.nom}>{c.nom}</h3>
                  <Badge variant={c.statut === 'En cours' ? 'default' : 'outline'} className={c.statut === 'En cours' ? 'bg-success/20 text-success border-0' : ''}>
                    {c.statut}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4 h-10 line-clamp-2">{c.description || 'Acune description.'}</p>
                <div className="text-sm font-medium mb-4">{c.lieu || 'Lieu non spécifié'}</div>
                
                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditForm(c); setOpen(true); }}>
                    <Pencil className="h-4 w-4 mr-2" /> Modifier
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive w-9 h-9" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default ChantiersPage;
