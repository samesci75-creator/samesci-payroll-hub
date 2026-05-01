import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'chef_chantier' | 'directeur' | 'caisse' | 'en_attente';

interface AppUser {
  id: string;
  email: string;
  nom: string;
  role: UserRole;
  chantier_assigne?: string | null;
  chantiers_autorises: string[];
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, nom: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchAppUser(authUser: User): Promise<AppUser | null> {
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role, chantier_assigne')
    .eq('user_id', authUser.id);

  const roleData = roles && roles.length > 0 ? roles[0] : null;
  const role = (roleData?.role || 'en_attente') as UserRole;
  const chantier_assigne = roleData?.chantier_assigne || null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('nom')
    .eq('id', authUser.id)
    .maybeSingle();

  const chantiers_autorises = chantier_assigne
    ? chantier_assigne.split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];

  return {
    id: authUser.id,
    email: authUser.email || '',
    nom: profile?.nom || authUser.email || '',
    role,
    chantier_assigne,
    chantiers_autorises,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
      }
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        // Use setTimeout to avoid Supabase auth deadlock
        setTimeout(async () => {
          const appUser = await fetchAppUser(session.user);
          setUser(appUser);
          setLoading(false);
        }, 0);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (initialized.current) return;
      initialized.current = true;
      setSession(session);
      if (session?.user) {
        const appUser = await fetchAppUser(session.user);
        setUser(appUser);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signup = async (email: string, password: string, nom: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nom }, emailRedirectTo: window.location.origin },
    });
    return { error: error?.message || null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, signup, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

export const roleLabels: Record<UserRole, string> = {
  admin: 'Admin RH',
  chef_chantier: 'Chef de Chantier',
  directeur: 'Directeur des Travaux',
  caisse: 'Caisse',
  en_attente: 'En attente',
};

export const roleDefaultRoute: Record<UserRole, string> = {
  admin: '/dashboard',
  chef_chantier: '/pointage',
  directeur: '/validation',
  caisse: '/paiement',
  en_attente: '/attente',
};
