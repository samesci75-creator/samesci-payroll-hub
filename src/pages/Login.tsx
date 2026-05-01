import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, roleDefaultRoute } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import logo from '@/assets/logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [error, setError] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
    } else {
      setForgotSuccess(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isSignup) {
        const { error } = await signup(email, password, nom);
        if (error) {
          setError(error);
        } else {
          setSignupSuccess(true);
        }
      } else {
        const { error } = await login(email, password);
        if (error) {
          setError('Identifiants invalides. Vérifiez votre email et mot de passe.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl overflow-hidden">
            <img src={logo} alt="SAMES CI" className="h-16 w-16 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-secondary-foreground font-[Space_Grotesk]">SAMES CI</h1>
          <p className="text-secondary-foreground/60 mt-1">Système de Pointage & Paiement</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle>{isForgot ? 'Mot de passe oublié' : isSignup ? 'Créer un compte' : 'Connexion'}</CardTitle>
            <CardDescription>
              {isForgot ? 'Entrez votre email pour recevoir un lien de réinitialisation' : isSignup ? 'Inscrivez-vous pour accéder à la plateforme' : 'Accédez à votre espace de travail'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {forgotSuccess ? (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Un email de réinitialisation a été envoyé à <strong>{email}</strong>.
                </p>
                <Button variant="link" onClick={() => { setIsForgot(false); setForgotSuccess(false); }}>
                  Retour à la connexion
                </Button>
              </div>
            ) : signupSuccess ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  Un email de confirmation a été envoyé à <strong>{email}</strong>. Vérifiez votre boîte mail pour activer votre compte.
                </p>
                <Button variant="link" className="mt-4" onClick={() => { setIsSignup(false); setSignupSuccess(false); }}>
                  Retour à la connexion
                </Button>
              </div>
            ) : isForgot ? (
              <form onSubmit={handleForgot} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="email@sames.ci" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Envoyer le lien
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <button type="button" className="text-primary underline" onClick={() => { setIsForgot(false); setError(''); }}>
                    Retour à la connexion
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}
                {isSignup && (
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom complet</Label>
                    <Input id="nom" placeholder="Votre nom" value={nom} onChange={e => setNom(e.target.value)} required />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="email@sames.ci" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                </div>
                {!isSignup && (
                  <div className="text-right">
                    <button type="button" className="text-sm text-primary underline" onClick={() => { setIsForgot(true); setError(''); }}>
                      Mot de passe oublié ?
                    </button>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isSignup ? "S'inscrire" : 'Se connecter'}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  {isSignup ? 'Déjà un compte ?' : "Pas encore de compte ?"}{' '}
                  <button type="button" className="text-primary underline" onClick={() => { setIsSignup(!isSignup); setError(''); }}>
                    {isSignup ? 'Se connecter' : "S'inscrire"}
                  </button>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
