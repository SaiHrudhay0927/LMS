import { FileText, Link2, PlayCircle, Trash2, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface Material {
  _id: string;
  type: 'document' | 'video' | 'link';
  title: string;
  description?: string;
  filePath?: string;
  externalUrl?: string;
  uploadedBy?: { _id: string; fullName: string } | string;
  createdAt: string;
}

function getYoutubeId(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return v;
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2];
    }
  } catch {
    return null;
  }
  return null;
}

export function MaterialItem({
  m,
  canDelete,
  onDelete,
}: {
  m: Material;
  canDelete?: boolean;
  onDelete?(id: string): void;
}) {
  const Icon = m.type === 'document' ? FileText : m.type === 'video' ? PlayCircle : Link2;
  const url = m.filePath || m.externalUrl;
  const youtubeId = m.type === 'video' && m.externalUrl ? getYoutubeId(m.externalUrl) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/60 bg-card overflow-hidden"
    >
      <div className="p-4 flex items-start gap-3">
        <div
          className={
            'grid place-items-center h-10 w-10 rounded-lg shrink-0 ' +
            (m.type === 'video'
              ? 'bg-accent/15 text-accent'
              : m.type === 'document'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-primary/15 text-primary')
          }
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{m.title}</span>
            <Badge variant="outline">{m.type}</Badge>
          </div>
          {m.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{m.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {url && (
            <Button size="sm" variant="outline" asChild>
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </a>
            </Button>
          )}
          {canDelete && onDelete && (
            <Button size="icon" variant="ghost" onClick={() => onDelete(m._id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      {youtubeId && (
        <div className="aspect-video bg-black">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title={m.title}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {m.type === 'document' && m.filePath?.endsWith('.pdf') && (
        <div className="border-t border-border/60">
          <iframe src={m.filePath} className="h-[420px] w-full" title={m.title} />
        </div>
      )}
    </motion.div>
  );
}
