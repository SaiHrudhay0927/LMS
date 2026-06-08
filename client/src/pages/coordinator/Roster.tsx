import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useMyBatches } from '@/hooks/useBatches';
import { PageHeader } from '@/components/layout/PageHeader';
import { BatchSwitcher } from '@/components/BatchSwitcher';
import { Card } from '@/components/ui/card';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm';

export default function CoordinatorRoster() {
  const { data: batches, isLoading: bLoading } = useMyBatches();
  const [batchId, setBatchId] = useState('');
  const [pendingRemove, setPendingRemove] = useState<{ _id: string; fullName: string } | null>(null);
  const activeBatchId = batchId || batches?.[0]?._id || '';

  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['roster', activeBatchId],
    enabled: !!activeBatchId,
    queryFn: async () =>
      (
        await api.get<{
          students: { _id: string; fullName: string; email: string; avatarUrl?: string }[];
        }>(`/batches/${activeBatchId}/roster`)
      ).data,
  });

  const remove = useMutation({
    mutationFn: async (studentId: string) =>
      (await api.delete(`/coordinator/batches/${activeBatchId}/students/${studentId}`)).data,
    onSuccess: () => {
      toast.success('Removed from batch');
      qc.invalidateQueries({ queryKey: ['roster', activeBatchId] });
      qc.invalidateQueries({ queryKey: ['dev-users'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed'),
  });

  if (bLoading) return <Skeleton className="h-40 rounded-2xl" />;
  if (!batches?.length) {
    return <Empty icon={Users} title="No batches assigned" />;
  }

  return (
    <div>
      <PageHeader
        title="Roster"
        subtitle="The students you're coaching in this batch."
        actions={
          <div className="flex items-center gap-2">
            {batches.length > 1 && (
              <BatchSwitcher batches={batches} value={activeBatchId} onChange={setBatchId} />
            )}
            <AddStudentDialog batchId={activeBatchId} />
          </div>
        }
      />

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : !data?.students.length ? (
        <Empty
          icon={Users}
          title="No students enrolled yet"
          description="Add your first student to get the cohort going."
          action={<AddStudentDialog batchId={activeBatchId} />}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.students.map((s) => (
            <Card
              key={s._id}
              className="p-4 flex items-center gap-3 group"
            >
              <Avatar name={s.fullName} />
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{s.fullName}</div>
                <div className="text-xs text-muted-foreground truncate">{s.email}</div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setPendingRemove(s)}
                aria-label="Remove student"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <UserMinus className="h-4 w-4 text-destructive" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingRemove}
        onOpenChange={(o) => !o && setPendingRemove(null)}
        title="Remove student from batch?"
        description={
          <span>
            <strong>{pendingRemove?.fullName}</strong> will lose access to this batch immediately.
            Their account stays — an admin or coordinator can re-enroll them later.
          </span>
        }
        confirmLabel="Remove from batch"
        destructive
        onConfirm={async () => {
          if (pendingRemove) await remove.mutateAsync(pendingRemove._id);
        }}
      />
    </div>
  );
}

function AddStudentDialog({ batchId }: { batchId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');

  const reset = () => {
    setEmail('');
    setFullName('');
  };

  const m = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/coordinator/batches/${batchId}/students`, {
          email,
          fullName,
        })
      ).data as { user: any; created: boolean; alreadyEnrolled?: boolean },
    onSuccess: (res) => {
      if (res.alreadyEnrolled) {
        toast.info('Already in this batch');
      } else if (res.created) {
        toast.success('Student created and enrolled');
      } else {
        toast.success('Student enrolled');
      }
      qc.invalidateQueries({ queryKey: ['roster', batchId] });
      qc.invalidateQueries({ queryKey: ['dev-users'] });
      setOpen(false);
      reset();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to add student'),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="gradient">
          <Plus className="h-4 w-4" /> Add student
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add student to batch</DialogTitle>
          <DialogDescription>
            We'll create the account if it doesn't exist, or enroll an existing student with no
            batch. Students already in another batch must be moved by an admin.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Full name</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            variant="gradient"
            disabled={m.isPending || !email || !fullName}
            onClick={() => m.mutate()}
          >
            Add student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
