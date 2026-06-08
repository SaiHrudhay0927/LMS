import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useMyBatches } from '@/hooks/useBatches';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';

export default function StudentRoster() {
  const { data: batches } = useMyBatches();
  const batch = batches?.[0];

  const { data, isLoading } = useQuery({
    queryKey: ['roster', batch?._id],
    enabled: !!batch,
    queryFn: async () =>
      (await api.get<{ students: { _id: string; fullName: string; email: string }[] }>(
        `/batches/${batch!._id}/roster`,
      )).data,
  });

  if (!batch) return <Empty icon={Users} title="You're not in a batch yet" />;

  return (
    <div>
      <PageHeader title="Batchmates" subtitle={batch.name} />
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : !data?.students.length ? (
        <Empty icon={Users} title="You're the only one here so far" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.students.map((s) => (
            <Card key={s._id} className="p-4 flex items-center gap-3">
              <Avatar name={s.fullName} />
              <div className="min-w-0">
                <div className="font-medium truncate">{s.fullName}</div>
                <div className="text-xs text-muted-foreground truncate">{s.email}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
