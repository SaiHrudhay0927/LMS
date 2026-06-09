import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, MessageCircle, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/auth/useAuth';
import { useMyBatches } from '@/hooks/useBatches';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
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
import { cn } from '@/lib/utils';

interface Member {
  _id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
}
interface Room {
  _id: string;
  name: string;
  hostId: Member;
  memberIds: Member[];
  updatedAt: string;
  createdAt: string;
}

export default function StudentRoomsList() {
  const { user } = useAuth();
  const { data: batches } = useMyBatches();
  const batch = batches?.[0];

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => (await api.get<Room[]>('/rooms')).data,
    refetchInterval: 20_000,
  });

  return (
    <div>
      <PageHeader
        title="Study rooms"
        subtitle="Spin up a room with batchmates to crack questions together. Optional AI tutor inside."
        actions={batch && <CreateRoomDialog batchId={batch._id} />}
      />

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : !rooms?.length ? (
        <Empty
          icon={MessageCircle}
          title="No rooms yet"
          description="Create your first study room and invite batchmates to discuss problems together."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rooms.map((r) => {
            const isHost = String(r.hostId._id) === user?._id;
            return (
              <motion.div
                key={r._id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Link to={`/student/rooms/${r._id}`}>
                  <Card
                    className={cn(
                      'p-4 hover:border-primary/50 transition-all hover:shadow-md cursor-pointer',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate">{r.name}</h3>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Hosted by {r.hostId.fullName}
                        </div>
                      </div>
                      {isHost && (
                        <Badge variant="default">
                          <Crown className="h-3 w-3" /> Host
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <div className="flex -space-x-2">
                        {r.memberIds.slice(0, 5).map((m) => (
                          <Avatar
                            key={m._id}
                            name={m.fullName}
                            src={m.avatarUrl}
                            size="sm"
                            className="ring-2 ring-card"
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {r.memberIds.length} member{r.memberIds.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateRoomDialog({ batchId }: { batchId: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: roster } = useQuery({
    queryKey: ['roster', batchId, 'for-room'],
    enabled: open,
    queryFn: async () =>
      (
        await api.get<{ students: { _id: string; fullName: string; email: string; avatarUrl?: string }[] }>(
          `/batches/${batchId}/roster`,
        )
      ).data,
  });

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const m = useMutation({
    mutationFn: async () =>
      (
        await api.post<Room>('/rooms', {
          name,
          memberIds: Array.from(selected),
        })
      ).data,
    onSuccess: () => {
      toast.success('Room created');
      qc.invalidateQueries({ queryKey: ['rooms'] });
      setOpen(false);
      setName('');
      setSelected(new Set());
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed'),
  });

  const batchmates = (roster?.students ?? []).filter((s) => s._id !== user?._id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient">
          <Plus className="h-4 w-4" /> New room
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create study room</DialogTitle>
          <DialogDescription>
            You'll be the host. Add batchmates now or invite them later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Room name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Week 3 problem set"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Invite batchmates ({selected.size} selected)
            </label>
            {!batchmates.length ? (
              <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground text-center">
                No one else is in your batch yet. You can create the room solo and invite later.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto rounded-lg border border-border/60 divide-y divide-border/40 scrollbar-thin">
                {batchmates.map((s) => {
                  const on = selected.has(s._id);
                  return (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => toggle(s._id)}
                      className={cn(
                        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-secondary/60 transition-colors',
                        on && 'bg-primary/[0.06]',
                      )}
                    >
                      <span
                        className={cn(
                          'grid place-items-center h-4 w-4 rounded border transition-colors',
                          on ? 'bg-primary border-primary text-white' : 'border-border',
                        )}
                      >
                        {on && '✓'}
                      </span>
                      <Avatar name={s.fullName} size="sm" />
                      <span className="flex-1 truncate">
                        <span className="block font-medium leading-tight">{s.fullName}</span>
                        <span className="block text-[11px] text-muted-foreground">{s.email}</span>
                      </span>
                    </button>
                  );
                })}
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
            disabled={!name.trim() || m.isPending}
            onClick={() => m.mutate()}
          >
            Create room
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
