import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Lock } from "lucide-react";
import logo from "@/assets/logo.png";

const PendingPage = () => {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-2xl bg-primary/5 flex items-center justify-center p-4">
            <img src={logo} alt="SAMES CI" className="h-full w-full object-contain" />
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Lock className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Compte en attente</h1>
          <p className="text-gray-500">
            Bonjour {user?.nom}. Votre compte est actuellement en attente de validation par un administrateur. 
            Vous n'avez pas encore de rôle assigné sur la plateforme.
          </p>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Se déconnecter
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PendingPage;
