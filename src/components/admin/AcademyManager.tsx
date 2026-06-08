import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import {
  useAcademyCategories,
  useAcademyTutorials,
  type AcademyTutorial,
  slugify,
  formatDuration,
} from '@/hooks/useAcademy';
import {
  uploadAcademyFile,
  getVideoDurationSeconds,
} from '@/lib/r2AcademyUpload';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  PlayCircle,
  ImageIcon,
  Smartphone,
  Monitor,
} from 'lucide-react';

const EMPTY: Partial<AcademyTutorial> & { _videoFile?: File; _thumbFile?: File } = {
  title: '',
  slug: '',
  description: '',
  video_url: '',
  thumbnail_url: '',
  category: 'getting-started',
  order_index: 1,
  duration_seconds: 0,
  is_published: true,
  format: 'mobile',
};

export function AcademyManager() {
  const { categories, refetch: refetchCats } = useAcademyCategories();
  const { tutorials, loading, refetch } = useAcademyTutorials({ adminMode: true });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  const grouped = useMemo(() => {
    const byCat = new Map<string, AcademyTutorial[]>();
    tutorials.forEach((t) => {
      const arr = byCat.get(t.category) ?? [];
      arr.push(t);
      byCat.set(t.category, arr);
    });
    const ordered = categories
      .map((c) => ({ ...c, items: (byCat.get(c.category) ?? []).slice() }))
      .filter((c) => true);
    // include any tutorial whose category isn't in category table
    const known = new Set(categories.map((c) => c.category));
    const orphans = tutorials.filter((t) => !known.has(t.category));
    if (orphans.length) {
      ordered.push({
        category: '__other',
        label: 'Other',
        order_index: 999,
        items: orphans,
      });
    }
    return ordered;
  }, [tutorials, categories]);

  const openNew = () => {
    setEditing({ ...EMPTY });
    setOpen(true);
  };

  const openEdit = (t: AcademyTutorial) => {
    setEditing({ ...t });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!editing.title?.trim()) {
      toast.error('Title is required');
      return;
    }
    const slug = (editing.slug || slugify(editing.title || '')).trim();
    if (!slug) {
      toast.error('Slug is required');
      return;
    }
    setSaving(true);
    try {
      let video_url = editing.video_url || '';
      let thumbnail_url = editing.thumbnail_url || '';
      let duration_seconds = editing.duration_seconds || 0;

      if (editing._videoFile) {
        setUploadPct(0);
        if (!duration_seconds) {
          duration_seconds = await getVideoDurationSeconds(editing._videoFile);
        }
        const res = await uploadAcademyFile({
          file: editing._videoFile,
          purpose: 'academy-video',
          onProgress: setUploadPct,
        });
        video_url = res.publicUrl || res.objectKey;
      }
      if (editing._thumbFile) {
        const res = await uploadAcademyFile({
          file: editing._thumbFile,
          purpose: 'academy-thumbnail',
        });
        thumbnail_url = res.publicUrl || res.objectKey;
      }
      setUploadPct(null);

      const payload = {
        title: editing.title!.trim(),
        slug,
        description: editing.description || '',
        video_url,
        thumbnail_url: thumbnail_url || null,
        category: editing.category || 'getting-started',
        order_index: Number(editing.order_index) || 0,
        duration_seconds: Number(duration_seconds) || 0,
        is_published: !!editing.is_published,
      };

      if (editing.id) {
        const { error } = await supabase
          .from('academy_tutorials' as any)
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Tutorial updated');
      } else {
        const { error } = await supabase
          .from('academy_tutorials' as any)
          .insert(payload);
        if (error) throw error;
        toast.success('Tutorial added');
      }

      setOpen(false);
      await refetch();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
      setUploadPct(null);
    }
  };

  const handleDelete = async (t: AcademyTutorial) => {
    if (!confirm(`Delete "${t.title}"?`)) return;
    const { error } = await supabase
      .from('academy_tutorials' as any)
      .delete()
      .eq('id', t.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Deleted');
      refetch();
    }
  };

  const reorderTutorial = async (t: AcademyTutorial, dir: -1 | 1) => {
    const newIndex = (t.order_index || 0) + dir;
    const { error } = await supabase
      .from('academy_tutorials' as any)
      .update({ order_index: newIndex })
      .eq('id', t.id);
    if (error) toast.error(error.message);
    else refetch();
  };

  const reorderCategory = async (cat: string, dir: -1 | 1) => {
    const c = categories.find((x) => x.category === cat);
    if (!c) return;
    const { error } = await supabase
      .from('academy_category_order' as any)
      .update({ order_index: (c.order_index || 0) + dir })
      .eq('category', cat);
    if (error) toast.error(error.message);
    else refetchCats();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Enarsia Academy</h3>
          <p className="text-xs text-muted-foreground">
            Manage tutorial videos, categories, and ordering.
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> New
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No tutorials yet. Click "New" to add one.
        </p>
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => (
            <div
              key={g.category}
              className="rounded-xl border border-border/50 bg-card p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                    {g.label || g.category}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    ({g.items.length})
                  </span>
                </div>
                {g.category !== '__other' && (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => reorderCategory(g.category, -1)}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => reorderCategory(g.category, 1)}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {g.items.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-1">No tutorials.</p>
              ) : (
                <ul className="space-y-1.5">
                  {g.items.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="h-10 w-14 rounded bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                        {t.thumbnail_url ? (
                          <img
                            src={t.thumbnail_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{t.title}</span>
                          {!t.is_published && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              Draft
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          #{t.order_index} · {formatDuration(t.duration_seconds)} ·{' '}
                          <code className="text-[10px]">{t.slug}</code>
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => reorderTutorial(t, -1)}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => reorderTutorial(t, 1)}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => openEdit(t)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(t)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing.id ? 'Edit tutorial' : 'New tutorial'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Title *</label>
              <Input
                value={editing.title || ''}
                onChange={(e) =>
                  setEditing((s) => ({
                    ...s,
                    title: e.target.value,
                    slug: s.id ? s.slug : slugify(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium">Slug (URL)</label>
              <Input
                value={editing.slug || ''}
                onChange={(e) =>
                  setEditing((s) => ({ ...s, slug: slugify(e.target.value) }))
                }
                placeholder="welcome-to-enarsia"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Public URL: /academy/{editing.slug || 'your-slug'}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium">Description</label>
              <Textarea
                rows={3}
                value={editing.description || ''}
                onChange={(e) =>
                  setEditing((s) => ({ ...s, description: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Category</label>
                <Select
                  value={editing.category}
                  onValueChange={(v) => setEditing((s) => ({ ...s, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.category} value={c.category}>
                        {c.label || c.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Order</label>
                <Input
                  type="number"
                  value={editing.order_index ?? 0}
                  onChange={(e) =>
                    setEditing((s) => ({
                      ...s,
                      order_index: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">Video file</label>
              <label className="mt-1 flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-border bg-muted/30 hover:bg-muted/60 px-3 py-2.5 transition-colors">
                <PlayCircle className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs flex-1 truncate">
                  {editing._videoFile?.name || (editing.video_url ? 'Replace current video' : 'Choose video file (mp4, webm, mov)')}
                </span>
                <span className="text-[10px] font-semibold px-2 py-1 rounded bg-primary text-primary-foreground">Browse</span>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(e) =>
                    setEditing((s) => ({ ...s, _videoFile: e.target.files?.[0] }))
                  }
                />
              </label>
              {editing.video_url && !editing._videoFile && (
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  Current: {editing.video_url}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium">Thumbnail image</label>
              <label className="mt-1 flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-border bg-muted/30 hover:bg-muted/60 px-3 py-2.5 transition-colors">
                <ImageIcon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs flex-1 truncate">
                  {editing._thumbFile?.name || (editing.thumbnail_url ? 'Replace current thumbnail' : 'Choose thumbnail (jpg, png, webp)')}
                </span>
                <span className="text-[10px] font-semibold px-2 py-1 rounded bg-primary text-primary-foreground">Browse</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) =>
                    setEditing((s) => ({ ...s, _thumbFile: e.target.files?.[0] }))
                  }
                />
              </label>
              {editing.thumbnail_url && !editing._thumbFile && (
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  Current: {editing.thumbnail_url}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Duration (sec)</label>
                <Input
                  type="number"
                  value={editing.duration_seconds ?? 0}
                  onChange={(e) =>
                    setEditing((s) => ({
                      ...s,
                      duration_seconds: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="flex items-end gap-2">
                <Switch
                  checked={!!editing.is_published}
                  onCheckedChange={(v) =>
                    setEditing((s) => ({ ...s, is_published: v }))
                  }
                />
                <span className="text-xs">Published</span>
              </div>
            </div>

            {uploadPct !== null && (
              <div className="text-xs text-muted-foreground">
                Uploading video… {uploadPct}%
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
