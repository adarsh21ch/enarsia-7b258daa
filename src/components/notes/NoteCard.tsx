import { useState } from 'react';
import { Pin, Clock, MoreVertical, FolderOpen, Trash2 } from 'lucide-react';
import { Note, NoteBlock } from '@/hooks/useNotes';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const COLOR_MAP: Record<string, string> = {
  default: 'bg-card border-border',
  red: 'bg-red-50 border-red-300/70 dark:bg-red-950/30 dark:border-red-700/50',
  orange: 'bg-orange-50 border-orange-300/70 dark:bg-orange-950/30 dark:border-orange-700/50',
  yellow: 'bg-yellow-50 border-yellow-300/70 dark:bg-yellow-950/30 dark:border-yellow-700/50',
  green: 'bg-green-50 border-green-300/70 dark:bg-green-950/30 dark:border-green-700/50',
  blue: 'bg-blue-50 border-blue-300/70 dark:bg-blue-950/30 dark:border-blue-700/50',
};

function getPreviewText(blocks: NoteBlock[]): string {
  return blocks
    .slice(0, 5)
    .map((b) => {
      const raw = (b.content || '').trim();
      if (!raw) return '';
      if (b.type === 'checklist') return `${b.checked ? '☑' : '☐'} ${raw}`;
      return raw;
    })
    .filter((line) => line.length > 0)
    .join('\n');
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
  const preview = getPreviewText(note.content);
  const normalizedTitle = (note.title || '').trim();
  const previewText = preview || 'No content yet';
  const colorClass = COLOR_MAP[note.color_label] || COLOR_MAP.default;
  const showActions = !!onDelete || !!onMove;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'w-full text-left rounded-2xl border-[1.5px] p-3.5 transition-all duration-200 cursor-pointer',
        'hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.995]',
        'shadow-sm',
        colorClass
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1">
          {note.is_pinned && (
            <div className="flex items-center gap-1 mb-1.5">
              <Pin className="h-3 w-3 text-accent fill-accent" />
              <span className="text-[10px] font-medium text-accent">Pinned</span>
            </div>
          )}
          <h3 className="font-semibold text-sm line-clamp-1 text-foreground">{normalizedTitle || 'Untitled note'}</h3>
        </div>

        {showActions && (
          <div className="relative shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu((prev) => !prev);
              }}
              className="h-7 w-7 rounded-lg hover:bg-muted/60 flex items-center justify-center"
              aria-label="Note actions"
              disabled={actionLoading}
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl py-1 w-44 z-50">
                  {onMove && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onMove(note);
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 flex items-center gap-2.5"
                    >
                      <FolderOpen className="h-4 w-4 text-accent" /> Move to folder
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onDelete(note);
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-destructive/10 flex items-center gap-2.5 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" /> Delete note
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-line leading-relaxed">{previewText}</p>

      <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-border/50">
        <Clock className="h-2.5 w-2.5 text-muted-foreground/50" />
        <span className="text-[10px] text-muted-foreground/50">{format(new Date(note.updated_at), 'MMM d, h:mm a')}</span>
        {note.folder !== 'General' && (
          <span className="text-[9px] text-accent/70 ml-auto bg-accent/10 px-1.5 py-0.5 rounded-full font-medium">{note.folder}</span>
        )}
      </div>
    </div>
  );
}
