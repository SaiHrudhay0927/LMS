import { useState } from 'react';
import { motion } from 'framer-motion';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { Navigate } from 'react-router-dom';
import { Sparkles, ShieldAlert, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/auth/useAuth';
import { useTheme } from '@/lib/theme';

export default function Login() {
  const { user, loginWithGoogle } = useAuth();
  const { theme } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const oauthMisconfigured = !googleClientId || googleClientId.startsWith('replace-');

  if (user) return <Navigate to={`/${user.role}`} replace />;

  const onSuccess = async (cred: CredentialResponse) => {
    if (!cred.credential) {
      setError('Google did not return a credential. Try again.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await loginWithGoogle(cred.credential);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Sign-in failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />

      <div className="relative grid min-h-screen lg:grid-cols-2">
        {/* Left brand panel */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="hidden lg:flex flex-col justify-between p-12"
        >
          <div className="flex items-center gap-2">
            <div className="grid place-items-center h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent text-white shadow-lg shadow-primary/40">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">Pulse LMS</span>
          </div>

          <div className="space-y-6 max-w-md">
            <h1 className="text-5xl font-extrabold tracking-tight leading-[1.05]">
              Learning that actually{' '}
              <span className="bg-gradient-to-r from-brand-500 to-accent bg-clip-text text-transparent">
                moves
              </span>
              .
            </h1>
            <p className="text-lg text-muted-foreground">
              Cohort-based programs that just work. Admin shapes batches, coordinators run them,
              students show up to grow.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {['Cohorts', 'Live Doubts', 'Realtime Chat', 'Google sign-in'].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Pulse — pragmatic LMS.
          </div>
        </motion.div>

        {/* Right login panel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="flex items-center justify-center p-6 md:p-12"
        >
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/80 backdrop-blur p-6 md:p-8 shadow-xl shadow-black/[0.04]">
            <div className="lg:hidden flex items-center gap-2 mb-6">
              <div className="grid place-items-center h-9 w-9 rounded-lg bg-gradient-to-br from-brand-500 to-accent text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-bold">Pulse LMS</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Sign in to Pulse</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Use your Google account. Only users who've been invited by the admin can sign in.
            </p>

            {oauthMisconfigured ? (
              <div className="mt-6 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium">Google sign-in isn't configured yet.</div>
                  <div className="text-xs mt-1 text-amber-700/80 dark:text-amber-300/80">
                    Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>client/.env</code> and{' '}
                    <code>GOOGLE_CLIENT_ID</code> in <code>server/.env</code>, then restart both.
                    See README → "Google OAuth setup".
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 grid place-items-center">
                <div className={busy ? 'pointer-events-none opacity-50' : ''}>
                  <GoogleLogin
                    onSuccess={onSuccess}
                    onError={() => setError('Google sign-in failed. Try again.')}
                    theme={theme === 'dark' ? 'filled_black' : 'outline'}
                    size="large"
                    shape="pill"
                    text="signin_with"
                    width="280"
                  />
                </div>
                {busy && (
                  <div className="text-xs text-muted-foreground mt-3 animate-pulse">
                    Signing you in…
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                <div>{error}</div>
              </div>
            )}

            <div className="mt-6 flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/40 p-3 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div>
                <strong className="text-foreground">First time?</strong> Ask the admin
                (saihrudhay9@gmail.com) to add your Gmail in the Users page. The very first
                sign-in by that admin email bootstraps the admin account automatically.
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
