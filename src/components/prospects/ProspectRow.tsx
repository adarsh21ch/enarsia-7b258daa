import { useState, useRef, useEffect } from 'react';
import { Prospect, FunnelStage, ActionTaken, ProspectStatus, FUNNEL_STAGES, EXTENDED_ACTIONS, STATUSES, ExtendedActionTaken } from '@/types/prospect';
import { InlineSelect } from './InlineSelect';
import { StatusBadge, StageBadge, ActionBadge } from './StatusBadge';
import { InlineReportCard } from './InlineReportCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CallIconButton, WhatsAppIconButton } from '@/components/ui/ActionIcons';
import { Trash2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomOptionsContext } from '@/contexts/CustomOptionsContext';

interface DragHandleProps {
  ref: (node: HTMLElement | null) => void;
  style: React.CSSProperties;
  attributes: Record<string, any>;
  listeners: Record<string, any> | undefined;
  isDragging: boolean;
}

interface ProspectRowProps {
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
  dragHandleProps?: DragHandleProps;
  showSelection?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export function ProspectRow({ 
  prospect, 
  index, 
  isCalling, 
  isExpanded,
  onToggleExpand,
  onUpdate, 
  onDelete,
  isEven,
  columnOrder,
  columnWidths,
  isMobileTable = false,
  dragHandleProps,
  showSelection = false,
  isSelected = false,
  onToggleSelect,
}: ProspectRowProps) {
  const [localPhone, setLocalPhone] = useState(prospect.phone);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);
  
  const { addOption, deleteOption, getOptionsForType, getCustomOptionsForType } = useCustomOptionsContext();

  const stageOptions = getOptionsForType('funnel_stage', FUNNEL_STAGES) as FunnelStage[];
  const actionOptions = getOptionsForType('action_taken', EXTENDED_ACTIONS) as ExtendedActionTaken[];
  const statusOptions = getOptionsForType('prospect_status', STATUSES) as ProspectStatus[];

  useEffect(() => {
    setLocalPhone(prospect.phone);
  }, [prospect]);

  useEffect(() => {
    if (isEditingPhone && phoneRef.current) {
      phoneRef.current.focus();
      phoneRef.current.select();
    }
  }, [isEditingPhone]);

  const handlePhoneBlur = () => {
    setIsEditingPhone(false);
    if (localPhone !== prospect.phone && localPhone.trim()) {
      onUpdate(prospect.id, { phone: localPhone.trim() });
    } else {
      setLocalPhone(prospect.phone);
    }
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePhoneBlur();
    } else if (e.key === 'Escape') {
      setLocalPhone(prospect.phone);
      setIsEditingPhone(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(prospect.id);
    setIsDeleting(false);
  };

  const handleActionChange = (value: ExtendedActionTaken) => {
    const updates: Partial<Prospect> = {};
    
    if (value === 'Enrollment') {
      updates.action_taken = 'Enrollment';
      if (!prospect.funnel_stage) {
        updates.funnel_stage = 'Day 1';
      }
    } else {
      updates.action_taken = value;
    }
    
    onUpdate(prospect.id, updates);
  };

  const cleanPhoneNumber = (phone: string) => phone.replace(/[^0-9+]/g, '');

  const openWhatsApp = () => {
    window.location.href = `whatsapp://send?phone=${cleanPhoneNumber(prospect.phone)}`;
  };

  const openCall = () => {
    window.location.href = `tel:${cleanPhoneNumber(prospect.phone)}`;
  };

  const getActionDisplayValue = (): ExtendedActionTaken | null => {
    if (prospect.action_taken === 'Enrollment') return 'Enrollment';
    return prospect.action_taken || null;
  };

  const renderCell = (columnId: string) => {
    const width = columnWidths[columnId];
    const style = { width: width ? `${width}px` : undefined, minWidth: width ? `${width}px` : undefined };
    // Use solid background colors without transparency to prevent see-through effect
    const bgColor = isEven ? "bg-muted" : "bg-card";
    const isNameColumn = columnId === 'name';
    const isIndexColumn = columnId === 'index';
    
    const cellClass = cn(
      "px-2 py-2 whitespace-nowrap",
      !isMobileTable && "px-3 py-3",
      isMobileTable && "text-xs",
      isMobileTable && isNameColumn && `sticky left-[36px] z-10 ${bgColor} shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]`,
      isMobileTable && isIndexColumn && `sticky left-0 z-10 ${bgColor}`
    );
    
    switch (columnId) {
      case 'index':
        return (
          <td key={columnId} className={cn(cellClass, "text-center")} style={style}>
            <span className={cn("text-xs font-semibold text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5", isMobileTable && "text-[10px] px-1")}>{index}</span>
          </td>
        );
      case 'name':
        // Build compact info line: "Age, Location" without labels
        const ageValue = (prospect as any).age_or_dob || '';
        const locationValue = prospect.address || '';
        const infoParts = [ageValue, locationValue].filter(Boolean);
        const infoLine = infoParts.length > 0 ? infoParts.join(', ') : '–';
        
        return (
          <td key={columnId} className={cellClass} style={style} onPointerDown={(e) => e.stopPropagation()}>
            <div className="flex flex-col overflow-hidden" style={{ maxWidth: isMobileTable ? '140px' : '180px' }}>
              <div className="flex items-center gap-1">
                {/* Call button next to name */}
                <CallIconButton onClick={openCall} className={isMobileTable ? "p-0.5" : undefined} />
                <button
                  onClick={onToggleExpand}
                  className={cn(
                    "group flex items-center gap-1 text-left font-semibold text-foreground hover:text-primary transition-all duration-200 cursor-pointer bg-transparent border-0 py-1 px-1.5 rounded-md hover:bg-primary/5 active:scale-[0.98]",
                    isMobileTable && "text-xs py-0.5",
                    isExpanded && "text-primary bg-primary/10"
                  )}
                >
                  <span className="truncate" style={{ maxWidth: isMobileTable ? '90px' : '130px' }} title={prospect.name}>{prospect.name}</span>
                  <span className={cn("transition-transform duration-200 text-muted-foreground group-hover:text-primary shrink-0", isExpanded && "rotate-180")}>
                    <ChevronDown className={cn("h-3 w-3", isMobileTable && "h-2.5 w-2.5")} />
                  </span>
                </button>
              </div>
              {/* Compact info: Age, Location - truncated to stay within column */}
              <div className={cn(
                "text-muted-foreground ml-6 truncate",
                isMobileTable ? "text-[9px] ml-5 max-w-[100px]" : "text-[10px] max-w-[140px]"
              )} title={infoLine}>
                {infoLine}
              </div>
            </div>
          </td>
        );
      case 'phone':
        return (
          <td key={columnId} className={cellClass} style={style} onPointerDown={(e) => e.stopPropagation()}>
            {isEditingPhone ? (
              <Input ref={phoneRef} value={localPhone} onChange={(e) => setLocalPhone(e.target.value)} onBlur={handlePhoneBlur} onKeyDown={handlePhoneKeyDown} className={cn("h-7 px-1.5 text-sm border-primary", isMobileTable ? "h-5 text-[10px] w-full" : "w-28")} />
            ) : (
              <button onClick={() => setIsEditingPhone(true)} className={cn("text-muted-foreground font-medium hover:text-primary hover:bg-muted/50 px-1 py-0.5 -ml-1 rounded transition-colors truncate", isMobileTable ? "text-[10px]" : "text-sm")}>{localPhone}</button>
            )}
          </td>
        );
      case 'contact':
        // Now shows only WhatsApp button
        return (
          <td key={columnId} className={cellClass} style={style} onPointerDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center">
              <WhatsAppIconButton onClick={openWhatsApp} className={isMobileTable ? "p-0.5" : undefined} />
            </div>
          </td>
        );
      case 'stage':
        return (
          <td key={columnId} className={cellClass} style={style} onPointerDown={(e) => e.stopPropagation()}>
            <InlineSelect value={prospect.funnel_stage} options={stageOptions} onChange={(value) => onUpdate(prospect.id, { funnel_stage: value })} renderValue={(value) => <StageBadge stage={value} />} placeholder="Select..." optionType="funnel_stage" customOptions={getCustomOptionsForType('funnel_stage')} onAddOption={addOption} onDeleteOption={deleteOption} defaultOptions={FUNNEL_STAGES} />
          </td>
        );
      case 'action':
        return (
          <td key={columnId} className={cellClass} style={style} onPointerDown={(e) => e.stopPropagation()}>
            <InlineSelect value={getActionDisplayValue()} options={isCalling ? actionOptions : actionOptions.filter(a => a !== 'Enrollment')} onChange={handleActionChange} placeholder="Select..." renderValue={(value) => <ActionBadge action={value} />} optionType="action_taken" customOptions={getCustomOptionsForType('action_taken')} onAddOption={addOption} onDeleteOption={deleteOption} defaultOptions={EXTENDED_ACTIONS} />
          </td>
        );
      case 'quality':
        return (
          <td key={columnId} className={cellClass} style={style} onPointerDown={(e) => e.stopPropagation()}>
            <InlineSelect value={prospect.prospect_status} options={statusOptions} onChange={(value) => onUpdate(prospect.id, { prospect_status: value })} placeholder="Select..." renderValue={(value) => <StatusBadge status={value} />} optionType="prospect_status" customOptions={getCustomOptionsForType('prospect_status')} onAddOption={addOption} onDeleteOption={deleteOption} defaultOptions={STATUSES} />
          </td>
        );
      case 'actions':
        return (
          <td key={columnId} className={cellClass} style={style} onPointerDown={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" className={cn("h-7 w-7 hover:bg-muted/50 transition-all duration-200", isMobileTable && "h-6 w-6", isExpanded && "bg-primary/10 text-primary")} onClick={onToggleExpand}>
                <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isMobileTable && "h-3 w-3", isExpanded && "rotate-180")} />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className={cn("h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10", isMobileTable && "h-6 w-6")}><Trash2 className={cn("h-4 w-4", isMobileTable && "h-3 w-3")} /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete prospect?</AlertDialogTitle>
                    <AlertDialogDescription>Are you sure you want to delete {prospect.name}? This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isDeleting ? 'Deleting...' : 'Delete'}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </td>
        );
      default:
        return null;
    }
  };

  const rowStyle = dragHandleProps?.style || {};
  const rowRef = dragHandleProps?.ref;

  // Row-based drag: apply listeners to entire row (except interactive elements)
  const rowDragListeners = dragHandleProps?.listeners || {};

  return (
    <>
      <tr 
        ref={rowRef}
        style={rowStyle}
        {...(dragHandleProps?.attributes || {})}
        {...rowDragListeners}
        className={cn(
          "group transition-colors duration-100 border-b border-border/30 touch-none", 
          isEven ? "bg-muted" : "bg-card", 
          "hover:bg-muted/80", 
          isExpanded && "bg-primary/5 hover:bg-primary/5",
          dragHandleProps?.isDragging && "shadow-lg cursor-grabbing",
          !dragHandleProps?.isDragging && "cursor-grab"
        )}
      >
        {/* Selection checkbox cell */}
        {showSelection && (
          <td className="px-2 py-2" onPointerDown={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
            />
          </td>
        )}
        {columnOrder.map(renderCell)}
      </tr>
      {isExpanded && <InlineReportCard prospect={prospect} onUpdate={onUpdate} onClose={onToggleExpand} colSpan={columnOrder.length} />}
    </>
  );
}
