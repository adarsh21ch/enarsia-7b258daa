import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotes, NoteBlock } from '@/hooks/useNotes';
import { useNoteAttachments } from '@/hooks/useNoteAttachments';
import { RichTextEditor } from '@/components/notes/RichTextEditor';
import { NoteToolbar } from '@/components/notes/NoteToolbar';
import { AudioPlayer, useAudioRecording } from '@/components/notes/AudioRecorder';
import { ArrowLeft, Pin, PinOff, Trash2, MoreVertical, FolderOpen, Loader2, Check, Square as StopIcon, AlertCircle, NotebookPen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function NoteEditor() {
  const { id } = useParams<{ id: string }>();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { deleteNote } = useNotes();
  const { attachments, uploadAttachment, deleteAttachment } = useNoteAttachments(id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [folderInput, setFolderInput] = useState('');
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const ensureSessionUserId = useCallback(async () => {
    let activeSession = session;
    if (!activeSession?.access_token) {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      activeSession = data.session;
    }
    if (!activeSession?.access_token) {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      activeSession = data.session;
    }
    if (!activeSession?.user?.id) throw new Error('SESSION_EXPIRED');
    return activeSession.user.id;
  }, [session]);

  const noteQuery = useQuery({
    queryKey: ['note', session?.access_token ? user?.id : null, id],
    queryFn: async () => {
      const userId = await ensureSessionUserId();
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id!)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        content: (Array.isArray(data.content) ? data.content : []) as unknown as NoteBlock[],
      };
    },
    enabled: !!id && !!user?.id && !!session?.access_token,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  const note = noteQuery.data ?? null;

  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [colorLabel, setColorLabel] = useState('default');
  const [isPinned, setIsPinned] = useState(false);
  const [folder, setFolder] = useState('General');
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const initialized = useRef(false);

  const latestRef = useRef({ title, blocks, colorLabel, isPinned, folder });
  useEffect(() => {
    latestRef.current = { title, blocks, colorLabel, isPinned, folder };
  });

  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();
  const lastSavedJson = useRef('');
  const isNavigatingBackRef = useRef(false);

  const persistSnapshot = useCallback(
    async (
      snapshot: { title: string; blocks: NoteBlock[]; colorLabel: string; isPinned: boolean; folder: string },
      force = false
    ) => {
      if (!id) return;
      const currentUserId = await ensureSessionUserId();
      const json = JSON.stringify(snapshot);
      if (!force && json === lastSavedJson.current) return;

      const { data, error } = await supabase
        .from('notes')
        .update({
          title: snapshot.title,
          content: snapshot.blocks as any,
          color_label: snapshot.colorLabel,
          is_pinned: snapshot.isPinned,
          folder: snapshot.folder,
        })
        .eq('id', id)
        .eq('user_id', currentUserId)
        .select('*')
        .single();

      if (error) throw error;
      lastSavedJson.current = json;
      queryClient.setQueryData(['note', currentUserId, id], {
        ...data,
        content: (Array.isArray(data.content) ? data.content : []) as unknown as NoteBlock[],
      });
      queryClient.invalidateQueries({ queryKey: ['notes', currentUserId] });
    },
    [id, ensureSessionUserId, queryClient]
  );

  useEffect(() => {
    initialized.current = false;
    setHasSaved(false);
    setSaveError(false);
    setActiveBlockIndex(0);
    lastSavedJson.current = '';
    isNavigatingBackRef.current = false;
  }, [id]);

  useEffect(() => {
    if (!note || initialized.current) return;
    const t = note.title || '';
    const b: NoteBlock[] = note.content.length > 0 ? note.content : [{ id: 'init', type: 'text', content: '', style: 'normal' }];
    const c = note.color_label || 'default';
    const p = note.is_pinned || false;
    const f = note.folder || 'General';

    setTitle(t);
    setBlocks(b);
    setColorLabel(c);
    setIsPinned(p);
    setFolder(f);
    setActiveBlockIndex(Math.max(0, b.length - 1));
    setHasSaved(false);
    setSaveError(false);
    initialized.current = true;
    latestRef.current = { title: t, blocks: b, colorLabel: c, isPinned: p, folder: f };
    lastSavedJson.current = JSON.stringify({ title: t, blocks: b, colorLabel: c, isPinned: p, folder: f });
  }, [note]);

  // Debounced auto-save
  useEffect(() => {
    if (!initialized.current || !id || !user?.id) return;
    const json = JSON.stringify({ title, blocks, colorLabel, isPinned, folder });
    if (json === lastSavedJson.current) return;

    setSaveError(false);
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await persistSnapshot({ title, blocks, colorLabel, isPinned, folder });
        setHasSaved(true);
        setSaveError(false);
      } catch {
        setSaveError(true);
      } finally {
        setIsSaving(false);
      }
    }, 600);

    return () => clearTimeout(saveTimeout.current);
  }, [title, blocks, colorLabel, isPinned, folder, id, user?.id, persistSnapshot]);

  useEffect(() => {
    return () => {
      if (!id || !initialized.current || isNavigatingBackRef.current) return;
      clearTimeout(saveTimeout.current);
      void persistSnapshot(latestRef.current, true);
    };
  }, [id, persistSnapshot]);

  // Audio recording
  const { isRecording, recordingDuration, startRecording, stopRecording } = useAudioRecording(async (file, duration) => {
    if (!id) return;
    await uploadAttachment.mutateAsync({ noteId: id, file, type: 'audio', durationSeconds: duration });
  });

  const activeBlock = blocks[activeBlockIndex] || null;

  const handleToolAction = (action: string) => {
    const focusedIndex = Math.min(Math.max(activeBlockIndex, 0), Math.max(blocks.length - 1, 0));

    if (action === 'heading') {
      const block = blocks[focusedIndex];
      if (block?.type === 'heading') {
        const newBlocks = [...blocks];
        newBlocks[focusedIndex] = { ...block, type: 'text' };
        setBlocks(newBlocks);
      } else {
        const newBlocks = [...blocks];
        newBlocks.splice(focusedIndex + 1, 0, { id: crypto.randomUUID().slice(0, 8), type: 'heading', content: '', style: 'normal' });
        setBlocks(newBlocks);
        setActiveBlockIndex(focusedIndex + 1);
      }
    } else if (action === 'checklist') {
      const block = blocks[focusedIndex];
      if (block?.type === 'checklist') {
        const newBlocks = [...blocks];
        newBlocks[focusedIndex] = { ...block, type: 'text' };
        setBlocks(newBlocks);
      } else {
        const newBlocks = [...blocks];
        newBlocks.splice(focusedIndex + 1, 0, { id: crypto.randomUUID().slice(0, 8), type: 'checklist', content: '', checked: false, style: 'normal' });
        setBlocks(newBlocks);
        setActiveBlockIndex(focusedIndex + 1);
      }
    } else if (action === 'list') {
      const block = blocks[focusedIndex];
      if (block) {
        const newBlocks = [...blocks];
        newBlocks[focusedIndex] = { ...block, content: block.content.startsWith('• ') ? block.content.slice(2) : `• ${block.content}` };
        setBlocks(newBlocks);
      }
    } else if (action === 'bold') {
      const block = blocks[focusedIndex];
      if (block) {
        const newBlocks = [...blocks];
        newBlocks[focusedIndex] = { ...block, style: block.style === 'bold' ? 'normal' : 'bold' };
        setBlocks(newBlocks);
      }
    } else if (action === 'italic') {
      const block = blocks[focusedIndex];
      if (block) {
        const newBlocks = [...blocks];
        newBlocks[focusedIndex] = { ...block, style: block.style === 'italic' ? 'normal' : 'italic' };
        setBlocks(newBlocks);
      }
    }
  };

  const handlePhotoAttach = () => fileInputRef.current?.click();
  const handleTakePhoto = () => cameraInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !id) return;
    for (const file of Array.from(files)) {
      await uploadAttachment.mutateAsync({ noteId: id, file, type: 'photo' });
    }
    e.target.value = '';
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteNote.mutateAsync(id);
    navigate('/notes', { replace: true });
  };

  const handleFolderSave = () => {
    if (folderInput.trim()) setFolder(folderInput.trim());
    setShowFolderInput(false);
  };

  const handleBackNavigation = async () => {
    if (!id || !initialized.current) {
      navigate('/notes');
      return;
    }
    setIsSaving(true);
    try {
      await persistSnapshot(latestRef.current, true);
      setHasSaved(true);
      isNavigatingBackRef.current = true;
      navigate('/notes');
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (message.includes('session_expired') || message.includes('auth session missing') || message.includes('jwt') || message.includes('row-level security')) {
        toast.error('Session expired. Please sign in again.');
        navigate('/auth', { replace: true });
      } else {
        toast.error('Save failed. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Word count
  const wordCount = useMemo(() => {
    const titleWords = title.trim() ? title.trim().split(/\s+/).length : 0;
    const blockWords = blocks.reduce((sum, b) => {
      const w = b.content.trim();
      return sum + (w ? w.split(/\s+/).length : 0);
    }, 0);
    return titleWords + blockWords;
  }, [title, blocks]);

  if (!user || !session?.access_token) {
    navigate('/auth', { replace: true });
    return null;
  }

  if (noteQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (noteQuery.isError || !note) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center gap-4">
        <p className="text-sm text-muted-foreground">Could not load this note. Please open it again from Notes.</p>
        <button onClick={() => navigate('/notes')} className="h-10 px-4 rounded-xl bg-accent text-accent-foreground text-sm font-medium">
          Back to Notes
        </button>
      </div>
    );
  }

  const COLOR_BG: Record<string, string> = {
    default: 'bg-background',
    red: 'bg-red-50/50 dark:bg-red-950/20',
    orange: 'bg-orange-50/50 dark:bg-orange-950/20',
    yellow: 'bg-yellow-50/50 dark:bg-yellow-950/20',
    green: 'bg-green-50/50 dark:bg-green-950/20',
    blue: 'bg-blue-50/50 dark:bg-blue-950/20',
  };

  return (
    <div className={cn('min-h-screen flex flex-col', COLOR_BG[colorLabel] || COLOR_BG.default)}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <button onClick={handleBackNavigation} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors active:scale-95">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1.5">
              <NotebookPen className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">Nevorai Notes</span>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {/* Save indicator */}
            <div className="px-2 py-1">
              {isSaving ? (
                <span className="text-[10px] text-accent animate-pulse font-medium">Saving…</span>
              ) : saveError ? (
                <span className="text-[10px] text-destructive flex items-center gap-0.5 font-medium">
                  <AlertCircle className="h-3 w-3" /> Error
                </span>
              ) : hasSaved ? (
                <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                  <Check className="h-3 w-3" /> Saved
                </span>
              ) : null}
            </div>
            <button onClick={() => setIsPinned(!isPinned)} className="p-2 rounded-lg hover:bg-muted/50 transition-colors active:scale-95">
              {isPinned ? <PinOff className="h-4 w-4 text-accent" /> : <Pin className="h-4 w-4 text-muted-foreground" />}
            </button>
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-lg hover:bg-muted/50 transition-colors active:scale-95">
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl py-1 w-48 z-50">
                    <button
                      onClick={() => { setShowFolderInput(true); setFolderInput(folder); setShowMenu(false); }}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 flex items-center gap-2.5"
                    >
                      <FolderOpen className="h-4 w-4 text-accent" /> Move to folder
                    </button>
                    <div className="h-px bg-border/50 mx-2" />
                    <button
                      onClick={() => { setShowMenu(false); handleDelete(); }}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-destructive/10 flex items-center gap-2.5 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" /> Delete note
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Recording banner */}
        {isRecording && (
          <div className="px-4 py-2 bg-destructive/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
              <span className="text-xs font-medium text-destructive">
                Recording {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <button
              onClick={stopRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive text-destructive-foreground rounded-full text-xs font-semibold shadow-sm active:scale-95 transition-transform"
            >
              <StopIcon className="h-3 w-3 fill-current" />
              Stop
            </button>
          </div>
        )}
      </header>

      {/* Folder input modal */}
      {showFolderInput && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowFolderInput(false)}>
          <div className="bg-card rounded-2xl p-5 w-full max-w-xs space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm">Move to folder</h3>
            <input
              value={folderInput}
              onChange={(e) => setFolderInput(e.target.value)}
              placeholder="Folder name..."
              className="w-full h-10 px-3 bg-muted/50 rounded-xl text-sm border border-border/50 outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowFolderInput(false)} className="px-4 py-2 text-xs rounded-lg hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleFolderSave} className="px-4 py-2 text-xs bg-accent text-accent-foreground rounded-lg font-medium">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Title section */}
      <div className="px-4 pt-5 pb-0.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="w-full text-2xl font-bold bg-transparent outline-none placeholder:text-muted-foreground/25 leading-tight"
        />
        <div className="flex items-center gap-3 mt-1.5 mb-1">
          <span className="text-[11px] text-muted-foreground/50">
            {format(new Date(note.updated_at), 'dd MMM yyyy, h:mm a')}
          </span>
          <span className="text-[11px] text-muted-foreground/30">·</span>
          <span className="text-[11px] text-muted-foreground/40">{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
          {folder !== 'General' && (
            <>
              <span className="text-[11px] text-muted-foreground/30">·</span>
              <span className="text-[10px] text-accent/70 bg-accent/10 px-1.5 py-px rounded-full font-medium">{folder}</span>
            </>
          )}
        </div>
        <div className="h-px bg-border/30 mt-1" />
      </div>

      {/* Editor */}
      <RichTextEditor blocks={blocks} onChange={setBlocks} onActiveBlockChange={setActiveBlockIndex} />

      {/* Attachments — rendered after text content, in creation order */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 space-y-2">
          {attachments.map(att => {
            if (att.type === 'audio') {
              return (
                <div key={att.id} className="relative group">
                  <AudioPlayer url={att.publicUrl || ''} fileName={att.file_name} />
                  <button
                    onClick={() => deleteAttachment.mutate(att)}
                    className="absolute -top-1.5 -right-1.5 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            }
            if (att.type === 'photo') {
              return (
                <div key={att.id} className="relative group inline-block mr-2">
                  <div className="w-32 h-32 rounded-lg overflow-hidden bg-muted">
                    <img src={att.publicUrl} alt={att.file_name || 'Photo'} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <button
                    onClick={() => deleteAttachment.mutate(att)}
                    className="absolute top-1 right-1 p-1 bg-destructive/90 text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}

      {/* Spacer so content isn't hidden behind toolbar */}
      <div className="h-20" />

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

      {/* Floating Toolbar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 pb-[env(safe-area-inset-bottom)]">
        <NoteToolbar
          onAction={handleToolAction}
          onColorChange={setColorLabel}
          onPhotoAttach={handlePhotoAttach}
          onTakePhoto={handleTakePhoto}
          onAudioRecord={isRecording ? stopRecording : startRecording}
          currentColor={colorLabel}
          isRecording={isRecording}
          activeBlock={activeBlock}
        />
      </div>
    </div>
  );
}
