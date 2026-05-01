import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, roleDefaultRoute } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ChantiersPage from "./pages/ChantiersPage";
import PersonnelPage from "./pages/PersonnelPage";
import PointagePage from "./pages/PointagePage";
import ValidationPage from "./pages/ValidationPage";
import PaiementPage from "./pages/PaiementPage";
import ImportPage from "./pages/ImportPage";
import ResetPassword from "./pages/ResetPassword";
import PendingPage from "./pages/PendingPage";
import UsersPage from "./pages/UsersPage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { SplashScreen } from "./components/SplashScreen";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode; roles?: string[] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to={roleDefaultRoute[user.role]} replace />;
  return <>{children}</>;
};

const RootRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={roleDefaultRoute[user!.role]} replace />;
};

const LoginRoute = () => {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (isAuthenticated && user) return <Navigate to={roleDefaultRoute[user.role]} replace />;
  return <Login />;
};

const AppInner = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<RootRedirect />} />
            <Route path="/dashboard" element={<ProtectedRoute roles={['admin', 'directeur']}><Dashboard /></ProtectedRoute>} />
            <Route path="/chantiers" element={<ProtectedRoute roles={['admin', 'directeur']}><ChantiersPage /></ProtectedRoute>} />
            <Route path="/personnel" element={<ProtectedRoute roles={['admin']}><PersonnelPage /></ProtectedRoute>} />
            <Route path="/pointage" element={<ProtectedRoute roles={['admin', 'chef_chantier']}><PointagePage /></ProtectedRoute>} />
            <Route path="/validation" element={<ProtectedRoute roles={['admin', 'directeur']}><ValidationPage /></ProtectedRoute>} />
            <Route path="/paiement" element={<ProtectedRoute roles={['admin', 'caisse']}><PaiementPage /></ProtectedRoute>} />
            <Route path="/import" element={<ProtectedRoute roles={['admin']}><ImportPage /></ProtectedRoute>} />
            <Route path="/utilisateurs" element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
            <Route path="/attente" element={<ProtectedRoute roles={['en_attente']}><PendingPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

const App = () => {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <>
      {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}
      <div
        style={{
          opacity: splashDone ? 1 : 0,
          transition: 'opacity 0.4s ease-in',
          pointerEvents: splashDone ? 'auto' : 'none',
        }}
      >
        <AppInner />
      </div>
    </>
  );
};

export default App;
