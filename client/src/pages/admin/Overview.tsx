import { useQuery } from '@tanstack/react-query';
import { Layers, Users, BookOpen, HelpCircle, GraduationCap, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Stats {
  batches: number;
  activeBatches: number;
  students: number;
  coordinators: number;
  materials: number;
  openDoubts: number;
}

export default function AdminOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => (await api.get<Stats>('/admin/stats')).data,
  });

  return (
    <div>
      <PageHeader
        title="Operations overview"
        subtitle="Health and activity across all batches."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))
          : data && (
              <>
                <StatCard label="Total batches" value={data.batches} icon={Layers} delay={0} />
                <StatCard
                  label="Active"
                  value={data.activeBatches}
                  icon={ShieldCheck}
                  delay={0.05}
                />
                <StatCard
                  label="Coordinators"
                  value={data.coordinators}
                  icon={Users}
                  delay={0.1}
                />
                <StatCard
                  label="Students"
                  value={data.students}
                  icon={GraduationCap}
                  delay={0.15}
                />
                <StatCard label="Materials" value={data.materials} icon={BookOpen} delay={0.2} />
                <StatCard
                  label="Open doubts"
                  value={data.openDoubts}
                  icon={HelpCircle}
                  delay={0.25}
                />
              </>
            )}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>What admins do here</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Use <strong>Batches</strong> to create, edit and archive cohorts, and to assign a
              coordinator.
            </p>
            <p>
              Use <strong>Users</strong> to provision new accounts, search the directory, and
              move students between batches.
            </p>
            <p>
              Students can only belong to one batch; coordinators and admins never have one.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tips for testing</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Use the user switcher in the top bar to hop between roles instantly.</p>
            <p>
              Raise a doubt as a student — a coordinator in the seeded batch will receive a live
              notification toast.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
