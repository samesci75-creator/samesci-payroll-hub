import { ReactNode, useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.png';

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      {/* Barre de navigation Top (Mobile uniquement) */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-sidebar text-sidebar-foreground sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden bg-white/10">
            <img src={logo} alt="SAMES CI" className="h-8 w-8 object-contain" />
          </div>
          <h1 className="text-base font-bold tracking-tight font-[Space_Grotesk]">SAMES CI</h1>
        </div>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-sidebar border-r border-sidebar-border">
            <AppSidebar onNavigate={() => setOpen(false)} isMobile />
          </SheetContent>
        </Sheet>
      </div>

      {/* Barre latérale classique (Desktop uniquement) */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      {/* Contenu principal (avec marge adaptative) */}
      <main className="md:pl-64 min-h-screen w-full overflow-x-hidden">
        <div className="p-4 md:p-6 lg:p-8 max-w-full overflow-hidden">{children}</div>
      </main>
    </div>
  );
};
