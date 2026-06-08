import { cn } from '@/lib/utils';

type Variant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';

const map: Record<Variant, string> = {
  default: 'bg-primary/15 text-primary border-primary/20',
  secondary: 'bg-secondary text-secondary-foreground border-border',
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  destructive: 'bg-destructive/15 text-destructive border-destructive/30',
  outline: 'border-border text-muted-foreground',
};

export function Badge({
  variant = 'default',
  className,
  children,
}: {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        map[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
