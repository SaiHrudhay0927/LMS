import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, HelpCircle, MessageSquare, Users } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { useMyBatches } from '@/hooks/useBatches';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function StudentOverview() {
  const { user } = useAuth();
  const { data: batches, isLoading } = useMyBatches();
  const batch = batches?.[0];

  const { data: materials } = useQuery({
    queryKey: ['materials', batch?._id, 'overview'],
    enabled: !!batch,
    queryFn: async () =>
      (await api.get<any[]>('/materials', { params: { batchId: batch!._id } })).data,
  });

  const { data: myDoubts } = useQuery({
    queryKey: ['doubts', 'mine-overview'],
    queryFn: async () => (await api.get<any[]>('/doubts')).data,
  });

  if (isLoading) return <Skeleton className="h-40 rounded-2xl" />;
  if (!batch)
    return (
      <Empty
        icon={Users}
        title="You're not in a batch yet"
        description="Your admin will enroll you — refresh after that."
      />
    );

  const recentMaterials = (materials ?? []).slice(0, 4);
  const openDoubts = (myDoubts ?? []).filter((d) => d.status === 'open');

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user!.fullName.split(' ')[0]}.`}
        subtitle={batch.name}
      />

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard
          label="Materials"
          value={materials?.length ?? '—'}
          icon={BookOpen}
          hint="Across docs, videos, links"
          delay={0}
        />
        <StatCard
          label="Open doubts"
          value={openDoubts.length}
          icon={HelpCircle}
          hint={openDoubts.length ? 'Awaiting reply' : 'Inbox zero'}
          delay={0.05}
        />
        <StatCard
          label="Coordinator"
          value={batch.coordinatorId?.fullName ?? '—'}
          icon={MessageSquare}
          delay={0.1}
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
              <CardTitle>Latest from your batch</CardTitle>
              <Button asChild size="sm" variant="ghost">
                <Link to="/student/content">
                  All content <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {!recentMaterials.length ? (
                <div className="text-sm text-muted-foreground text-center py-6">
                  Nothing posted yet.
                </div>
              ) : (
                recentMaterials.map((m: any) => (
                  <Link
                    key={m._id}
                    to="/student/content"
                    className="flex items-center gap-3 rounded-lg border border-border/40 p-3 hover:bg-secondary/60 transition-colors"
                  >
                    <Badge variant="outline">{m.type}</Badge>
                    <span className="text-sm font-medium truncate flex-1">{m.title}</span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle>Jump in</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button asChild variant="outline">
                <Link to="/student/doubts">
                  <HelpCircle className="h-4 w-4" /> Raise a doubt
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/student/chat">
                  <MessageSquare className="h-4 w-4" /> Message someone
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/student/roster">
                  <Users className="h-4 w-4" /> See batchmates
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
