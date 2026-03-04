import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotes, NoteBlock } from '@/hooks/useNotes';
import { useNoteAttachments } from '@/hooks/useNoteAttachments';
import { RichTextEditor } from '@/components/notes/RichTextEditor';
import { NoteToolbar } from '@/components/notes/NoteToolbar';
import { AudioRecorder, useAudioRecording } from '@/components/notes/AudioRecorder';
import { PhotoAttachment } from '@/components/notes/PhotoAttachment';
import { ArrowLeft, Pin, PinOff, Trash2, MoreVertical, FolderOpen, Loader2, Check, Square as StopIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function NoteEditor() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { updateNote, deleteNote } = useNotes();
  const { attachments, uploadAttachment, deleteAttachment } = useNoteAttachments(id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [folderInput, setFolderInput] = useState('');
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load the single note
  const noteQuery = useQuery({
    queryKey: ['note', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return {
        ...data,
        content: (Array.isArray(data.content) ? data.content : []) as unknown as NoteBlock[],
      };
    },
    enabled: !!id && !!user?.id,
  });

  const note = noteQuery.data;

  // Local state for editing
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [colorLabel, setColorLabel] = useState('default');
  const [isPinned, setIsPinned] = useState(false);
  const [folder, setFolder] = useState('General');
  const initialized = useRef(false);
  const lastSavedRef = useRef('');

  // Reset initialized when id changes
  useEffect(() => {
    initialized.current = false;
  }, [id]);

  useEffect(() => {
    if (note && !initialized.current) {
      setTitle(note.title || '');
      setBlocks(note.content.length > 0 ? note.content : [{ id: 'init', type: 'text', content: '', style: 'normal' }]);
      setColorLabel(note.color_label || 'default');
      setIsPinned(note.is_pinned || false);
      setFolder(note.folder || 'General');
      initialized.current = true;
      // Track initial state to avoid unnecessary saves
      lastSavedRef.current = JSON.stringify({ title: note.title, content: note.content, color_label: note.color_label, is_pinned: note.is_pinned, folder: note.folder });
    }
  }, [note]);

  // Auto-save with debounce
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!initialized.current || !id) return;

    const currentState = JSON.stringify({ title, content: blocks, color_label: colorLabel, is_pinned: isPinned, folder });
    if (currentState === lastSavedRef.current) return;

    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await updateNote.mutateAsync({
          id,
          title,
          content: blocks,
          color_label: colorLabel,
          is_pinned: isPinned,
          folder,
        });
        lastSavedRef.current = currentState;
      } catch {
        // silent
      } finally {
        setIsSaving(false);
      }
    }, 600);

    return () => clearTimeout(saveTimeout.current);
  }, [title, blocks, colorLabel, isPinned, folder, id]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        // Force save
        if (id && initialized.current) {
          const payload: any = { title, content: blocks as any, color_label: colorLabel, is_pinned: isPinned, folder };
          supabase.from('notes').update(payload).eq('id', id).then(() => {
            queryClient.invalidateQueries({ queryKey: ['notes'] });
          });
        }
      }
    };
  }, [id, title, blocks, colorLabel, isPinned, folder]);

  // Audio recording
  const { isRecording, recordingDuration, startRecording, stopRecording } = useAudioRecording(
    async (file, duration) => {
      if (!id) return;
      await uploadAttachment.mutateAsync({ noteId: id, file, type: 'audio', durationSeconds: duration });
    }
  );

  const handleToolAction = (action: string) => {
    const inputs = document.querySelectorAll('[data-block-input]');
    let focusedIndex = blocks.length - 1;
    inputs.forEach((el, i) => {
      if (el === document.activeElement) focusedIndex = i;
    });

    if (action === 'heading') {
      const newBlocks = [...blocks];
      newBlocks.splice(focusedIndex + 1, 0, { id: crypto.randomUUID().slice(0, 8), type: 'heading', content: '', style: 'normal' });
      setBlocks(newBlocks);
    } else if (action === 'checklist') {
      const newBlocks = [...blocks];
      newBlocks.splice(focusedIndex + 1, 0, { id: crypto.randomUUID().slice(0, 8), type: 'checklist', content: '', checked: false, style: 'normal' });
      setBlocks(newBlocks);
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
    if (folderInput.trim()) {
      setFolder(folderInput.trim());
    }
    setShowFolderInput(false);
  };

  if (!user) { navigate('/auth'); return null; }
  if (noteQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
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
    <div className={cn("min-h-screen flex flex-col", COLOR_BG[colorLabel] || COLOR_BG.default)}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-2.5">
          <button onClick={() => navigate('/notes')} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-0.5">
            {/* Save indicator */}
            <div className="px-2 py-1">
              {isSaving ? (
                <span className="text-[10px] text-muted-foreground animate-pulse">Saving...</span>
              ) : initialized.current ? (
                <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                  <Check className="h-3 w-3" /> Saved
                </span>
              ) : null}
            </div>
            <button onClick={() => setIsPinned(!isPinned)} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
              {isPinned ? <PinOff className="h-4 w-4 text-accent" /> : <Pin className="h-4 w-4 text-muted-foreground" />}
            </button>
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
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

        {/* Recording banner with STOP button */}
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
          <div className="bg-card rounded-2xl p-5 w-full max-w-xs space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-sm">Move to folder</h3>
            <input
              value={folderInput}
              onChange={e => setFolderInput(e.target.value)}
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

      {/* Title */}
      <div className="px-4 pt-4 pb-1">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Note title..."
          className="w-full text-xl font-bold bg-transparent outline-none placeholder:text-muted-foreground/30"
        />
      </div>

      {/* Photos */}
      <PhotoAttachment attachments={attachments} onDelete={(att) => deleteAttachment.mutate(att)} />

      {/* Audio */}
      <div className="px-4 py-1">
        <AudioRecorder
          isRecording={isRecording}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          attachments={attachments}
          onDelete={(att) => deleteAttachment.mutate(att)}
        />
      </div>

      {/* Editor */}
      <RichTextEditor blocks={blocks} onChange={setBlocks} />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Toolbar */}
      <div className="sticky bottom-0 z-30">
        <NoteToolbar
          onAction={handleToolAction}
          onColorChange={setColorLabel}
          onPhotoAttach={handlePhotoAttach}
          onAudioRecord={isRecording ? stopRecording : startRecording}
          currentColor={colorLabel}
          isRecording={isRecording}
        />
      </div>
    </div>
  );
}
