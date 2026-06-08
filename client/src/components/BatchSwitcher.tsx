import { Layers } from 'lucide-react';
import { Select } from '@/components/ui/select';
import type { BatchSummary } from '@/hooks/useBatches';

export function BatchSwitcher({
  batches,
  value,
  onChange,
}: {
  batches: BatchSummary[];
  value: string;
  onChange(v: string): void;
}) {
  if (!batches.length) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-1.5">
      <Layers className="h-4 w-4 text-muted-foreground" />
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 border-none bg-transparent text-sm font-medium shadow-none focus-visible:ring-0"
      >
        {batches.map((b) => (
          <option key={b._id} value={b._id}>
            {b.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
