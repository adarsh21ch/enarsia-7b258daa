import { useState } from 'react';
import { Pin, MoreVertical, FolderOpen, Trash2 } from 'lucide-react';
import { Note, NoteBlock } from '@/hooks/useNotes';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

function getFirstLine(blocks: NoteBlock[]): string {
  for (const b of blocks) {
    const raw = (b.content || '').trim();
    if (raw) return raw;
  }
  return '';
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
  const title = (note.title || '').trim();
  const firstLine = getFirstLine(note.content);
  const heading = title || firstLine || 'Untitled';
  const subtitle = title && firstLine ? firstLine : '';
  const showActions = !!onDelete || !!onMove;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-card hover:bg-muted/30 active:bg-muted/50 transition-colors cursor-pointer"
    >
      {/* Pin indicator */}
      {note.is_pinned && <Pin className="h-3 w-3 text-accent fill-accent shrink-0" />}

      {/* Text */}
      <div className="min-w-0 flex-1">
        <h3 className="text-[14px] font-semibold text-foreground truncate leading-tight">{heading}</h3>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[11px] text-muted-foreground/60">{format(new Date(note.updated_at), 'dd/MM/yy')}</span>
          {subtitle && (
            <>
              <span className="text-[11px] text-muted-foreground/30">·</span>
              <span className="text-[11px] text-muted-foreground/50 truncate">{subtitle}</span>
            </>
          )}
          {note.folder !== 'General' && (
            <>
              <span className="text-[11px] text-muted-foreground/30">·</span>
              <span className="text-[10px] text-accent/70 bg-accent/10 px-1.5 py-px rounded-full font-medium">{note.folder}</span>
            </>
          )}
        </div>
      </div>

      {/* 3-dot menu */}
      {showActions && (
        <div className="relative shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu((p) => !p); }}
            className="h-7 w-7 rounded-lg hover:bg-muted/60 flex items-center justify-center"
            aria-label="Note actions"
            disabled={actionLoading}
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground/50" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl py-1 w-40 z-50">
                {onMove && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); onMove(note); }}
                    className="w-full text-left px-3 py-2 text-[13px] hover:bg-muted/50 flex items-center gap-2"
                  >
                    <FolderOpen className="h-3.5 w-3.5 text-accent" /> Move
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(note); }}
                    className="w-full text-left px-3 py-2 text-[13px] hover:bg-destructive/10 flex items-center gap-2 text-destructive"
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
  );
}
