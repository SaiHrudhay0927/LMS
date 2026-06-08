import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, HelpCircle, MessageSquare, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useMyBatches } from '@/hooks/useBatches';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DoubtRow {
  _id: string;
  title: string;
  status: 'open' | 'resolved';
  studentId?: { fullName: string };
  createdAt: string;
}

export default function CoordinatorOverview() {
  const { data: batches, isLoading: bLoading } = useMyBatches();
  const { data: openDoubts } = useQuery({
    queryKey: ['doubts', 'overview-open'],
    queryFn: async () => (await api.get<DoubtRow[]>('/doubts', { params: { status: 'open' } })).data,
  });

  const firstBatch = batches?.[0];

  const { data: rosterCount } = useQuery({
    queryKey: ['roster', firstBatch?._id, 'count'],
    enabled: !!firstBatch,
    queryFn: async () => {
      const { data } = await api.get<{ students: any[] }>(`/batches/${firstBatch!._id}/roster`);
      return data.students.length;
    },
  });

  const { data: materials } = useQuery({
    queryKey: ['materials', firstBatch?._id, 'count'],
    enabled: !!firstBatch,
    queryFn: async () => {
      const { data } = await api.get<any[]>('/materials', {
        params: { batchId: firstBatch!._id },
      });
      return data.length;
    },
  });

  const recent = useMemo(() => (openDoubts ?? []).slice(0, 5), [openDoubts]);

  return (
    <div>
      <PageHeader
        title={`Hi — let's run a great cohort`}
        subtitle="Open doubts, your materials, and the people you're shepherding."
      />

      {bLoading ? (
        <div className="grid sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : !batches?.length ? (
        <Empty
          icon={Users}
          title="No batches assigned yet"
          description="An admin will assign you a batch — it'll show up here automatically."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="My batches" value={batches.length} icon={Users} delay={0} />
            <StatCard
              label="Open doubts"
              value={openDoubts?.length ?? '—'}
              icon={HelpCircle}
              delay={0.05}
            />
            <StatCard
              label="Students (current batch)"
              value={rosterCount ?? '—'}
              icon={Users}
              delay={0.1}
            />
            <StatCard
              label="Materials (current batch)"
              value={materials ?? '—'}
              icon={BookOpen}
              delay={0.15}
            />
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2"
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Latest open doubts</CardTitle>
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/coordinator/doubts">
                      Open inbox <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {!recent.length ? (
                    <div className="text-sm text-muted-foreground text-center py-6">
                      Inbox zero — nothing waiting for you right now.
                    </div>
                  ) : (
                    recent.map((d) => (
                      <Link
                        key={d._id}
                        to={`/coordinator/doubts?id=${d._id}`}
                        className="flex items-center gap-3 rounded-lg border border-border/40 p-3 hover:bg-secondary/60 transition-colors"
                      >
                        <Badge variant="warning">open</Badge>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{d.title}</div>
                          <div className="text-xs text-muted-foreground">
                            from {d.studentId?.fullName ?? 'student'}
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Quick actions</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                  <Button asChild variant="outline">
                    <Link to="/coordinator/content">
                      <BookOpen className="h-4 w-4" /> Manage content
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/coordinator/chat">
                      <MessageSquare className="h-4 w-4" /> Open messages
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/coordinator/roster">
                      <Users className="h-4 w-4" /> View roster
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
