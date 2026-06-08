import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useMyBatches } from '@/hooks/useBatches';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/input';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Material, MaterialItem } from '@/pages/content/MaterialItem';

export default function StudentContent() {
  const { data: batches, isLoading: bLoading } = useMyBatches();
  const batch = batches?.[0];
  const [q, setQ] = useState('');

  const { data: materials, isLoading } = useQuery({
    queryKey: ['materials', batch?._id, 'student'],
    enabled: !!batch,
    queryFn: async () =>
      (await api.get<Material[]>('/materials', { params: { batchId: batch!._id } })).data,
  });

  const grouped = useMemo(() => {
    const all = (materials ?? []).filter((m) =>
      q ? (m.title + ' ' + (m.description ?? '')).toLowerCase().includes(q.toLowerCase()) : true,
    );
    return {
      document: all.filter((m) => m.type === 'document'),
      video: all.filter((m) => m.type === 'video'),
      link: all.filter((m) => m.type === 'link'),
      total: all.length,
    };
  }, [materials, q]);

  if (bLoading) return <Skeleton className="h-40 rounded-2xl" />;
  if (!batch)
    return <Empty icon={BookOpen} title="You're not in a batch yet" />;

  return (
    <div>
      <PageHeader title="Content" subtitle={batch.name} />

      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search materials…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : !grouped.total ? (
        <Empty
          icon={BookOpen}
          title={q ? 'No matches' : 'Nothing posted yet'}
          description={q ? 'Try different keywords.' : 'Check back soon.'}
        />
      ) : (
        <div className="space-y-8">
          {(['document', 'video', 'link'] as const).map((type) =>
            grouped[type].length ? (
              <section key={type}>
                <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground mb-3">
                  {type === 'document' ? 'Documents' : type === 'video' ? 'Videos' : 'Links'}
                </h3>
                <div className="grid gap-3">
                  {grouped[type].map((m) => (
                    <MaterialItem key={m._id} m={m} />
                  ))}
                </div>
              </section>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
