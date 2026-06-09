import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, RefreshCw, Send, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Role = 'user' | 'assistant';
interface Msg {
  role: Role;
  content: string;
}

const GREETING: Msg = {
  role: 'assistant',
  content:
    "Hi — I'm your Pulse Tutor. Ask me to explain a concept, walk through a problem, or debug some code. What are we working on?",
};

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, open]);

  const ask = useMutation({
    mutationFn: async (history: Msg[]) => {
      const trimmed = history.slice(-12); // last 12 turns to keep cost down
      const { data } = await api.post<{ reply: string }>('/ai/chat', { messages: trimmed });
      return data.reply;
    },
    onSuccess: (reply) => {
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error ?? 'AI request failed';
      toast.error(msg);
      // remove the optimistic user message so they can retry
      setMessages((m) => (m[m.length - 1]?.role === 'user' ? m.slice(0, -1) : m));
    },
  });

  const send = () => {
    const text = input.trim();
    if (!text || ask.isPending) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    ask.mutate(next.filter((m) => m.role !== 'assistant' || m !== GREETING));
  };

  const reset = () => {
    setMessages([GREETING]);
    setInput('');
  };

  return (
    <>
      {/* Floating launcher */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open AI tutor"
        className={cn(
          'fixed bottom-5 right-5 z-40 grid place-items-center h-14 w-14 rounded-full text-white shadow-xl shadow-primary/40',
          'bg-gradient-to-br from-brand-500 to-accent',
          open && 'opacity-0 pointer-events-none',
        )}
      >
        <Sparkles className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-background" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-5 right-5 z-40 w-[92vw] max-w-[400px] h-[70vh] max-h-[640px] flex flex-col rounded-2xl border border-border/60 bg-card shadow-2xl shadow-black/20 overflow-hidden"
          >
            {/* Header */}
            <div className="relative px-4 py-3 border-b border-border/60 bg-gradient-to-r from-brand-500/10 via-card to-accent/10">
              <div className="flex items-center gap-2.5">
                <div className="grid place-items-center h-9 w-9 rounded-lg bg-gradient-to-br from-brand-500 to-accent text-white shadow">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="leading-tight min-w-0 flex-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    Pulse Tutor
                    <span className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-medium">
                      online
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Stuck on something? Just ask.
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={reset}
                  aria-label="Reset conversation"
                  title="Start over"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
              {messages.map((m, i) => (
                <Bubble key={i} role={m.role} content={m.content} />
              ))}
              {ask.isPending && <TypingBubble />}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="p-3 border-t border-border/60 flex items-end gap-2"
            >
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything…"
                className="min-h-[44px] max-h-32 text-sm resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                disabled={ask.isPending}
              />
              <Button
                type="submit"
                variant="gradient"
                size="icon"
                disabled={!input.trim() || ask.isPending}
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <div className="px-3 pb-2 text-[10px] text-muted-foreground text-center">
              Tip: paste code or error messages for sharper help. Press Enter to send,
              Shift+Enter for newline.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Bubble({ role, content }: { role: Role; content: string }) {
  const isUser = role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words',
          isUser
            ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-br-sm'
            : 'bg-secondary text-foreground rounded-bl-sm',
        )}
      >
        <FormattedContent content={content} />
      </div>
    </motion.div>
  );
}

function TypingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex justify-start"
    >
      <div className="bg-secondary rounded-2xl rounded-bl-sm px-4 py-3 inline-flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
            animate={{ y: [0, -3, 0] }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// Very light Markdown-ish rendering: handles code fences, inline code, and
// preserves whitespace. No external Markdown dep to keep things small.
function FormattedContent({ content }: { content: string }) {
  const parts: React.ReactNode[] = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(content)) !== null) {
    if (m.index > last) {
      parts.push(<InlineText key={`t${i++}`} text={content.slice(last, m.index)} />);
    }
    parts.push(
      <pre
        key={`c${i++}`}
        className="my-2 overflow-x-auto rounded-lg bg-background/60 border border-border/40 px-3 py-2 text-[12px] font-mono leading-relaxed"
      >
        <code>{m[2]}</code>
      </pre>,
    );
    last = m.index + m[0].length;
  }
  if (last < content.length) {
    parts.push(<InlineText key={`t${i++}`} text={content.slice(last)} />);
  }
  return <>{parts}</>;
}

function InlineText({ text }: { text: string }) {
  // Render inline `code` while keeping the rest as plain text.
  const out: React.ReactNode[] = [];
  const re = /`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <code
        key={i++}
        className="px-1 py-0.5 rounded bg-background/60 border border-border/40 font-mono text-[12px]"
      >
        {m[1]}
      </code>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
