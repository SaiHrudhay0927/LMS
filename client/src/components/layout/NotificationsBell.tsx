import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/auth/useAuth';
import { Button } from '@/components/ui/button';

interface Notif {
  _id: string;
  type: string;
  payload: any;
  isRead: boolean;
  createdAt: string;
}

export function NotificationsBell() {
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: items } = useQuery({
    queryKey: ['notifications'],
    enabled: !!user,
    queryFn: async () => (await api.get<Notif[]>('/notifications')).data,
    refetchInterval: 30_000,
  });

  const unread = items?.filter((n) => !n.isRead).length ?? 0;

  const markAll = useMutation({
    mutationFn: async () => (await api.post('/notifications/mark-all-read')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (!user) return null;

  const handleClick = (n: Notif) => {
    if (n.payload?.doubtId) {
      const base = user.role === 'student' ? '/student/doubts' : '/coordinator/doubts';
      nav(`${base}?id=${n.payload.doubtId}`);
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 grid place-items-center h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <button
              aria-hidden
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-20 cursor-default"
            />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute right-0 mt-2 w-80 rounded-xl border border-border/60 bg-popover shadow-xl z-30"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
                <span className="font-semibold text-sm">Notifications</span>
                {unread > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => markAll.mutate()}
                  >
                    <CheckCheck className="h-3 w-3" /> Mark all read
                  </Button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {!items?.length ? (
                  <div className="text-center text-xs text-muted-foreground py-8 px-4">
                    You're all caught up.
                  </div>
                ) : (
                  items.map((n) => (
                    <button
                      key={n._id}
                      onClick={() => handleClick(n)}
                      className={
                        'block w-full text-left px-3 py-2.5 border-b border-border/30 hover:bg-secondary/60 transition-colors ' +
                        (n.isRead ? '' : 'bg-primary/[0.04]')
                      }
                    >
                      <div className="flex items-center gap-2">
                        {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary" />}
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {labelFor(n.type)}
                        </span>
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <div className="text-sm mt-0.5 line-clamp-2">
                        {n.payload?.title ?? n.type}
                      </div>
                      {n.payload?.studentName && (
                        <div className="text-xs text-muted-foreground">
                          from {n.payload.studentName}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function labelFor(t: string) {
  if (t === 'doubt.new') return 'New doubt';
  if (t === 'doubt.reply') return 'Doubt reply';
  return t;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
