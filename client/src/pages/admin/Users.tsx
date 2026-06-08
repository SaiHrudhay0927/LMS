import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
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
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/auth/useAuth';

interface UserRow {
  _id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'coordinator' | 'student';
  isActive: boolean;
  batchId?: { _id: string; name: string } | null;
}

interface BatchOpt {
  _id: string;
  name: string;
}

export default function AdminUsers() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<UserRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', { q, role, page }],
    queryFn: async () =>
      (
        await api.get<{ items: UserRow[]; total: number; page: number; limit: number }>(
          '/admin/users',
          { params: { q, role, page, limit: 10 } },
        )
      ).data,
  });

  const { data: batches } = useQuery({
    queryKey: ['admin', 'batches', 'all'],
    queryFn: async () =>
      (
        await api.get<{ items: BatchOpt[] }>('/admin/batches', {
          params: { limit: 50 },
        })
      ).data.items,
  });

  const moveStudent = useMutation({
    mutationFn: async (vars: { id: string; batchId: string | null }) =>
      (await api.patch(`/admin/users/${vars.id}`, { batchId: vars.batchId })).data,
    onSuccess: () => {
      toast.success('Student moved');
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'batches'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed'),
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) =>
      (await api.delete<{ ok: true; deletedId: string }>(`/admin/users/${id}`)).data,
    onSuccess: () => {
      toast.success('User deleted from database');
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: ['dev-users'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Delete failed'),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Add coordinators, enroll students, and search the directory."
        actions={<NewUserDialog batches={batches ?? []} />}
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            className="pl-9"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className="max-w-[180px]"
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="coordinator">Coordinator</option>
          <option value="student">Student</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <Empty icon={UsersIcon} title="No users match" description="Try clearing the filters." />
      ) : (
        <Card className="divide-y divide-border/60">
          {data.items.map((u) => (
            <div key={u._id} className="p-4 flex flex-wrap items-center gap-3">
              <Avatar name={u.fullName} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{u.fullName}</span>
                  <Badge variant="outline">{u.role}</Badge>
                  {!u.isActive && <Badge variant="warning">inactive</Badge>}
                </div>
                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
              </div>
              {u.role === 'student' && (
                <Select
                  value={u.batchId?._id ?? ''}
                  onChange={(e) => moveStudent.mutate({ id: u._id, batchId: e.target.value || null })}
                  className="h-9 text-xs max-w-[260px]"
                >
                  <option value="">— No batch —</option>
                  {batches?.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              )}
              {me?._id !== u._id && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setPendingDelete(u)}
                  aria-label="Delete user"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </Card>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Permanently delete this user?"
        description={
          <span>
            <strong>{pendingDelete?.fullName}</strong> ({pendingDelete?.email}) will be removed
            from MongoDB along with their doubts and messages. If they're a coordinator, their
            batches will be unassigned. This can't be undone.
          </span>
        }
        confirmLabel="Delete from database"
        destructive
        onConfirm={async () => {
          if (pendingDelete) await deleteUser.mutateAsync(pendingDelete._id);
        }}
      />

      {data && data.total > data.limit && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-xs text-muted-foreground">
            Page {data.page} of {totalPages} · {data.total} users
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

function NewUserDialog({ batches }: { batches: BatchOpt[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'coordinator' | 'student'>('student');
  const [batchId, setBatchId] = useState('');

  const m = useMutation({
    mutationFn: async () =>
      (
        await api.post('/admin/users', {
          email,
          fullName,
          role,
          batchId: role === 'student' ? batchId || null : null,
        })
      ).data,
    onSuccess: () => {
      toast.success('User created');
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      qc.invalidateQueries({ queryKey: ['dev-users'] });
      setOpen(false);
      setEmail('');
      setFullName('');
      setRole('student');
      setBatchId('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed'),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient">
          <Plus className="h-4 w-4" /> Add user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            Accounts only exist if you provision them. Mock auth uses the email to log in.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Full name</label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <Select value={role} onChange={(e) => setRole(e.target.value as any)}>
                <option value="student">Student</option>
                <option value="coordinator">Coordinator</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
            {role === 'student' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Batch</label>
                <Select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                  <option value="">— No batch —</option>
                  {batches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
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
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
