import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Prospect } from '@/types/prospect';
import { ProspectRow } from './ProspectRow';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableProspectRowProps {
  prospect: Prospect;
  index: number;
  isCalling: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
  onDelete: (id: string) => Promise<boolean>;
  isEven: boolean;
  columnOrder: string[];
  columnWidths: Record<string, number>;
  isMobileTable?: boolean;
}

export function SortableProspectRow(props: SortableProspectRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.prospect.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <ProspectRow
      {...props}
      dragHandleProps={{
        ref: setNodeRef,
        style,
        attributes,
        listeners,
        isDragging,
      }}
    />
  );
}
