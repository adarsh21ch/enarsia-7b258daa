import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotes } from '@/hooks/useNotes';
import { NoteCard } from '@/components/notes/NoteCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Plus, FolderOpen, ArrowLeft, Loader2, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Notes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState('All');
  const { notes, isLoading, folders, createNote } = useNotes(activeFolder);

  if (!user) { navigate('/auth'); return null; }

  const filtered = search
    ? notes.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.some(b => b.content.toLowerCase().includes(search.toLowerCase()))
      )
    : notes;

  const handleCreate = async () => {
    const result = await createNote.mutateAsync({});
    navigate(`/notes/${result.id}`);
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
              <StickyNote className="h-5 w-5 text-accent" />
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
          {folders.map(f => (
            <button
              key={f}
              onClick={() => setActiveFolder(f)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200",
                activeFolder === f
                  ? "bg-accent text-accent-foreground border-accent shadow-sm shadow-accent/20"
                  : "bg-card text-muted-foreground border-border/50 hover:bg-muted/50"
              )}
            >
              {f === 'All' ? <span className="flex items-center gap-1"><FolderOpen className="h-3 w-3" /> All</span> : f}
            </button>
          ))}
        </div>
      </div>

      {/* Notes grid */}
      <main className="flex-1 container px-4 py-4 pb-24">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
              <StickyNote className="h-8 w-8 text-accent" />
            </div>
            <p className="text-sm text-muted-foreground">
              {search ? 'No notes found' : 'No notes yet'}
            </p>
            {!search && (
              <p className="text-xs text-muted-foreground/60">
                Tap + to create your first note
              </p>
            )}
          </div>
        ) : (
          <div className="columns-2 gap-3 space-y-3">
            {filtered.map(note => (
              <div key={note.id} className="break-inside-avoid">
                <NoteCard note={note} onClick={() => navigate(`/notes/${note.id}`)} />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={handleCreate}
        disabled={createNote.isPending}
        className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-2xl bg-accent text-accent-foreground shadow-lg shadow-accent/30 flex items-center justify-center active:scale-95 transition-transform"
      >
        {createNote.isPending ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Plus className="h-6 w-6" />
        )}
      </button>

      <BottomNav />
    </div>
  );
}
