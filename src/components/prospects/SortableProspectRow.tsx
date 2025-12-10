import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Prospect } from '@/types/prospect';
import { ProspectRow } from './ProspectRow';

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
  isMobileTable?: boolean;
  selectionModeActive: boolean;
  showSelection?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  disableDrag?: boolean;
}

export function SortableProspectRow(props: SortableProspectRowProps) {
  const { disableDrag = false } = props;
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: props.prospect.id,
    disabled: disableDrag,
  });

  const style = disableDrag ? {} : {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const dragHandleProps = disableDrag ? undefined : {
    ref: setNodeRef,
    style,
    attributes,
    listeners,
    isDragging,
  };

  return (
    <ProspectRow
      {...props}
      dragHandleProps={dragHandleProps}
    />
  );
}