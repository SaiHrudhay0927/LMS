import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bot,
  Crown,
  LogOut,
  Plus,
  Send,
  Sparkles,
  Trash2,
  UserMinus,
  Users,
} from 'lucide-react';
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
import { ConfirmDialog } from '@/components/ui/confirm';
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
  batchId: string;
  hostId: Member;
  memberIds: Member[];
}
interface RoomMsg {
  _id: string;
  body: string;
  isAI: boolean;
  createdAt: string;
  senderId: { _id: string; fullName: string; avatarUrl?: string; role: string };
}

export default function StudentRoomPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [body, setBody] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: room, isLoading, isError } = useQuery({
    queryKey: ['rooms', id],
    enabled: !!id,
    queryFn: async () => (await api.get<Room>(`/rooms/${id}`)).data,
  });

  const { data: messages } = useQuery({
    queryKey: ['rooms', id, 'messages'],
    enabled: !!id,
    queryFn: async () => (await api.get<RoomMsg[]>(`/rooms/${id}/messages`)).data,
    refetchInterval: 5_000,
  });

  useEffect(() => {
    bottomRef.current?.scrollTo({ top: bottomRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages?.length]);

  const send = useMutation({
    mutationFn: async (text: string) =>
      (await api.post<RoomMsg>(`/rooms/${id}/messages`, { body: text })).data,
    onSuccess: () => {
      setBody('');
      qc.invalidateQueries({ queryKey: ['rooms', id, 'messages'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed'),
  });

  const askAi = useMutation({
    mutationFn: async () => (await api.post<RoomMsg>(`/rooms/${id}/ai-prompt`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms', id, 'messages'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'AI failed'),
  });

  const deleteRoom = useMutation({
    mutationFn: async () => (await api.delete(`/rooms/${id}`)).data,
    onSuccess: () => {
      toast.success('Room deleted');
      qc.invalidateQueries({ queryKey: ['rooms'] });
      nav('/student/rooms');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed'),
  });

  const leave = useMutation({
    mutationFn: async () => (await api.delete(`/rooms/${id}/members/${user!._id}`)).data,
    onSuccess: () => {
      toast.success('You left the room');
      qc.invalidateQueries({ queryKey: ['rooms'] });
      nav('/student/rooms');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed'),
  });

  if (isError) {
    return (
      <Empty
        icon={Users}
        title="Room not found or you're not a member"
        description="The host may have removed you, or the room was deleted."
        action={
          <Button asChild variant="outline">
            <Link to="/student/rooms">
              <ArrowLeft className="h-4 w-4" /> Back to rooms
            </Link>
          </Button>
        }
      />
    );
  }
  if (isLoading || !room) return <Skeleton className="h-[500px] rounded-2xl" />;

  const isHost = String(room.hostId._id) === user?._id;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Button asChild size="icon" variant="ghost">
          <Link to="/student/rooms" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate flex items-center gap-2">
            {room.name}
            {isHost && (
              <Badge variant="default">
                <Crown className="h-3 w-3" /> Host
              </Badge>
            )}
          </h1>
          <div className="text-xs text-muted-foreground">
            {room.memberIds.length} member{room.memberIds.length === 1 ? '' : 's'} · host{' '}
            {room.hostId.fullName}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isHost ? (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="text-destructive">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmLeave(true)}>
              <LogOut className="h-4 w-4" /> Leave
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-4 h-[calc(100vh-220px)]">
        {/* Chat panel */}
        <Card className="flex flex-col overflow-hidden">
          <div
            ref={bottomRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin bg-grid bg-fixed"
          >
            {!messages?.length ? (
              <div className="grid place-items-center h-full">
                <div className="text-center max-w-sm">
                  <div className="grid place-items-center h-12 w-12 mx-auto rounded-xl bg-gradient-to-br from-brand-500 to-accent text-white mb-3">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="font-medium">A fresh room.</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Send the first message, or tap "Ask AI" to have the tutor kick off a question.
                  </div>
                </div>
              </div>
            ) : (
              messages.map((m) => {
                if (m.isAI) {
                  return (
                    <motion.div
                      key={m._id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="max-w-[80%] flex gap-2">
                        <div className="shrink-0 grid place-items-center h-8 w-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent text-white shadow">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="rounded-2xl rounded-tl-sm border border-primary/30 bg-primary/[0.07] px-3.5 py-2 text-sm">
                          <div className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-0.5">
                            Pulse Tutor
                          </div>
                          <div className="whitespace-pre-wrap">{m.body}</div>
                        </div>
                      </div>
                    </motion.div>
                  );
                }
                const mine = m.senderId._id === user?._id;
                return (
                  <motion.div
                    key={m._id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[75%] flex gap-2 items-end',
                        mine ? 'flex-row-reverse' : 'flex-row',
                      )}
                    >
                      <Avatar
                        name={m.senderId.fullName}
                        src={m.senderId.avatarUrl}
                        size="sm"
                      />
                      <div
                        className={cn(
                          'rounded-2xl px-3.5 py-2 text-sm shadow-sm',
                          mine
                            ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-br-sm'
                            : 'bg-card border border-border/60 rounded-bl-sm',
                        )}
                      >
                        {!mine && (
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
                            {m.senderId.fullName}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap break-words">{m.body}</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
            {askAi.isPending && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-primary/30 bg-primary/[0.07] px-4 py-3 inline-flex items-center gap-2 text-xs text-primary">
                  <Bot className="h-3 w-3" />
                  <span>Pulse Tutor is thinking</span>
                  <span className="inline-flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1 w-1 rounded-full bg-primary"
                        animate={{ y: [0, -2, 0] }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: i * 0.12,
                        }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border/60 p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (body.trim()) send.mutate(body.trim());
              }}
              className="flex items-end gap-2"
            >
              <Input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type a message…"
                disabled={send.isPending}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => askAi.mutate()}
                disabled={askAi.isPending}
                title="Have the AI tutor analyze the chat and ask a follow-up"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Ask AI</span>
              </Button>
              <Button
                type="submit"
                variant="gradient"
                disabled={!body.trim() || send.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>

        {/* Members panel */}
        <Card className="flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
            <div className="font-semibold text-sm">Members</div>
            {isHost && <AddMemberDialog room={room} />}
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border/40 scrollbar-thin">
            {room.memberIds.map((m) => {
              const isThisHost = String(m._id) === String(room.hostId._id);
              const canRemove = isHost && !isThisHost;
              return (
                <div key={m._id} className="px-4 py-2.5 flex items-center gap-2.5">
                  <Avatar name={m.fullName} src={m.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate flex items-center gap-1">
                      {m.fullName}
                      {isThisHost && <Crown className="h-3 w-3 text-amber-500" />}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{m.email}</div>
                  </div>
                  {canRemove && (
                    <RemoveMember roomId={room._id} userId={m._id} fullName={m.fullName} />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this room?"
        description="All messages will be permanently removed. Members lose access."
        confirmLabel="Delete room"
        destructive
        onConfirm={async () => await deleteRoom.mutateAsync()}
      />
      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Leave this room?"
        description="You won't see new messages until the host adds you back."
        confirmLabel="Leave"
        destructive
        onConfirm={async () => await leave.mutateAsync()}
      />
    </div>
  );
}

function RemoveMember({
  roomId,
  userId,
  fullName,
}: {
  roomId: string;
  userId: string;
  fullName: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const m = useMutation({
    mutationFn: async () => (await api.delete(`/rooms/${roomId}/members/${userId}`)).data,
    onSuccess: () => {
      toast.success('Removed');
      qc.invalidateQueries({ queryKey: ['rooms', roomId] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed'),
  });
  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label="Remove"
        className="h-7 w-7 text-destructive"
      >
        <UserMinus className="h-3.5 w-3.5" />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Remove ${fullName}?`}
        description="They won't see new messages until you add them back."
        confirmLabel="Remove"
        destructive
        onConfirm={async () => await m.mutateAsync()}
      />
    </>
  );
}

function AddMemberDialog({ room }: { room: Room }) {
  const qc = useQueryClient();
  const { data: batches } = useMyBatches();
  const batch = batches?.[0];
  const [open, setOpen] = useState(false);

  const { data: roster } = useQuery({
    queryKey: ['roster', batch?._id, 'add-room', room._id],
    enabled: open && !!batch,
    queryFn: async () =>
      (
        await api.get<{ students: Member[] }>(`/batches/${batch!._id}/roster`)
      ).data,
  });

  const add = useMutation({
    mutationFn: async (userId: string) =>
      (await api.post(`/rooms/${room._id}/members`, { userId })).data,
    onSuccess: () => {
      toast.success('Added');
      qc.invalidateQueries({ queryKey: ['rooms', room._id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed'),
  });

  const inRoom = new Set(room.memberIds.map((m) => m._id));
  const candidates = (roster?.students ?? []).filter((s) => !inRoom.has(s._id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8">
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add batchmates to {room.name}</DialogTitle>
          <DialogDescription>Pick people from your batch who aren't already in.</DialogDescription>
        </DialogHeader>
        {!candidates.length ? (
          <div className="text-sm text-muted-foreground py-3">
            Everyone in your batch is already a member.
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-lg border border-border/60 divide-y divide-border/40 scrollbar-thin">
            {candidates.map((s) => (
              <button
                key={s._id}
                onClick={() => add.mutate(s._id)}
                disabled={add.isPending}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-secondary/60 transition-colors disabled:opacity-50"
              >
                <Avatar name={s.fullName} size="sm" />
                <span className="flex-1 truncate">
                  <span className="block font-medium leading-tight">{s.fullName}</span>
                  <span className="block text-[11px] text-muted-foreground">{s.email}</span>
                </span>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
