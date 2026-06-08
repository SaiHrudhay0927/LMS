import { cn } from '@/lib/utils';

export function Empty({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<any>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="grid place-items-center h-12 w-12 rounded-xl bg-secondary text-muted-foreground mb-3">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div className="font-semibold">{title}</div>
      {description && <div className="text-sm text-muted-foreground mt-1 max-w-md">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
