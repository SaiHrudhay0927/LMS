import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Link2, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useMyBatches } from '@/hooks/useBatches';
import { PageHeader } from '@/components/layout/PageHeader';
import { BatchSwitcher } from '@/components/BatchSwitcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
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
import { Material, MaterialItem } from '@/pages/content/MaterialItem';

export default function CoordinatorContent() {
  const { data: batches, isLoading: bLoading } = useMyBatches();
  const [batchId, setBatchId] = useState<string>('');
  const [pendingDelete, setPendingDelete] = useState<Material | null>(null);

  const activeBatchId = batchId || batches?.[0]?._id || '';

  const qc = useQueryClient();
  const { data: materials, isLoading } = useQuery({
    queryKey: ['materials', activeBatchId],
    enabled: !!activeBatchId,
    queryFn: async () =>
      (await api.get<Material[]>('/materials', { params: { batchId: activeBatchId } })).data,
  });

  const remove = useMutation({
    mutationFn: async (id: string) =>
      (await api.delete<{ ok: true; deletedId: string }>(`/materials/${id}`)).data,
    onSuccess: (res) => {
      toast.success('Deleted from database');
      qc.invalidateQueries({ queryKey: ['materials'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Delete failed'),
  });

  const grouped = useMemo(() => {
    const all = materials ?? [];
    return {
      document: all.filter((m) => m.type === 'document'),
      video: all.filter((m) => m.type === 'video'),
      link: all.filter((m) => m.type === 'link'),
    };
  }, [materials]);

  if (bLoading) {
    return <Skeleton className="h-40 rounded-2xl" />;
  }
  if (!batches?.length) {
    return (
      <Empty
        icon={BookOpen}
        title="No batches assigned"
        description="Ask an admin to assign you to a batch."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Content"
        subtitle="Upload docs, link external videos and articles."
        actions={
          <div className="flex items-center gap-2">
            {batches.length > 1 && (
              <BatchSwitcher batches={batches} value={activeBatchId} onChange={setBatchId} />
            )}
            <NewLinkDialog batchId={activeBatchId} />
            <UploadDialog batchId={activeBatchId} />
          </div>
        }
      />

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : !materials?.length ? (
        <Empty
          icon={BookOpen}
          title="Nothing here yet"
          description="Upload a syllabus or paste a video link to get the cohort started."
        />
      ) : (
        <div className="space-y-8">
          {(['document', 'video', 'link'] as const).map((type) =>
            grouped[type].length ? (
              <section key={type}>
                <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground mb-3">
                  {type === 'document' ? 'Documents' : type === 'video' ? 'Videos' : 'Links'}
                </h3>
                <div className="grid gap-3">
                  {grouped[type].map((m) => (
                    <MaterialItem
                      key={m._id}
                      m={m}
                      canDelete
                      onDelete={() => setPendingDelete(m)}
                    />
                  ))}
                </div>
              </section>
            ) : null,
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Delete material?"
        description={
          <span>
            <strong>{pendingDelete?.title}</strong> will be permanently removed from MongoDB
            {pendingDelete?.filePath ? ' along with its uploaded file' : ''}. This can't be undone.
          </span>
        }
        confirmLabel="Delete from database"
        destructive
        onConfirm={async () => {
          if (pendingDelete) await remove.mutateAsync(pendingDelete._id);
        }}
      />
    </div>
  );
}

function NewLinkDialog({ batchId }: { batchId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'link' | 'video'>('link');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');

  const m = useMutation({
    mutationFn: async () =>
      (await api.post('/materials/url', { batchId, type, title, description, externalUrl })).data,
    onSuccess: () => {
      toast.success('Saved');
      qc.invalidateQueries({ queryKey: ['materials', batchId] });
      setOpen(false);
      setTitle('');
      setDescription('');
      setExternalUrl('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed'),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Link2 className="h-4 w-4" /> Add link
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add link or video</DialogTitle>
          <DialogDescription>YouTube links render inline for students.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <Select value={type} onChange={(e) => setType(e.target.value as any)}>
                <option value="link">Link / article</option>
                <option value="video">Video</option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">URL</label>
            <Input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Description (optional)
            </label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            variant="gradient"
            disabled={m.isPending || !title || !externalUrl}
            onClick={() => m.mutate()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadDialog({ batchId }: { batchId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error('Choose a file');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('batchId', batchId);
    fd.append('title', title);
    fd.append('description', description);
    setBusy(true);
    try {
      await api.post('/materials/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Uploaded');
      qc.invalidateQueries({ queryKey: ['materials', batchId] });
      setOpen(false);
      setTitle('');
      setDescription('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient">
          <Upload className="h-4 w-4" /> Upload doc
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>PDFs render inline for students. Max 25 MB.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Description (optional)
            </label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">File</label>
            <Input ref={fileRef} type="file" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant="gradient" disabled={busy || !title} onClick={submit}>
            {busy ? 'Uploading…' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
