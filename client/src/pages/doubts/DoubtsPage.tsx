import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, HelpCircle, Plus, RotateCcw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/auth/useAuth';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Empty } from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

interface DoubtSummary {
  _id: string;
  title: string;
  description?: string;
  status: 'open' | 'resolved';
  studentId?: { _id: string; fullName: string; avatarUrl?: string };
  responses: any[];
  materialId?: { _id: string; title: string } | null;
  createdAt: string;
}

interface DoubtFull extends DoubtSummary {
  responses: {
    _id: string;
    authorId: { _id: string; fullName: string; role: string };
    body: string;
    at: string;
  }[];
}

export default function DoubtsPage() {
  const { user } = useAuth();
  const role = user!.role;
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<'open' | 'resolved' | ''>('open');
  const [selectedId, setSelectedId] = useState<string | null>(params.get('id'));

  const { data: doubts, isLoading } = useQuery({
    queryKey: ['doubts', { status }],
    queryFn: async () =>
      (await api.get<DoubtSummary[]>('/doubts', { params: status ? { status } : {} })).data,
  });

  useEffect(() => {
    if (!selectedId && doubts?.length) setSelectedId(doubts[0]._id);
  }, [doubts, selectedId]);

  useEffect(() => {
    if (selectedId) setParams({ id: selectedId });
    else setParams({});
  }, [selectedId, setParams]);

  const isStudent = role === 'student';

  return (
    <div>
      <PageHeader
        title={isStudent ? 'My doubts' : 'Doubt inbox'}
        subtitle={
          isStudent
            ? 'Ask anything — your coordinator will see it instantly.'
            : 'Replies and resolutions land here in real time.'
        }
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border/60 p-0.5 text-xs">
              {(['open', 'resolved', ''] as const).map((s) => (
                <button
                  key={s || 'all'}
                  onClick={() => setStatus(s)}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-colors',
                    status === s
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {s || 'all'}
                </button>
              ))}
            </div>
            {isStudent && <RaiseDoubtDialog />}
          </div>
        }
      />

      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1 scrollbar-thin">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))
          ) : !doubts?.length ? (
            <Empty
              icon={HelpCircle}
              title={isStudent ? 'No doubts yet' : 'Inbox zero'}
              description={
                isStudent ? 'Have a question? Raise one above.' : 'No doubts match this filter.'
              }
            />
          ) : (
            doubts.map((d) => (
              <button
                key={d._id}
                onClick={() => setSelectedId(d._id)}
                className={cn(
                  'w-full text-left rounded-xl border bg-card p-3 transition-all hover:border-primary/40',
                  selectedId === d._id
                    ? 'border-primary/60 ring-2 ring-primary/15'
                    : 'border-border/60',
                )}
              >
                <div className="flex items-center gap-2">
                  <Badge variant={d.status === 'open' ? 'warning' : 'success'}>{d.status}</Badge>
                  <span className="text-[11px] text-muted-foreground ml-auto">
                    {d.responses?.length ?? 0} replies
                  </span>
                </div>
                <div className="font-medium text-sm mt-1.5 line-clamp-1">{d.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {d.studentId?.fullName ?? '—'}
                </div>
              </button>
            ))
          )}
        </div>

        <AnimatePresence mode="wait">
          {selectedId ? (
            <DoubtThread key={selectedId} id={selectedId} />
          ) : (
            <Card className="grid place-items-center text-sm text-muted-foreground p-10 min-h-[400px]">
              Select a doubt to view the thread.
            </Card>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DoubtThread({ id }: { id: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [body, setBody] = useState('');

  const { data: d, isLoading } = useQuery({
    queryKey: ['doubts', 'detail', id],
    queryFn: async () => (await api.get<DoubtFull>(`/doubts/${id}`)).data,
  });

  const reply = useMutation({
    mutationFn: async () => (await api.post(`/doubts/${id}/responses`, { body })).data,
    onSuccess: () => {
      setBody('');
      qc.invalidateQueries({ queryKey: ['doubts', 'detail', id] });
      qc.invalidateQueries({ queryKey: ['doubts'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed'),
  });

  const resolve = useMutation({
    mutationFn: async () => (await api.post(`/doubts/${id}/resolve`)).data,
    onSuccess: () => {
      toast.success('Marked resolved');
      qc.invalidateQueries({ queryKey: ['doubts', 'detail', id] });
      qc.invalidateQueries({ queryKey: ['doubts'] });
    },
  });
  const reopen = useMutation({
    mutationFn: async () => (await api.post(`/doubts/${id}/reopen`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doubts', 'detail', id] });
      qc.invalidateQueries({ queryKey: ['doubts'] });
    },
  });

  if (isLoading || !d) return <Skeleton className="h-[400px] rounded-2xl" />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col"
    >
      <Card className="flex flex-col min-h-[400px]">
        <div className="p-5 border-b border-border/60 flex items-start gap-3">
          <Avatar name={d.studentId?.fullName ?? '?'} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-lg">{d.title}</h2>
              <Badge variant={d.status === 'open' ? 'warning' : 'success'}>{d.status}</Badge>
              {d.materialId && <Badge variant="outline">on {d.materialId.title}</Badge>}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              raised by {d.studentId?.fullName ?? '—'}
            </div>
            {d.description && (
              <p className="text-sm mt-3 whitespace-pre-wrap">{d.description}</p>
            )}
          </div>
          <div>
            {d.status === 'open' ? (
              <Button size="sm" variant="outline" onClick={() => resolve.mutate()}>
                <CheckCircle2 className="h-4 w-4" /> Resolve
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => reopen.mutate()}>
                <RotateCcw className="h-4 w-4" /> Reopen
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-3 p-5 overflow-y-auto scrollbar-thin">
          {d.responses.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-6">
              No replies yet — be the first.
            </div>
          )}
          {d.responses.map((r) => {
            const isMe = String(r.authorId?._id) === String(user!._id);
            return (
              <div
                key={r._id}
                className={cn('flex gap-3', isMe ? 'flex-row-reverse' : 'flex-row')}
              >
                <Avatar name={r.authorId?.fullName ?? '?'} size="sm" />
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm',
                    isMe
                      ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white'
                      : 'bg-secondary',
                  )}
                >
                  <div
                    className={cn(
                      'text-[10px] uppercase tracking-wider mb-0.5',
                      isMe ? 'text-white/70' : 'text-muted-foreground',
                    )}
                  >
                    {r.authorId?.fullName} · {r.authorId?.role}
                  </div>
                  <div className="whitespace-pre-wrap">{r.body}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-border/60">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (body.trim()) reply.mutate();
            }}
            className="flex items-end gap-2"
          >
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type a reply…"
              className="min-h-[44px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (body.trim()) reply.mutate();
                }
              }}
            />
            <Button type="submit" variant="gradient" disabled={!body.trim() || reply.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </motion.div>
  );
}

function RaiseDoubtDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const m = useMutation({
    mutationFn: async () => (await api.post('/doubts', { title, description })).data,
    onSuccess: () => {
      toast.success('Doubt raised');
      qc.invalidateQueries({ queryKey: ['doubts'] });
      setOpen(false);
      setTitle('');
      setDescription('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed'),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient">
          <Plus className="h-4 w-4" /> Raise doubt
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Raise a doubt</DialogTitle>
          <DialogDescription>Your coordinator gets notified instantly.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's the question?" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Details</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add context, links, or where you got stuck…"
              className="min-h-[120px]"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant="gradient" disabled={!title.trim() || m.isPending} onClick={() => m.mutate()}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
