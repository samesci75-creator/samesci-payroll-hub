import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, UserCog, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import type { UserRole } from '@/contexts/AuthContext';

const roleLabelsMap: Record<UserRole, string> = {
  admin: 'Admin RH',
  chef_chantier: 'Chef de Chantier',
  directeur: 'Directeur des Travaux',
  caisse: 'Caisse',
  en_attente: 'En attente',
};

const roleBadgeVariant: Record<UserRole, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  admin: 'destructive',
  directeur: 'default',
  chef_chantier: 'secondary',
  caisse: 'outline',
  en_attente: 'secondary',
};

interface UserWithRole {
  id: string;
  nom: string;
  email: string;
  role: UserRole | null;
  roleId: string | null;
  chantier_assigne: string | null;
}

const UsersPage = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<UserWithRole | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
    const { data: roles, error: rErr } = await supabase.from('user_roles').select('*');

    if (pErr || rErr) {
      toast({ title: 'Erreur', description: 'Impossible de charger les utilisateurs.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const roleMap = new Map((roles || []).map(r => [r.user_id, r]));
    const merged: UserWithRole[] = (profiles || []).map(p => {
      const r = roleMap.get(p.id);
      return { 
        id: p.id, 
        nom: p.nom, 
        email: p.email, 
        role: (r?.role as UserRole) || null, 
        roleId: r?.id || null,
        chantier_assigne: r?.chantier_assigne || null
      };
    });
    merged.sort((a, b) => a.nom.localeCompare(b.nom));
    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setSaving(userId);
    const user = users.find(u => u.id === userId);
    try {
      if (user?.roleId) {
        const { error } = await supabase.from('user_roles').update({ role: newRole }).eq('id', user.roleId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: newRole });
        if (error) throw error;
      }
      toast({ title: 'Rôle mis à jour', description: `${user?.nom || 'Utilisateur'} → ${roleLabelsMap[newRole]}` });
      await fetchUsers();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const handleChantierChange = async (userId: string, newChantier: string) => {
    setSaving(userId);
    const user = users.find(u => u.id === userId);
    try {
      if (user?.roleId) {
        const { error } = await supabase.from('user_roles').update({ chantier_assigne: newChantier }).eq('id', user.roleId);
        if (error) throw error;
        toast({ title: 'Chantier assigné', description: `Assignation mise à jour pour ${user.nom}` });
        await fetchUsers();
      }
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', { body: { userId: deleting.id } });
      
      if (error) {
        const errorBody = await error.response?.json().catch(() => null);
        throw new Error(errorBody?.error || error.message);
      }
      
      if (data?.error) throw new Error(data.error);
      
      toast({ title: 'Utilisateur supprimé', description: `${deleting.nom} a été supprimé.` });
      setDeleting(null);
      await fetchUsers();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);
    const fd = new FormData(e.currentTarget);
    const email = fd.get('email') as string;
    const password = fd.get('password') as string;
    const nom = fd.get('nom') as string;
    const role = fd.get('role') as string;

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { email, password, nom, role: role || undefined },
      });
      
      if (error) {
        const errorBody = await error.response?.json().catch(() => null);
        throw new Error(errorBody?.error || error.message);
      }
      
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Utilisateur créé', description: `${nom} (${email}) a été ajouté.` });
      setCreateOpen(false);
      await fetchUsers();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6" /> Gestion des utilisateurs
          </h1>
          <p className="text-muted-foreground">Visualisez les comptes et attribuez les rôles</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />Créer un utilisateur
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Comptes & Rôles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun utilisateur trouvé.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle actuel</TableHead>
                    <TableHead>Modifier le rôle</TableHead>
                    <TableHead>Chantier Assigné</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.nom || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        {u.role ? (
                          <Badge variant={roleBadgeVariant[u.role]}>{roleLabelsMap[u.role]}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Aucun rôle</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={u.role || ''}
                            onValueChange={(val) => handleRoleChange(u.id, val as UserRole)}
                            disabled={saving === u.id}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Choisir un rôle" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin RH</SelectItem>
                              <SelectItem value="chef_chantier">Chef de Chantier</SelectItem>
                              <SelectItem value="directeur">Directeur des Travaux</SelectItem>
                              <SelectItem value="caisse">Caisse</SelectItem>
                              <SelectItem value="en_attente">En attente (Bloqué)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell>
                        {['chef_chantier', 'directeur', 'admin'].includes(u.role as string) ? (
                          <div className="flex items-center gap-2">
                            <Input
                              defaultValue={u.chantier_assigne === '*' ? 'TOUS' : (u.chantier_assigne || '')}
                              onBlur={e => {
                                const val = e.target.value.toUpperCase() === 'TOUS' ? '*' : e.target.value;
                                if (val !== (u.chantier_assigne || '')) {
                                  handleChantierChange(u.id, val);
                                }
                              }}
                              placeholder="Ex: Chantier A, Chantier B (ou TOUS)"
                              className="h-8 w-[140px] text-xs"
                              disabled={saving === u.id}
                            />
                            {saving === u.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleting(u)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un utilisateur</DialogTitle>
            <DialogDescription>L'utilisateur pourra se connecter immédiatement avec ces identifiants.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Nom complet</Label>
              <Input name="nom" placeholder="Jean Dupont" required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input name="email" type="email" placeholder="jean@example.com" required />
            </div>
            <div className="space-y-2">
              <Label>Mot de passe</Label>
              <Input name="password" type="password" placeholder="Min. 6 caractères" minLength={6} required />
            </div>
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select name="role" defaultValue="chef_chantier">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin RH</SelectItem>
                  <SelectItem value="chef_chantier">Chef de Chantier</SelectItem>
                  <SelectItem value="directeur">Directeur des Travaux</SelectItem>
                  <SelectItem value="caisse">Caisse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Annuler</Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'utilisateur</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deleting?.nom}</strong> ({deleting?.email}) ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deleteLoading}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default UsersPage;
