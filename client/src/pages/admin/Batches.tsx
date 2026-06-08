import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Archive, Layers, Plus, Search, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm';
import { PageHeader } from '@/components/layout/PageHeader';

interface Batch {
  _id: string;
  name: string;
  description?: string;
  coordinatorId?: { _id: string; fullName: string; email: string } | null;
  isArchived: boolean;
  studentCount: number;
  createdAt: string;
}

interface Coord {
  _id: string;
  fullName: string;
  email: string;
}

export default function AdminBatches() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pendingArchive, setPendingArchive] = useState<Batch | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Batch | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'batches', { q, page }],
    queryFn: async () => {
      const { data } = await api.get<{ items: Batch[]; total: number; page: number; limit: number }>(
        '/admin/batches',
        { params: { q, page, limit: 8 } },
      );
      return data;
    },
  });

  const { data: coords } = useQuery({
    queryKey: ['admin', 'users', { role: 'coordinator', limit: 50 }],
    queryFn: async () =>
      (
        await api.get<{ items: Coord[] }>('/admin/users', {
          params: { role: 'coordinator', limit: 50 },
        })
      ).data.items,
  });

  const archive = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/admin/batches/${id}`)).data,
    onSuccess: () => {
      toast.success('Batch archived');
      qc.invalidateQueries({ queryKey: ['admin', 'batches'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed'),
  });

  const hardDelete = useMutation({
    mutationFn: async (id: string) =>
      (
        await api.delete<{
          mode: 'deleted';
          deletedId: string;
          cascade: { materials: number; doubts: number; messages: number; studentsUnenrolled: number };
        }>(`/admin/batches/${id}?hard=true`)
      ).data,
    onSuccess: (res) => {
      toast.success(
        `Deleted from database — also removed ${res.cascade.materials} materials, ${res.cascade.doubts} doubts, ${res.cascade.messages} messages`,
      );
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: ['batches'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Delete failed'),
  });

  const restore = useMutation({
    mutationFn: async (id: string) =>
      (await api.patch(`/admin/batches/${id}`, { isArchived: false })).data,
    onSuccess: () => {
      toast.success('Batch restored');
      qc.invalidateQueries({ queryKey: ['admin', 'batches'] });
    },
  });

  const assignCoord = useMutation({
    mutationFn: async (vars: { id: string; coordinatorId: string | null }) =>
      (
        await api.post(`/admin/batches/${vars.id}/coordinator`, {
          coordinatorId: vars.coordinatorId,
        })
      ).data,
    onSuccess: () => {
      toast.success('Coordinator updated');
      qc.invalidateQueries({ queryKey: ['admin', 'batches'] });
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div>
      <PageHeader
        title="Batches"
        subtitle="Create cohorts, assign coordinators, archive what's done."
        actions={<CreateBatchDialog coords={coords ?? []} />}
      />

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search batches by name…"
            className="pl-9"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <Empty
          icon={Layers}
          title="No batches yet"
          description="Spin up your first cohort to get started."
        />
      ) : (
        <motion.div layout className="grid gap-3">
          {data.items.map((b) => (
            <Card key={b._id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{b.name}</h3>
                    {b.isArchived ? (
                      <Badge variant="warning">
                        <Archive className="h-3 w-3" /> Archived
                      </Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                    <Badge variant="secondary">
                      <Users className="h-3 w-3" /> {b.studentCount} students
                    </Badge>
                  </div>
                  {b.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {b.description}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground mt-2">
                    Coordinator:{' '}
                    {b.coordinatorId ? (
                      <span className="text-foreground font-medium">
                        {b.coordinatorId.fullName}
                      </span>
                    ) : (
                      <span className="italic">unassigned</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select
                    value={b.coordinatorId?._id ?? ''}
                    onChange={(e) =>
                      assignCoord.mutate({
                        id: b._id,
                        coordinatorId: e.target.value || null,
                      })
                    }
                    className="h-9 text-xs"
                  >
                    <option value="">Unassigned</option>
                    {coords?.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.fullName}
                      </option>
                    ))}
                  </Select>
                  {b.isArchived ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => restore.mutate(b._id)}>
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPendingDelete(b)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setPendingArchive(b)}>
                      <Archive className="h-4 w-4" /> Archive
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </motion.div>
      )}

      <ConfirmDialog
        open={!!pendingArchive}
        onOpenChange={(o) => !o && setPendingArchive(null)}
        title="Archive batch?"
        description={
          <span>
            <strong>{pendingArchive?.name}</strong> will be hidden from active listings but
            its materials, doubts, and messages stay in the database. You can restore it
            later from the archive view.
          </span>
        }
        confirmLabel="Archive"
        onConfirm={async () => {
          if (pendingArchive) await archive.mutateAsync(pendingArchive._id);
        }}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Permanently delete this batch?"
        description={
          <span>
            <strong>{pendingDelete?.name}</strong> and all its materials, doubts, and
            messages will be removed from MongoDB. Students stay but get unenrolled. This
            can't be undone.
          </span>
        }
        confirmLabel="Delete from database"
        destructive
        onConfirm={async () => {
          if (pendingDelete) await hardDelete.mutateAsync(pendingDelete._id);
        }}
      />

      {data && data.total > data.limit && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-xs text-muted-foreground">
            Page {data.page} of {totalPages} · {data.total} batches
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateBatchDialog({ coords }: { coords: Coord[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coordinatorId, setCoordinatorId] = useState('');

  const m = useMutation({
    mutationFn: async () =>
      (
        await api.post('/admin/batches', {
          name,
          description,
          coordinatorId: coordinatorId || null,
        })
      ).data,
    onSuccess: () => {
      toast.success('Batch created');
      qc.invalidateQueries({ queryKey: ['admin', 'batches'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setOpen(false);
      setName('');
      setDescription('');
      setCoordinatorId('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed'),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient">
          <Plus className="h-4 w-4" /> New batch
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create batch</DialogTitle>
          <DialogDescription>
            Cohorts group students with their coordinator and content.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Fullstack — Cohort 8"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's covered, who it's for…"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Coordinator</label>
            <Select
              value={coordinatorId}
              onChange={(e) => setCoordinatorId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {coords.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.fullName} — {c.email}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            variant="gradient"
            disabled={m.isPending || name.trim().length < 2}
            onClick={() => m.mutate()}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
