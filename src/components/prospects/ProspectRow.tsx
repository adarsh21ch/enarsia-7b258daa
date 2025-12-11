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

  const stageOptions = getOptionsForType('funnel_stage', FUNNEL_STAGES) as FunnelStage[];
  const actionOptions = getOptionsForType('action_taken', EXTENDED_ACTIONS) as ExtendedActionTaken[];

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

  // Row background color
  const bgColor = isEven ? "bg-card" : "bg-muted/30";

  const renderCell = (columnId: string) => {
    const cellClass = cn(
      "px-1.5 py-1.5 whitespace-nowrap",
      bgColor,
      isMobileTable && "text-xs px-1 py-1"
    );
    
    switch (columnId) {
      case 'index':
        return (
          <td 
            key={columnId} 
            className={cn(cellClass, "text-center")} 
            style={{ width: '10%', minWidth: '36px' }}
          >
            <span className={cn(
              "text-[10px] font-medium text-muted-foreground",
              isMobileTable && "text-[9px]"
            )}>
              {index}
            </span>
          </td>
        );
      
      case 'name':
        const ageValue = (prospect as any).age_or_dob || '';
        const locationValue = prospect.address || '';
        const infoParts = [ageValue, locationValue].filter(Boolean);
        const infoLine = infoParts.length > 0 ? infoParts.join(', ') : '';
        const isEnrolled = prospect.action_taken === 'Enrollment' || prospect.enrollment_status === 'Enrolled';
        
        return (
          <td 
            key={columnId} 
            className={cellClass} 
            style={{ width: '55%', minWidth: '140px' }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1">
              {/* Compact Call + WhatsApp icons */}
              <div className="flex items-center gap-0 shrink-0">
                <CallIconButton onClick={openCall} className={cn("h-6 w-6 p-0.5", isMobileTable && "h-5 w-5")} />
                <WhatsAppIconButton onClick={openWhatsApp} className={cn("h-6 w-6 p-0.5", isMobileTable && "h-5 w-5")} />
              </div>
              <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <button
                    onClick={onToggleExpand}
                    className={cn(
                      "group flex items-center gap-0.5 text-left font-medium text-foreground hover:text-primary transition-colors cursor-pointer bg-transparent border-0 py-0 px-0.5 rounded hover:bg-primary/5",
                      isMobileTable ? "text-xs" : "text-sm",
                      isExpanded && "text-primary"
                    )}
                  >
                    <span className="truncate" title={prospect.name}>{prospect.name}</span>
                    <ChevronDown className={cn(
                      "h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0 transition-transform",
                      isExpanded && "rotate-180",
                      isMobileTable && "h-2.5 w-2.5"
                    )} />
                  </button>
                  {/* Enrolled pill - shown in Filter tab when prospect is enrolled */}
                  {!isCalling && isEnrolled && (
                    <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-medium rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      Enrolled
                    </span>
                  )}
                </div>
                {infoLine && (
                  <div className={cn(
                    "text-muted-foreground truncate pl-0.5",
                    isMobileTable ? "text-[8px]" : "text-[9px]"
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
              optionType="action_taken" 
              customOptions={getCustomOptionsForType('action_taken')} 
              onAddOption={addOption} 
              onDeleteOption={deleteOption} 
              defaultOptions={EXTENDED_ACTIONS}
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
              optionType="funnel_stage" 
              customOptions={getCustomOptionsForType('funnel_stage')} 
              onAddOption={addOption} 
              onDeleteOption={deleteOption} 
              defaultOptions={FUNNEL_STAGES}
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
          "group transition-colors duration-75 border-b border-border/20", 
          bgColor,
          "hover:bg-muted/50", 
          isExpanded && "bg-primary/5 hover:bg-primary/5",
          dragHandleProps?.isDragging && "shadow-md cursor-grabbing touch-none",
          !dragHandleProps?.isDragging && "cursor-grab"
        )}
      >
        {showSelection && (
          <td 
            className={cn("px-1.5 py-1", bgColor)} 
            style={{ width: '32px' }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              className="h-3.5 w-3.5"
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