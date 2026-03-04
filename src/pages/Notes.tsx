import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotes, Note } from '@/hooks/useNotes';
import { NoteCard } from '@/components/notes/NoteCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Plus, FolderOpen, ArrowLeft, Loader2, NotebookPen } from 'lucide-react';
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
  const { notes, isLoading, folders, createNote, deleteNote, updateNote } = useNotes(activeFolder);

  useEffect(() => {
    if (!user || !session?.access_token) {
      navigate('/auth', { replace: true });
    }
  }, [user, session?.access_token, navigate]);

  if (!user || !session?.access_token) return null;

  const filtered = search
    ? notes.filter((n) =>
        (n.title || '').toLowerCase().includes(search.toLowerCase()) ||
        n.content.some((b) => (b.content || '').toLowerCase().includes(search.toLowerCase()))
      )
    : notes;

  const folderOptions = folders.filter((f) => f !== 'All');

  const handleCreate = async () => {
    try {
      const result = await createNote.mutateAsync({
        content: [{ id: crypto.randomUUID().slice(0, 8), type: 'text', content: '', style: 'normal' }],
      });
      navigate(`/notes/${result.id}`);
    } catch {
      // Error toast is handled in useNotes
    }
  };

  const handleDeleteFromList = async (note: Note) => {
    setActionNoteId(note.id);
    try {
      await deleteNote.mutateAsync(note.id);
    } catch {
      // Error toast is handled in useNotes
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
      // Error toast is handled in useNotes
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
            <button onClick={() => navigate('/profile')} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 flex-1">
              <NotebookPen className="h-5 w-5 text-accent" />
              <h1 className="text-lg font-bold">Notes</h1>
            </div>
            <span className="text-xs text-muted-foreground/60 bg-muted/50 px-2 py-0.5 rounded-full">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </span>
          </div>
          <div className="mt-2.5">
            <SearchBar value={search} onChange={setSearch} placeholder="Search notes..." />
          </div>
        </div>
      </header>

      {/* Folder chips */}
      <div className="sticky top-[105px] z-30 bg-background/95 backdrop-blur-md border-b border-border/20">
        <div className="container px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
          {folders.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFolder(f)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
                activeFolder === f
                  ? 'bg-accent text-accent-foreground border-accent shadow-sm shadow-accent/20'
                  : 'bg-card text-muted-foreground border-border/50 hover:bg-muted/50'
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
      </div>

      {/* Notes list */}
      <main className="flex-1 container px-4 py-4 pb-24">
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
            {!search && <p className="text-xs text-muted-foreground/60">Tap + to create your first note</p>}
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 overflow-hidden bg-card">
            {filtered.map((note) => (
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
        )}
      </main>

      {/* Move folder dialog */}
      {moveTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setMoveTarget(null)}>
          <div className="bg-card rounded-2xl p-5 w-full max-w-xs space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
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

      {/* FAB */}
      <button
        onClick={handleCreate}
        disabled={createNote.isPending}
        className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-2xl bg-accent text-accent-foreground shadow-lg shadow-accent/30 flex items-center justify-center active:scale-95 transition-transform"
      >
        {createNote.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
      </button>

      <BottomNav />
    </div>
  );
}
