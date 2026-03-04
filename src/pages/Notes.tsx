import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotes, Note } from '@/hooks/useNotes';
import { NoteCard } from '@/components/notes/NoteCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { FolderOpen, ArrowLeft, Loader2, NotebookPen, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Notes() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState('All');
  const [moveTarget, setMoveTarget] = useState<Note | null>(null);
  const [folderInput, setFolderInput] = useState('General');
  const [actionNoteId, setActionNoteId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const composerInputRef = useRef<HTMLInputElement>(null);
  const { notes, isLoading, folders, createNote, deleteNote, updateNote } = useNotes(activeFolder);

  useEffect(() => {
    if (!user || !session?.access_token) {
      navigate('/auth', { replace: true });
    }
  }, [user, session?.access_token, navigate]);

  // Auto-focus composer input when opened
  useEffect(() => {
    if (composerOpen) {
      setTimeout(() => composerInputRef.current?.focus(), 100);
    }
  }, [composerOpen]);

  if (!user || !session?.access_token) return null;

  const filtered = search
    ? notes.filter((n) =>
        (n.title || '').toLowerCase().includes(search.toLowerCase()) ||
        n.content.some((b) => (b.content || '').toLowerCase().includes(search.toLowerCase()))
      )
    : notes;

  const folderOptions = folders.filter((f) => f !== 'All');
  const pinnedNotes = filtered.filter(n => n.is_pinned);
  const unpinnedNotes = filtered.filter(n => !n.is_pinned);

  const handleCreate = async (initialTitle?: string) => {
    try {
      const result = await createNote.mutateAsync({
        title: initialTitle || '',
        content: [{ id: crypto.randomUUID().slice(0, 8), type: 'text', content: '', style: 'normal' }],
      });
      navigate(`/notes/${result.id}`);
    } catch {
      // Error toast is handled in useNotes
    }
  };

  const handleComposerSubmit = () => {
    const val = composerInputRef.current?.value?.trim() || '';
    setComposerOpen(false);
    handleCreate(val);
  };

  const handleDeleteFromList = async (note: Note) => {
    setActionNoteId(note.id);
    try {
      await deleteNote.mutateAsync(note.id);
    } catch {
      // handled
    } finally {
      setActionNoteId(null);
    }
  };

  const handleOpenMoveDialog = (note: Note) => {
    setMoveTarget(note);
    setFolderInput((note.folder || 'General').trim() || 'General');
  };

  const handleMoveSave = async () => {
    if (!moveTarget) return;
    const targetFolder = folderInput.trim() || 'General';
    setIsMoving(true);
    setActionNoteId(moveTarget.id);
    try {
      await updateNote.mutateAsync({ id: moveTarget.id, folder: targetFolder });
      setMoveTarget(null);
    } catch {
      // handled
    } finally {
      setIsMoving(false);
      setActionNoteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/30">
        <div className="container px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/profile')} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors active:scale-95">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 flex-1">
              <NotebookPen className="h-5 w-5 text-accent" />
              <h1 className="text-lg font-bold">Nevorai Notes</h1>
            </div>
            <span className="text-[10px] text-muted-foreground/40 font-medium">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </span>
          </div>
          <div className="mt-2.5">
            <SearchBar value={search} onChange={setSearch} placeholder="Search notes..." />
          </div>
        </div>
      </header>

      {/* Folder tabs */}
      <div className="sticky top-[105px] z-30 bg-background/95 backdrop-blur-md">
        <div className="container px-4 py-2.5 flex gap-1 overflow-x-auto no-scrollbar">
          {folders.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFolder(f)}
              className={cn(
                'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 relative',
                activeFolder === f
                  ? 'bg-accent text-accent-foreground shadow-sm shadow-accent/20'
                  : 'text-muted-foreground hover:bg-muted/50'
              )}
            >
              {f === 'All' ? (
                <span className="flex items-center gap-1">
                  <FolderOpen className="h-3 w-3" /> All
                </span>
              ) : (
                f
              )}
            </button>
          ))}
        </div>
        <div className="h-px bg-border/20" />
      </div>

      {/* Notes list */}
      <main className="flex-1 container px-4 pt-3 pb-40">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
              <NotebookPen className="h-8 w-8 text-accent" />
            </div>
            <p className="text-sm text-muted-foreground">{search ? 'No notes found' : 'No notes yet'}</p>
            {!search && <p className="text-xs text-muted-foreground/50">Tap the composer below to start writing</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pinned section */}
            {pinnedNotes.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-wider px-1 mb-1.5">Pinned</p>
                <div className="rounded-2xl border border-border/40 overflow-hidden bg-card shadow-sm">
                  {pinnedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onClick={() => navigate(`/notes/${note.id}`)}
                      onDelete={handleDeleteFromList}
                      onMove={handleOpenMoveDialog}
                      actionLoading={actionNoteId === note.id && (deleteNote.isPending || isMoving)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Recent notes */}
            {unpinnedNotes.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-wider px-1 mb-1.5">
                  {pinnedNotes.length > 0 ? 'Recent Notes' : 'All Notes'}
                </p>
                <div className="rounded-2xl border border-border/40 overflow-hidden bg-card shadow-sm">
                  {unpinnedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onClick={() => navigate(`/notes/${note.id}`)}
                      onDelete={handleDeleteFromList}
                      onMove={handleOpenMoveDialog}
                      actionLoading={actionNoteId === note.id && (deleteNote.isPending || isMoving)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Move folder dialog */}
      {moveTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setMoveTarget(null)}>
          <div className="bg-card rounded-2xl p-5 w-full max-w-xs space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm">Move to folder</h3>
            <input
              value={folderInput}
              onChange={(e) => setFolderInput(e.target.value)}
              placeholder="Folder name..."
              className="w-full h-10 px-3 bg-muted/50 rounded-xl text-sm border border-border/50 outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
              autoFocus
            />
            <div className="flex flex-wrap gap-2">
              {folderOptions.map((folder) => (
                <button
                  key={folder}
                  onClick={() => setFolderInput(folder)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[11px] border transition-colors',
                    folderInput.trim() === folder
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  {folder}
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setMoveTarget(null)} className="px-4 py-2 text-xs rounded-lg hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                onClick={handleMoveSave}
                disabled={isMoving}
                className="px-4 py-2 text-xs bg-accent text-accent-foreground rounded-lg font-medium disabled:opacity-60"
              >
                {isMoving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Composer Bar — fixed above bottom nav */}
      <div className="fixed bottom-[68px] left-0 right-0 z-40 px-4 pb-3">
        <button
          onClick={() => setComposerOpen(true)}
          disabled={createNote.isPending}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border/50",
            "shadow-[0_-4px_24px_-6px_rgba(0,0,0,0.06)] hover:shadow-[0_-4px_24px_-6px_rgba(0,0,0,0.1)]",
            "active:scale-[0.98] transition-all duration-200 cursor-text"
          )}
        >
          <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <PenLine className="h-4 w-4 text-accent" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-[13px] text-muted-foreground/50 font-medium">Start typing your note...</p>
          </div>
        </button>
      </div>

      {/* Composer bottom sheet */}
      {composerOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 animate-in fade-in duration-200" onClick={() => setComposerOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-1 bg-muted-foreground/15 rounded-full mx-auto mt-3" />
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold">Quick Note</h3>
                <button onClick={() => setComposerOpen(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1">
                  Cancel
                </button>
              </div>
              <input
                ref={composerInputRef}
                placeholder="Note title (optional)"
                className="w-full text-lg font-semibold bg-transparent outline-none placeholder:text-muted-foreground/30"
                onKeyDown={(e) => { if (e.key === 'Enter') handleComposerSubmit(); }}
              />
              <div className="h-px bg-border/30" />
              <p className="text-xs text-muted-foreground/40">Press enter or tap Create to open editor</p>
              <button
                onClick={handleComposerSubmit}
                disabled={createNote.isPending}
                className="w-full py-3 rounded-xl bg-accent text-accent-foreground font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-60"
              >
                {createNote.isPending ? 'Creating...' : 'Create Note'}
              </button>
            </div>
            <div className="h-[env(safe-area-inset-bottom)]" />
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
