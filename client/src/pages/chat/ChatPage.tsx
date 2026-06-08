import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MessageSquare, Search, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/auth/useAuth';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Empty } from '@/components/ui/empty';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Contact {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string;
  unread: number;
}
interface Msg {
  _id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export default function ChatPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['messages', 'contacts'],
    queryFn: async () => (await api.get<Contact[]>('/messages/contacts')).data,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!activeId && contacts?.length) setActiveId(contacts[0]._id);
  }, [contacts, activeId]);

  const filtered = contacts?.filter((c) =>
    !q ? true : c.fullName.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="Real-time 1:1 chat with your batchmates and coordinator."
      />
      <div className="grid lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-200px)]">
        <Card className="flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border/60">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="pl-9 h-9"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : !filtered?.length ? (
              <Empty icon={MessageSquare} title="No one to chat with yet" className="m-3" />
            ) : (
              filtered.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setActiveId(c._id)}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-2.5 text-left border-b border-border/40 hover:bg-secondary/50 transition-colors',
                    activeId === c._id && 'bg-secondary/70',
                  )}
                >
                  <Avatar name={c.fullName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{c.fullName}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.role}</div>
                  </div>
                  {c.unread > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                      {c.unread}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </Card>

        {activeId && user ? (
          <Conversation otherId={activeId} myId={user._id} />
        ) : (
          <Card className="grid place-items-center text-sm text-muted-foreground p-10">
            Pick someone to start chatting.
          </Card>
        )}
      </div>
    </div>
  );
}

function Conversation({ otherId, myId }: { otherId: string; myId: string }) {
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [body, setBody] = useState('');

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', 'thread', otherId],
    queryFn: async () => (await api.get<Msg[]>(`/messages/${otherId}`)).data,
    refetchInterval: 8000,
  });
  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['messages', 'contacts'],
    queryFn: async () => (await api.get<Contact[]>('/messages/contacts')).data,
  });
  const other = contacts?.find((c) => c._id === otherId);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages?.length]);

  const send = useMutation({
    mutationFn: async () =>
      (await api.post('/messages', { recipientId: otherId, body })).data,
    onSuccess: () => {
      setBody('');
      qc.invalidateQueries({ queryKey: ['messages', 'thread', otherId] });
      qc.invalidateQueries({ queryKey: ['messages', 'contacts'] });
    },
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
      <Card className="flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-border/60 flex items-center gap-3">
          {other && <Avatar name={other.fullName} />}
          <div>
            <div className="font-semibold">{other?.fullName ?? '…'}</div>
            <div className="text-xs text-muted-foreground">{other?.email}</div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin bg-grid bg-fixed"
        >
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-2xl max-w-[60%]" />
              ))}
            </div>
          ) : !messages?.length ? (
            <div className="text-center text-sm text-muted-foreground py-10">
              No messages yet — say hi.
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.senderId === myId;
              return (
                <motion.div
                  key={m._id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[70%] rounded-2xl px-3.5 py-2 text-sm shadow-sm',
                      mine
                        ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white'
                        : 'bg-card border border-border/60',
                    )}
                  >
                    <div className="whitespace-pre-wrap">{m.body}</div>
                    <div
                      className={cn(
                        'mt-0.5 text-[10px]',
                        mine ? 'text-white/70 text-right' : 'text-muted-foreground',
                      )}
                    >
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {mine && (m.readAt ? ' · read' : ' · sent')}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (body.trim()) send.mutate();
          }}
          className="p-3 border-t border-border/60 flex items-center gap-2"
        >
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type a message…"
          />
          <Button type="submit" variant="gradient" disabled={!body.trim() || send.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </motion.div>
  );
}
