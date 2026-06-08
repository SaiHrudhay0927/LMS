import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Shield, Users, GraduationCap, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { useDevUsers } from '@/auth/useDevUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const roleIcon = {
  admin: Shield,
  coordinator: Users,
  student: GraduationCap,
};

export default function Login() {
  const { user, loginAs } = useAuth();
  const { data: users, isLoading, isError } = useDevUsers();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={`/${user.role}`} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = email.trim();
    if (!target) return;
    setBusy(true);
    try {
      await loginAs(target);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDemo = async (em: string) => {
    setBusy(true);
    try {
      await loginAs(em);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Login failed');
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
              Learning that actually <span className="bg-gradient-to-r from-brand-500 to-accent bg-clip-text text-transparent">moves</span>.
            </h1>
            <p className="text-lg text-muted-foreground">
              Built for cohort-based programs — admins shape batches, coordinators run them, students show up to grow.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {['Cohorts', 'Live Doubts', 'Realtime Chat', 'Role-aware'].map((t) => (
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
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in with your seeded account email. No password — this build uses a mock auth provider.
            </p>

            <form onSubmit={submit} className="mt-6 space-y-3">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
              />
              <Button
                type="submit"
                variant="gradient"
                size="lg"
                className="w-full"
                disabled={busy || !email.trim()}
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                  Demo accounts
                </span>
              </div>
            </div>

            {isLoading && (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 rounded-lg bg-secondary/60 animate-pulse" />
                ))}
              </div>
            )}

            {isError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <div>
                  Couldn't reach the server. Make sure the API is running on port 5000 and that seed data exists.
                </div>
              </div>
            )}

            {users && (
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                {users.map((u) => {
                  const Icon = roleIcon[u.role];
                  return (
                    <button
                      key={u._id}
                      onClick={() => handleDemo(u.email)}
                      disabled={busy}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border border-border/40 bg-background/40 p-2.5 text-left transition-all hover:border-primary/40 hover:bg-primary/[0.04] disabled:opacity-50',
                      )}
                    >
                      <Avatar name={u.fullName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{u.fullName}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        {u.role}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
