import { useEffect, useMemo, useRef, useState } from 'react';
import { Lightbulb, Plus, Loader2, Trash2, ChevronRight, Mic, Send, Link as LinkIcon, Youtube, Instagram, Image as ImageIcon, X, ArrowUpDown, ArrowUp, ArrowDown, Square } from 'lucide-react';
import { AudioRecorderField } from '@/components/creator/AudioRecorderField';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CreatorTabLayout, CreatorEmptyState } from '@/components/creator/CreatorTabLayout';
import { useContentIdeas, type ContentIdea } from '@/hooks/useContentIdeas';
import { useContentCategories } from '@/hooks/useContentCategories';
import { useCreatorAccount } from '@/contexts/CreatorAccountContext';
import { useContentAccounts } from '@/hooks/useContentAccounts';
import { useAudioRecorder, formatDuration } from '@/hooks/useAudioRecorder';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { LinkPreviewCard } from '@/components/creator/LinkPreviewCard';
import { useCategoryOrder } from '@/hooks/useCategoryOrder';

const AUDIO_BUCKET = 'creator-audio';

const ALL = '__all__';

type Attach =
  | { kind: 'instagram'; url: string }
  | { kind: 'youtube'; url: string }
  | { kind: 'audio'; url: string };

function detectUrl(text: string): Attach | null {
  const t = text.trim();
  if (!/^https?:\/\//i.test(t)) return null;
  if (/youtube\.com|youtu\.be/i.test(t)) return { kind: 'youtube', url: t };
  if (/instagram\.com/i.test(t)) return { kind: 'instagram', url: t };
  return null;
}

export default function Ideas() {
  const navigate = useNavigate();
  const { activeAccountId } = useCreatorAccount();
  const { accounts } = useContentAccounts();
  const { ideas, isLoading, createIdea, updateIdea, deleteIdea } = useContentIdeas(activeAccountId);
  const { categories: rawCategories, createCategory } = useContentCategories();
  const { ordered: categories, move: moveCategory } = useCategoryOrder(rawCategories);
  const [reorderOpen, setReorderOpen] = useState(false);

  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editing, setEditing] = useState<ContentIdea | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Edit form
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [igUrl, setIgUrl] = useState('');
  const [ytUrl, setYtUrl] = useState('');
  const [showIg, setShowIg] = useState(false);
  const [showYt, setShowYt] = useState(false);
  const [contextNote, setContextNote] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Composer
  const [draft, setDraft] = useState('');
  const [attach, setAttach] = useState<Attach | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [linkSheet, setLinkSheet] = useState<'instagram' | 'youtube' | null>(null);
  const [linkInput, setLinkInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Inline audio recording (no popup — tap mic to start, tap send to stop+send)
  const { user } = useAuth();
  const audio = useAudioRecorder();
  const [uploading, setUploading] = useState(false);
  const isRecording = audio.state === 'recording';

  // Track mobile keyboard via visualViewport so the composer always sits
  // directly above the keyboard (fixes "input floats to middle / background
  // looks blank while typing" on iOS/Android).
  const [kbOffset, setKbOffset] = useState(0);
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;
    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKbOffset(offset);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  const keyboardOpen = kbOffset > 80;

  const filtered = useMemo(() => {
    if (activeCategory === ALL) return ideas;
    return ideas.filter((i) => i.category_id === activeCategory);
  }, [ideas, activeCategory]);

  const openEdit = (i: ContentIdea) => {
    setEditing(i);
    setTitle(i.title);
    setCategoryId(i.category_id || '');
    setIgUrl(i.instagram_url || '');
    setYtUrl(i.youtube_url || '');
    setShowIg(!!i.instagram_url);
    setShowYt(!!i.youtube_url);
    setContextNote(i.context_note || '');
    setAudioUrl(i.audio_url || null);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editing || !title.trim()) return;
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
    setEditOpen(false);
  };

  const handleNewCategory = async () => {
    if (!newCatName.trim()) return;
    await createCategory(newCatName);
    setNewCatName('');
    setNewCatOpen(false);
  };

  // --- audio: press-and-hold ---
  const holdingRef = useRef(false);
  const startMic = async () => {
    if (!user) { toast.error('Please sign in to record'); return; }
    if (!audio.supported) { toast.error('Audio not supported — try Chrome or Safari iOS 14.3+'); return; }
    holdingRef.current = true;
    await audio.start();
  };
  const releaseMic = async () => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    await handleSend();
  };
  const abortMic = () => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    audio.cancel();
    toast('Cancelled');
  };

  const uploadAudioBlob = async (blob: Blob): Promise<string | null> => {
    if (!user) return null;
    try {
      const id = (crypto as any).randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const path = `${user.id}/${id}.webm`;
      const { error: upErr } = await supabase.storage.from(AUDIO_BUCKET).upload(path, blob, {
        contentType: blob.type || 'audio/webm', upsert: false,
      });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from(AUDIO_BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr) throw signErr;
      return signed.signedUrl;
    } catch (e: any) {
      toast.error(e?.message || 'Could not upload audio');
      return null;
    }
  };

  // --- composer send ---
  const handleSend = async () => {
    // If currently recording → stop, upload, then create topic with audio
    if (isRecording) {
      setUploading(true);
      try {
        const blob = await audio.stop();
        if (!blob) { setUploading(false); return; }
        const url = await uploadAudioBlob(blob);
        if (!url) { setUploading(false); return; }
        const text = draft.trim();
        await createIdea({
          title: text || 'Voice note',
          audio_url: url,
          account_id: activeAccountId || null,
        });
        setDraft('');
        setAttach(null);
      } finally {
        setUploading(false);
        inputRef.current?.blur();
      }
      return;
    }

    const text = draft.trim();
    if (!text && !attach) return;

    // If draft is a pure URL with no other text, use a generic title
    const draftUrl = detectUrl(text);
    const finalTitle = draftUrl ? (draftUrl.kind === 'youtube' ? 'YouTube reference' : 'Instagram reference') : text;
    const fromDraftIg = draftUrl?.kind === 'instagram' ? draftUrl.url : null;
    const fromDraftYt = draftUrl?.kind === 'youtube' ? draftUrl.url : null;

    const payload = {
      title: finalTitle,
      instagram_url: fromDraftIg || (attach?.kind === 'instagram' ? attach.url : null),
      youtube_url: fromDraftYt || (attach?.kind === 'youtube' ? attach.url : null),
      audio_url: attach?.kind === 'audio' ? attach.url : null,
      account_id: activeAccountId || null,
    };

    // Reset immediately for snappy feel; blur so keyboard closes and the
    // topic list re-appears (user explicitly asked for this UX).
    setDraft('');
    setAttach(null);
    inputRef.current?.blur();

    try {
      await createIdea(payload);
    } catch {
      // hook surfaces error toast
    }
  };


  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    const detected = detectUrl(pasted);
    if (detected && !attach) {
      e.preventDefault();
      setAttach(detected);
      setDraft((d) => d); // keep existing
      toast(`${detected.kind === 'youtube' ? 'YouTube' : 'Instagram'} link attached`);
    }
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
          {categories.length > 1 && (
            <button
              onClick={() => setReorderOpen(true)}
              className="shrink-0 ml-auto inline-flex items-center justify-center h-7 w-7 rounded-full border border-border/70 text-muted-foreground hover:text-foreground"
              aria-label="Reorder categories"
              title="Reorder"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <CreatorEmptyState
          icon={Lightbulb}
          headline="No topics yet"
          body="Type a topic below and hit send. Paste an Instagram or YouTube link to attach it instantly."
        />
      ) : (
        (() => {
          const renderCard = (idea: ContentIdea) => {
            const cat = categories.find((c) => c.id === idea.category_id);
            return (
              <div key={idea.id} className="rounded-xl border border-border/50 bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => openEdit(idea)}
                  className="w-full text-left p-3 flex items-start gap-3 active:bg-muted/40 transition-colors"
                >
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
                      {cat ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                          {cat.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border/40">
                          Uncategorized
                        </span>
                      )}
                      {idea.audio_url && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Mic className="h-2.5 w-2.5" /> audio
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                <div className="flex items-center border-t border-border/40 divide-x divide-border/40">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/studio?idea=${idea.id}`); }}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-semibold text-primary active:bg-primary/5"
                  >
                    Script <ChevronRight className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteIdea(idea.id); }}
                    className="flex items-center justify-center gap-1 py-2 px-4 text-xs text-muted-foreground hover:text-destructive active:bg-destructive/5"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          };

          if (activeCategory !== ALL) {
            return <div className="space-y-2 pb-4">{filtered.map(renderCard)}</div>;
          }

          // Grouped view in All
          const groups = categories
            .map((c) => ({ cat: c, items: filtered.filter((i) => i.category_id === c.id) }))
            .filter((g) => g.items.length > 0);
          const uncategorized = filtered.filter((i) => !i.category_id);

          return (
            <div className="space-y-5 pb-4">
              {groups.map(({ cat, items }) => (
                <section key={cat.id} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{cat.name}</h3>
                    <span className="text-[10px] text-muted-foreground/70">{items.length}</span>
                    <div className="flex-1 h-px bg-border/40" />
                  </div>
                  <div className="space-y-2">{items.map(renderCard)}</div>
                </section>
              ))}
              {uncategorized.length > 0 && (
                <section className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Uncategorized</h3>
                    <span className="text-[10px] text-muted-foreground/70">{uncategorized.length}</span>
                    <div className="flex-1 h-px bg-border/40" />
                  </div>
                  <div className="space-y-2">{uncategorized.map(renderCard)}</div>
                </section>
              )}
            </div>
          );
        })()
      )}


      {/* Spacer so the composer + nav don't overlap last item */}
      <div className="h-36" />

      {/* WhatsApp-style composer — pinned above the bottom nav, and lifted
          above the mobile keyboard via visualViewport tracking so text is
          always visible while typing. */}
      <div
        className="fixed left-0 right-0 z-30 px-3 pt-2 bg-background backdrop-blur-md border-t border-border/50"
        style={{
          bottom: keyboardOpen
            ? `${kbOffset}px`
            : 'calc(64px + env(safe-area-inset-bottom, 0px) + 8px)',
          paddingBottom: keyboardOpen ? '8px' : '8px',
          transition: 'bottom 0.15s ease-out',
        }}
      >
        <div className="max-w-lg mx-auto">
          {attach && (
            <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-muted/60 border border-border/50">
              {attach.kind === 'youtube' && <Youtube className="h-3.5 w-3.5 text-red-500 shrink-0" />}
              {attach.kind === 'instagram' && <Instagram className="h-3.5 w-3.5 text-pink-500 shrink-0" />}
              {attach.kind === 'audio' && <Mic className="h-3.5 w-3.5 text-primary shrink-0" />}
              <span className="text-[11px] truncate flex-1">
                {attach.kind === 'audio' ? 'Audio note attached' : attach.url}
              </span>
              <button onClick={() => setAttach(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {isRecording || uploading ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-10 rounded-full bg-card border border-red-500/40 flex items-center px-3 gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-70 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
                <span className="text-xs font-medium text-foreground/80">
                  {uploading ? 'Sending…' : 'Recording — release to send, slide away to cancel'}
                </span>
                <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                  {formatDuration(audio.durationSec)}
                </span>
              </div>
              <button
                type="button"
                onPointerUp={releaseMic}
                onPointerLeave={abortMic}
                onPointerCancel={abortMic}
                disabled={uploading}
                className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110 transition-all disabled:opacity-60"
                aria-label="Release to send"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-3.5 w-3.5 fill-current animate-pulse" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAttachOpen(true)}
                className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center bg-muted hover:bg-muted/80 active:scale-95 transition-all"
                aria-label="Attach link"
              >
                <Plus className="h-5 w-5" />
              </button>
              <Input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onPaste={onPaste}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
                placeholder="Quick capture a topic…"
                className="flex-1 h-10 rounded-full bg-card"
              />
              {(draft.trim() || attach) ? (
                <button
                  type="button"
                  onClick={handleSend}
                  className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center bg-primary text-primary-foreground active:scale-95 transition-all"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); startMic(); }}
                  onPointerUp={releaseMic}
                  onPointerLeave={abortMic}
                  onPointerCancel={abortMic}
                  onContextMenu={(e) => e.preventDefault()}
                  className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center bg-primary text-primary-foreground active:scale-95 transition-all touch-none select-none"
                  aria-label="Hold to record audio note"
                  title="Hold to record"
                >
                  <Mic className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Attach sheet */}
      <Sheet open={attachOpen} onOpenChange={setAttachOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader><SheetTitle>Attach link</SheetTitle></SheetHeader>
          <div className="grid grid-cols-2 gap-2 pt-3 pb-2">
            <AttachOption icon={Instagram} label="Instagram link" onClick={() => { setAttachOpen(false); setLinkInput(''); setLinkSheet('instagram'); }} />
            <AttachOption icon={Youtube} label="YouTube link" onClick={() => { setAttachOpen(false); setLinkInput(''); setLinkSheet('youtube'); }} />
            <AttachOption icon={ImageIcon} label="Photo" disabled subtitle="coming soon" />
          </div>
        </SheetContent>
      </Sheet>

      {/* Link sheet */}
      <Sheet open={!!linkSheet} onOpenChange={(o) => !o && setLinkSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader><SheetTitle>{linkSheet === 'youtube' ? 'YouTube link' : 'Instagram link'}</SheetTitle></SheetHeader>
          <div className="space-y-3 pt-3">
            <Input
              autoFocus
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder={linkSheet === 'youtube' ? 'https://youtube.com/…' : 'https://instagram.com/reel/…'}
            />
            <Button
              className="w-full"
              disabled={!linkInput.trim() || !/^https?:\/\//i.test(linkInput.trim())}
              onClick={() => {
                setAttach({ kind: linkSheet === 'youtube' ? 'youtube' : 'instagram', url: linkInput.trim() });
                setLinkSheet(null);
              }}
            >
              <LinkIcon className="h-4 w-4 mr-1.5" /> Attach link
            </Button>
          </div>
        </SheetContent>
      </Sheet>


      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit topic</DialogTitle>
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
            <div className="space-y-1.5">
              <Label className="text-xs">Attach link</Label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (showIg) { setShowIg(false); setIgUrl(''); } else { setShowIg(true); }
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition',
                    showIg ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Instagram className="h-3.5 w-3.5" /> Instagram
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (showYt) { setShowYt(false); setYtUrl(''); } else { setShowYt(true); }
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition',
                    showYt ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Youtube className="h-3.5 w-3.5" /> YouTube
                </button>
              </div>
              {showIg && (
                <div className="space-y-1 pt-1">
                  <Input autoFocus value={igUrl} onChange={(e) => setIgUrl(e.target.value)} placeholder="https://instagram.com/reel/..." />
                  {igUrl.trim() && /^https?:\/\//i.test(igUrl.trim()) && <LinkPreviewCard url={igUrl.trim()} />}
                </div>
              )}
              {showYt && (
                <div className="space-y-1 pt-1">
                  <Input autoFocus value={ytUrl} onChange={(e) => setYtUrl(e.target.value)} placeholder="https://youtube.com/..." />
                  {ytUrl.trim() && /^https?:\/\//i.test(ytUrl.trim()) && <LinkPreviewCard url={ytUrl.trim()} />}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Context note</Label>
              <Textarea value={contextNote} onChange={(e) => setContextNote(e.target.value)} rows={3} placeholder="Any context or angle for this topic…" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Audio note</Label>
              <AudioRecorderField value={audioUrl} onChange={setAudioUrl} label="Record" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={!title.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reorder categories sheet */}
      <Sheet open={reorderOpen} onOpenChange={setReorderOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
          <SheetHeader>
            <SheetTitle>Reorder categories</SheetTitle>
          </SheetHeader>
          <div className="mt-3 space-y-1.5">
            {categories.map((c, idx) => (
              <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-card">
                <span className="flex-1 text-sm font-medium truncate">{c.name}</span>
                <button
                  onClick={() => moveCategory(c.id, -1)}
                  disabled={idx === 0}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => moveCategory(c.id, 1)}
                  disabled={idx === categories.length - 1}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">No categories yet.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

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

function AttachOption({
  icon: Icon, label, subtitle, onClick, disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  subtitle?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-start gap-1 p-3 rounded-xl border border-border/50 bg-card text-left transition-all',
        disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98] hover:bg-muted/50',
      )}
    >
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-sm font-semibold">{label}</span>
      {subtitle && <span className="text-[10px] text-muted-foreground">{subtitle}</span>}
    </button>
  );
}
