import { useState, useRef, useEffect } from 'react';
import { Prospect, FunnelStage, ActionTaken, ProspectStatus, FUNNEL_STAGES, EXTENDED_ACTIONS, STATUSES, ExtendedActionTaken } from '@/types/prospect';
import { InlineSelect } from './InlineSelect';
import { StatusBadge, StageBadge, ActionBadge } from './StatusBadge';
import { InlineReportCard } from './InlineReportCard';
import { Checkbox } from '@/components/ui/checkbox';
import { CallIconButton, WhatsAppIconButton } from '@/components/ui/ActionIcons';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomOptionsContext } from '@/contexts/CustomOptionsContext';
import { useTrackingTags } from '@/hooks/useTrackingTags';

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
  isMobileTable?: boolean;
  selectionModeActive: boolean;
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
  selectionModeActive,
  isMobileTable = false,
  dragHandleProps,
  showSelection = false,
  isSelected = false,
  onToggleSelect,
}: ProspectRowProps) {
  const { addOption, deleteOption, getOptionsForType, getCustomOptionsForType } = useCustomOptionsContext();
  const { callingTrackingTags, stageTrackingTags } = useTrackingTags();

  // Use tracking tags if configured, otherwise fall back to custom options
  const stageOptions = stageTrackingTags.length > 0 
    ? stageTrackingTags 
    : getOptionsForType('funnel_stage', FUNNEL_STAGES) as FunnelStage[];
  const actionOptions = callingTrackingTags.length > 0 
    ? callingTrackingTags 
    : getOptionsForType('action_taken', EXTENDED_ACTIONS) as ExtendedActionTaken[];
  
  // Determine if we're using tracking tags (which means no "Add new" option)
  const useTrackingTagsForStage = stageTrackingTags.length > 0;
  const useTrackingTagsForAction = callingTrackingTags.length > 0;

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

  const openWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(`https://wa.me/${cleanPhoneNumber(prospect.phone)}`, '_blank');
  };

  const openCall = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(`tel:${cleanPhoneNumber(prospect.phone)}`, '_self');
  };

  const getActionDisplayValue = (): ExtendedActionTaken | null => {
    if (prospect.action_taken === 'Enrollment') return 'Enrollment';
    return prospect.action_taken || null;
  };

  // Row background color
  const bgColor = isEven ? "bg-card" : "bg-muted";

  const renderCell = (columnId: string) => {
    const cellClass = cn(
      "px-2 py-2.5 whitespace-nowrap",
      bgColor,
      isMobileTable && "text-xs px-1.5 py-2"
    );
    
    switch (columnId) {
      case 'index':
        return (
          <td 
            key={columnId} 
            className={cn(cellClass, "text-center")} 
            style={{ width: '10%', minWidth: '40px' }}
          >
            <span className={cn(
              "text-xs font-semibold text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5",
              isMobileTable && "text-[10px] px-1"
            )}>
              {index}
            </span>
          </td>
        );
      
      case 'name':
        // Compact info line: "Age, Location"
        const ageValue = (prospect as any).age_or_dob || '';
        const locationValue = prospect.address || '';
        const infoParts = [ageValue, locationValue].filter(Boolean);
        const infoLine = infoParts.length > 0 ? infoParts.join(', ') : '';
        
        return (
          <td 
            key={columnId} 
            className={cellClass} 
            style={{ width: '55%', minWidth: '160px' }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1.5">
              {/* Call + WhatsApp icons */}
              <div className="flex items-center gap-0.5 shrink-0">
                <CallIconButton onClick={openCall} className={isMobileTable ? "p-0.5 h-6 w-6" : "h-7 w-7"} />
                <WhatsAppIconButton onClick={openWhatsApp} className={isMobileTable ? "p-0.5 h-6 w-6" : "h-7 w-7"} />
              </div>
              <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                <button
                  onClick={onToggleExpand}
                  className={cn(
                    "group flex items-center gap-1 text-left font-semibold text-foreground hover:text-primary transition-all duration-200 cursor-pointer bg-transparent border-0 py-0.5 px-1 rounded-md hover:bg-primary/5 active:scale-[0.98]",
                    isMobileTable && "text-xs py-0.5",
                    isExpanded && "text-primary bg-primary/10"
                  )}
                >
                  <span className="truncate" title={prospect.name}>{prospect.name}</span>
                  <span className={cn("transition-transform duration-200 text-muted-foreground group-hover:text-primary shrink-0", isExpanded && "rotate-180")}>
                    <ChevronDown className={cn("h-3 w-3", isMobileTable && "h-2.5 w-2.5")} />
                  </span>
                </button>
                {/* Compact info: Age, Location */}
                {infoLine && (
                  <div className={cn(
                    "text-muted-foreground truncate pl-1",
                    isMobileTable ? "text-[9px]" : "text-[10px]"
                  )} title={infoLine}>
                    {infoLine}
                  </div>
                )}
              </div>
            </div>
          </td>
        );
      
      case 'action':
        return (
          <td 
            key={columnId} 
            className={cellClass} 
            style={{ width: '35%', minWidth: '100px' }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <InlineSelect 
              value={getActionDisplayValue()} 
              options={isCalling ? actionOptions : actionOptions.filter(a => a !== 'Enrollment')} 
              onChange={handleActionChange} 
              placeholder="Select..." 
              renderValue={(value) => <ActionBadge action={value} />} 
              optionType={useTrackingTagsForAction ? undefined : "action_taken"}
              customOptions={useTrackingTagsForAction ? [] : getCustomOptionsForType('action_taken')} 
              onAddOption={useTrackingTagsForAction ? undefined : addOption} 
              onDeleteOption={useTrackingTagsForAction ? undefined : deleteOption} 
              defaultOptions={EXTENDED_ACTIONS}
              hideAddNew={useTrackingTagsForAction}
            />
          </td>
        );
      
      case 'stage':
        return (
          <td 
            key={columnId} 
            className={cellClass} 
            style={{ width: '35%', minWidth: '100px' }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <InlineSelect 
              value={prospect.funnel_stage} 
              options={stageOptions} 
              onChange={(value) => onUpdate(prospect.id, { funnel_stage: value })} 
              renderValue={(value) => <StageBadge stage={value} />} 
              placeholder="Select..." 
              optionType={useTrackingTagsForStage ? undefined : "funnel_stage"}
              customOptions={useTrackingTagsForStage ? [] : getCustomOptionsForType('funnel_stage')} 
              onAddOption={useTrackingTagsForStage ? undefined : addOption} 
              onDeleteOption={useTrackingTagsForStage ? undefined : deleteOption} 
              defaultOptions={FUNNEL_STAGES}
              hideAddNew={useTrackingTagsForStage}
            />
          </td>
        );
      
      default:
        return null;
    }
  };

  const rowStyle = dragHandleProps?.style || {};
  const rowRef = dragHandleProps?.ref;
  const rowDragListeners = dragHandleProps?.listeners || {};

  return (
    <>
      <tr 
        ref={rowRef}
        style={rowStyle}
        {...(dragHandleProps?.attributes || {})}
        {...rowDragListeners}
        className={cn(
          "group transition-colors duration-100 border-b border-border/30", 
          bgColor,
          "hover:bg-muted/80", 
          isExpanded && "bg-primary/5 hover:bg-primary/5",
          dragHandleProps?.isDragging && "shadow-lg cursor-grabbing touch-none",
          !dragHandleProps?.isDragging && "cursor-grab"
        )}
      >
        {/* Selection checkbox cell */}
        {showSelection && (
          <td 
            className={cn("px-2 py-2", bgColor)} 
            style={{ width: '40px' }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
            />
          </td>
        )}
        {columnOrder.map(renderCell)}
      </tr>
      {isExpanded && (
        <InlineReportCard 
          prospect={prospect} 
          onUpdate={onUpdate} 
          onDelete={onDelete}
          onClose={onToggleExpand} 
          colSpan={columnOrder.length + (showSelection ? 1 : 0)} 
        />
      )}
    </>
  );
}