import { Pin, Clock } from 'lucide-react';
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
    .map(b => {
      if (b.type === 'checklist') return `${b.checked ? '☑' : '☐'} ${b.content}`;
      return b.content;
    })
    .filter(Boolean)
    .join('\n');
}

interface NoteCardProps {
  note: Note;
  onClick: () => void;
}

export function NoteCard({ note, onClick }: NoteCardProps) {
  const preview = getPreviewText(note.content);
  const colorClass = COLOR_MAP[note.color_label] || COLOR_MAP.default;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border-[1.5px] p-3.5 transition-all duration-200",
        "hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]",
        "shadow-sm",
        colorClass
      )}
    >
      {note.is_pinned && (
        <div className="flex items-center gap-1 mb-1.5">
          <Pin className="h-3 w-3 text-accent fill-accent" />
          <span className="text-[10px] font-medium text-accent">Pinned</span>
        </div>
      )}
      {note.title && (
        <h3 className="font-semibold text-sm line-clamp-1 mb-1">{note.title}</h3>
      )}
      {preview && (
        <p className="text-xs text-muted-foreground line-clamp-5 whitespace-pre-line leading-relaxed">
          {preview}
        </p>
      )}
      <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-border/50">
        <Clock className="h-2.5 w-2.5 text-muted-foreground/50" />
        <span className="text-[10px] text-muted-foreground/50">
          {format(new Date(note.updated_at), 'MMM d, h:mm a')}
        </span>
        {note.folder !== 'General' && (
          <span className="text-[9px] text-accent/70 ml-auto bg-accent/10 px-1.5 py-0.5 rounded-full font-medium">
            {note.folder}
          </span>
        )}
      </div>
    </button>
  );
}
