import { useState, useRef, useCallback } from 'react';
import { Pin, MoreVertical, FolderOpen, Trash2 } from 'lucide-react';
import { Note, NoteBlock } from '@/hooks/useNotes';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

function getPreviewLines(blocks: NoteBlock[], maxLines = 2): string {
  const lines: string[] = [];
  for (const b of blocks) {
    if (lines.length >= maxLines) break;
    const raw = (b.content || '').trim();
    if (!raw) continue;
    if (b.type === 'checklist') {
      lines.push(`${b.checked ? '☑' : '☐'} ${raw}`);
    } else {
      lines.push(raw);
    }
  }
  return lines.join('\n');
}

interface NoteCardProps {
  note: Note;
  onClick: () => void;
  onDelete?: (note: Note) => void;
  onMove?: (note: Note) => void;
  actionLoading?: boolean;
}

export function NoteCard({ note, onClick, onDelete, onMove, actionLoading }: NoteCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startXRef = useRef(0);
  const swipeThreshold = 80;

  const title = (note.title || '').trim();
  const preview = getPreviewLines(note.content);
  const heading = title || (preview ? preview.split('\n')[0] : 'Untitled');
  const subtitle = title ? preview : (preview.split('\n').slice(1).join('\n') || '');
  const showActions = !!onDelete || !!onMove;
  const relativeTime = formatDistanceToNow(new Date(note.updated_at), { addSuffix: true });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping) return;
    const diff = startXRef.current - e.touches[0].clientX;
    setSwipeX(Math.max(0, Math.min(diff, 100)));
  }, [swiping]);

  const handleTouchEnd = useCallback(() => {
    setSwiping(false);
    if (swipeX >= swipeThreshold && onDelete) {
      onDelete(note);
    }
    setSwipeX(0);
  }, [swipeX, onDelete, note]);

  return (
    <div className="relative overflow-hidden">
      {/* Delete background */}
      <div className="absolute inset-0 bg-destructive flex items-center justify-end pr-5">
        <Trash2 className="h-5 w-5 text-destructive-foreground" />
      </div>

      {/* Card */}
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateX(-${swipeX}px)`, transition: swiping ? 'none' : 'transform 0.3s ease-out' }}
        className={cn(
          "relative flex items-start gap-3 px-4 py-3.5 bg-card border-b border-border/30",
          "active:bg-muted/40 transition-colors cursor-pointer"
        )}
      >
        {/* Pin indicator */}
        {note.is_pinned && (
          <div className="shrink-0 mt-1">
            <Pin className="h-3 w-3 text-accent fill-accent" />
          </div>
        )}

        {/* Text content */}
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold text-foreground leading-tight line-clamp-1">{heading}</h3>
          {subtitle && (
            <p className="text-[12px] text-muted-foreground/60 line-clamp-1 mt-0.5 leading-snug">{subtitle}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] text-muted-foreground/45">{relativeTime}</span>
            {note.folder !== 'General' && (
              <>
                <span className="text-[10px] text-muted-foreground/25">·</span>
                <span className="text-[9px] text-accent/60 bg-accent/8 px-1.5 py-px rounded-full font-medium">{note.folder}</span>
              </>
            )}
          </div>
        </div>

        {/* 3-dot menu */}
        {showActions && (
          <div className="relative shrink-0 mt-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu((p) => !p); }}
              className="h-7 w-7 rounded-lg hover:bg-muted/60 flex items-center justify-center active:scale-90 transition-all"
              aria-label="Note actions"
              disabled={actionLoading}
            >
              <MoreVertical className="h-4 w-4 text-foreground/60" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl py-1 w-40 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {onMove && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowMenu(false); onMove(note); }}
                      className="w-full text-left px-3 py-2.5 text-[13px] hover:bg-muted/50 flex items-center gap-2 active:bg-muted transition-colors"
                    >
                      <FolderOpen className="h-3.5 w-3.5 text-accent" /> Move
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(note); }}
                      className="w-full text-left px-3 py-2.5 text-[13px] hover:bg-destructive/10 flex items-center gap-2 text-destructive active:bg-destructive/15 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
