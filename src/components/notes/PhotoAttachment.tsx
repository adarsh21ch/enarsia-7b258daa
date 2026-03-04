import { Trash2 } from 'lucide-react';
import { NoteAttachment } from '@/hooks/useNoteAttachments';

interface PhotoAttachmentProps {
  attachments: NoteAttachment[];
  onDelete: (att: NoteAttachment) => void;
}

export function PhotoAttachment({ attachments, onDelete }: PhotoAttachmentProps) {
  const photos = attachments.filter(a => a.type === 'photo');
  if (photos.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2 px-4">
      {photos.map(photo => (
        <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
          <img
            src={photo.publicUrl}
            alt={photo.file_name || 'Photo'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <button
            onClick={() => onDelete(photo)}
            className="absolute top-1 right-1 p-1 bg-destructive/90 text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
