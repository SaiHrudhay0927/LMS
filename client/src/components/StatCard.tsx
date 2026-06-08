import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  delay = 0,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ComponentType<any>;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm shadow-black/[0.02]',
        className,
      )}
    >
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-brand-500/10 to-accent/10 blur-2xl" />
      <div className="relative flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
        {Icon && (
          <div className="grid place-items-center h-8 w-8 rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="relative mt-3 text-3xl font-bold tracking-tight">{value}</div>
      {hint && <div className="relative mt-1 text-xs text-muted-foreground">{hint}</div>}
    </motion.div>
  );
}
