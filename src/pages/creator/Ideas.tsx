import { useMemo, useState } from 'react';
import { Lightbulb, Plus, Loader2, Trash2, ChevronRight, Mic, Pencil } from 'lucide-react';
import { AudioRecorderField } from '@/components/creator/AudioRecorderField';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CreatorTabLayout, CreatorEmptyState } from '@/components/creator/CreatorTabLayout';
import { useContentIdeas, type ContentIdea } from '@/hooks/useContentIdeas';
import { useContentCategories } from '@/hooks/useContentCategories';
import { useCreatorAccount } from '@/contexts/CreatorAccountContext';
import { useContentAccounts } from '@/hooks/useContentAccounts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { LinkPreviewCard } from '@/components/creator/LinkPreviewCard';

const ALL = '__all__';

export default function Ideas() {
  const navigate = useNavigate();
  const { activeAccountId } = useCreatorAccount();
  const { accounts } = useContentAccounts();
  const { ideas, isLoading, createIdea, creating, updateIdea, deleteIdea } = useContentIdeas(activeAccountId);
  const { categories, createCategory } = useContentCategories();

  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editing, setEditing] = useState<ContentIdea | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // form fields
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [igUrl, setIgUrl] = useState('');
  const [ytUrl, setYtUrl] = useState('');
  const [contextNote, setContextNote] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (activeCategory === ALL) return ideas;
    return ideas.filter((i) => i.category_id === activeCategory);
  }, [ideas, activeCategory]);

  const openCreate = () => {
    setEditing(null);
    setTitle(''); setCategoryId(''); setIgUrl(''); setYtUrl(''); setContextNote(''); setAudioUrl(null);
    setFormOpen(true);
  };

  const openEdit = (i: ContentIdea) => {
    setEditing(i);
    setTitle(i.title);
    setCategoryId(i.category_id || '');
    setIgUrl(i.instagram_url || '');
    setYtUrl(i.youtube_url || '');
    setContextNote(i.context_note || '');
    setAudioUrl(i.audio_url || null);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    if (editing) {
      await updateIdea({
        id: editing.id,
        updates: {
          title: title.trim(),
          category_id: categoryId || null,
          instagram_url: igUrl.trim() || null,
          youtube_url: ytUrl.trim() || null,
          context_note: contextNote.trim() || null,
          audio_url: audioUrl,
        },
      });
      toast.success('Topic updated');
    } else {
      await createIdea({
        title,
        category_id: categoryId || null,
        instagram_url: igUrl || null,
        youtube_url: ytUrl || null,
        context_note: contextNote || null,
        audio_url: audioUrl,
        account_id: activeAccountId || null,
      });
    }
    setFormOpen(false);
  };

  const handleNewCategory = async () => {
    if (!newCatName.trim()) return;
    const cat = await createCategory(newCatName);
    setNewCatName('');
    setNewCatOpen(false);
    setCategoryId(cat.id);
  };

  if (accounts.length === 0) {
    return (
      <CreatorTabLayout title="Topics" subtitle="What to make next">
        <CreatorEmptyState
          icon={Lightbulb}
          headline="Add an account first"
          body="Tap the account chip in the header to add your first Instagram or YouTube account, then come back here to capture topics."
        />
      </CreatorTabLayout>
    );
  }

  return (
    <CreatorTabLayout title="Topics" subtitle="What to make next">
      {/* Category chips */}
      <div className="-mx-4 px-4 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 pb-1">
          <CategoryChip label="All" active={activeCategory === ALL} onClick={() => setActiveCategory(ALL)} />
          {categories.map((c) => (
            <CategoryChip key={c.id} label={c.name} active={activeCategory === c.id} onClick={() => setActiveCategory(c.id)} />
          ))}
          <button
            onClick={() => setNewCatOpen(true)}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-border/70 text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" /> New
          </button>
        </div>
      </div>

      <Button onClick={openCreate} className="w-full">
        <Plus className="h-4 w-4 mr-1.5" /> Add topic
      </Button>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <CreatorEmptyState
          icon={Lightbulb}
          headline="No topics yet"
          body="Capture an idea above. Tag it with a category, drop in an Instagram or YouTube reference, and send it to Studio when you're ready to script."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((idea) => {
            const cat = categories.find((c) => c.id === idea.category_id);
            return (
              <div key={idea.id} className="rounded-xl border border-border/50 bg-card p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-snug">{idea.title}</p>
                  {idea.context_note && (
                    <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">{idea.context_note}</p>
                  )}
                  {(idea.youtube_url || idea.instagram_url) && (
                    <div className="mt-2 space-y-1.5">
                      {idea.youtube_url && <LinkPreviewCard url={idea.youtube_url} />}
                      {idea.instagram_url && <LinkPreviewCard url={idea.instagram_url} />}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {cat && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                        {cat.name}
                      </span>
                    )}
                    {idea.audio_url && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Mic className="h-2.5 w-2.5" /> audio
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => navigate(`/studio?idea=${idea.id}`)}>
                    Script<ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                  <div className="flex">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(idea)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteIdea(idea.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit topic' : 'New topic'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's this topic about?" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <div className="flex flex-wrap gap-1.5">
                <CategoryChip label="None" active={!categoryId} onClick={() => setCategoryId('')} />
                {categories.map((c) => (
                  <CategoryChip key={c.id} label={c.name} active={categoryId === c.id} onClick={() => setCategoryId(c.id)} />
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Instagram URL (optional)</Label>
              <Input value={igUrl} onChange={(e) => setIgUrl(e.target.value)} placeholder="https://instagram.com/reel/..." />
              {igUrl.trim() && /^https?:\/\//i.test(igUrl.trim()) && <LinkPreviewCard url={igUrl.trim()} />}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">YouTube URL (optional)</Label>
              <Input value={ytUrl} onChange={(e) => setYtUrl(e.target.value)} placeholder="https://youtube.com/..." />
              {ytUrl.trim() && /^https?:\/\//i.test(ytUrl.trim()) && <LinkPreviewCard url={ytUrl.trim()} />}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Context note (optional)</Label>
              <Textarea value={contextNote} onChange={(e) => setContextNote(e.target.value)} rows={3} placeholder="Any context or angle for this topic…" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Audio note (optional)</Label>
              <AudioRecorderField value={audioUrl} onChange={(url) => setAudioUrl(url)} label="Record" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!title.trim() || creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : (editing ? 'Save' : 'Add topic')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New category dialog */}
      <Dialog open={newCatOpen} onOpenChange={setNewCatOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New category</DialogTitle>
          </DialogHeader>
          <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="e.g. Tutorials" onKeyDown={(e) => e.key === 'Enter' && handleNewCategory()} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewCatOpen(false)}>Cancel</Button>
            <Button onClick={handleNewCategory} disabled={!newCatName.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CreatorTabLayout>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap',
        active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border/50 text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}
