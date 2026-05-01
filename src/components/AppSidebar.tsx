import { useAuth, roleLabels } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, ClipboardCheck, ShieldCheck, Banknote, Upload, LogOut, UserCog, Building2, Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';

const navItems = [
  { label: 'Tableau de bord', icon: LayoutDashboard, path: '/dashboard', roles: ['admin', 'directeur'] },
  { label: 'Chantiers', icon: Building2, path: '/chantiers', roles: ['admin', 'directeur'] },
  { label: 'Personnel', icon: Users, path: '/personnel', roles: ['admin'] },
  { label: 'Pointage', icon: ClipboardCheck, path: '/pointage', roles: ['admin', 'chef_chantier'] },
  { label: 'Validation', icon: ShieldCheck, path: '/validation', roles: ['admin', 'directeur'] },
  { label: 'Paiement', icon: Banknote, path: '/paiement', roles: ['admin', 'caisse'] },
  { label: 'Import CSV', icon: Upload, path: '/import', roles: ['admin'] },
  { label: 'Utilisateurs', icon: UserCog, path: '/utilisateurs', roles: ['admin'] },
];

interface AppSidebarProps {
  onNavigate?: () => void;
  isMobile?: boolean;
}

export const AppSidebar = ({ onNavigate, isMobile }: AppSidebarProps = {}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const filtered = navItems.filter(n => n.roles.includes(user.role));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className={cn(
      "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
      isMobile ? "h-full w-full" : "fixed inset-y-0 left-0 z-30 w-64"
    )}>
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden">
          <img src={logo} alt="SAMES CI" className="h-10 w-10 object-contain" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight font-[Space_Grotesk]">SAMES CI</h1>
          <p className="text-xs text-sidebar-foreground/60">Gestion Chantiers</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {filtered.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                if (onNavigate) onNavigate();
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300 playful-section-hover group',
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className={cn(
                "h-4 w-4 transition-transform duration-500",
                "group-hover:rotate-12 group-hover:scale-110",
                active && "animate-bounce"
              )} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="mb-3 px-1">
          <p className="text-sm font-medium truncate">{user.nom}</p>
          <p className="text-xs text-sidebar-foreground/60">{roleLabels[user.role]}</p>
        </div>

        {/* APK Download Link */}
        <a 
          href="/Samesci-Payroll-hub.apk" 
          download="Samesci-Payroll-hub.apk"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary hover:bg-primary/10 transition-colors mb-2 font-bold border border-primary/20"
        >
          <Download className="h-4 w-4" />
          Télécharger l'App (APK)
        </a>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
};
