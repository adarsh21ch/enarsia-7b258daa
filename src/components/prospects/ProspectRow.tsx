import { useState, useEffect, memo, useCallback } from 'react';
import { Prospect, FunnelStage, ActionTaken, ProspectStatus, FUNNEL_STAGES, EXTENDED_ACTIONS, STATUSES, ExtendedActionTaken } from '@/types/prospect';
import { InlineSelect } from './InlineSelect';
import { StatusBadge, StageBadge, ActionBadge } from './StatusBadge';
import { InlineReportCard } from './InlineReportCard';
import { Checkbox } from '@/components/ui/checkbox';
import { CallIconButton, WhatsAppIconButton } from '@/components/ui/ActionIcons';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';

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
  tabType?: 'leads' | 'stage';
  isLastContacted?: boolean;
  onMarkLastContacted?: () => void;
}

export const ProspectRow = memo(function ProspectRow({ 
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
  tabType = 'leads',
  isLastContacted = false,
  onMarkLastContacted,
}: ProspectRowProps) {
  // Optimistic state for instant UI updates
  const [optimisticAction, setOptimisticAction] = useState<ExtendedActionTaken | null>(null);
  const [optimisticStage, setOptimisticStage] = useState<string | null>(null);
  
  const { 
    // Leads tags
    leadsTrackingTags,
    leadsNonTrackingTags,
    leadsTrackingTagNames,
    leadsFinalTargetTag,
    isLeadsFinalTarget,
    leadsStageTag,
    
    // Stage tags
    stageTags,
    stageNonTrackingTags,
    stageTagNames,
    stageFinalTargetTag,
    isStageFinalTarget,
    
    // Helpers
    handleTargetComplete,
    loading: formatLoading 
  } = useTrackingFormatContext();

  // Build dropdown options ONLY from TrackingFormatContext (no custom_options fallback)
  const hasLeadsTrackingTags = leadsTrackingTagNames.length > 0;
  const actionOptions = hasLeadsTrackingTags 
    ? [...leadsTrackingTagNames, ...leadsNonTrackingTags]
    : EXTENDED_ACTIONS;
  
  const hasStageTrackingTags = stageTagNames.length > 0;
  const stageOptions = hasStageTrackingTags
    ? [...stageTagNames, ...stageNonTrackingTags]
    : FUNNEL_STAGES;

  // Clear optimistic state when prospect updates from server
  useEffect(() => {
    setOptimisticAction(null);
    setOptimisticStage(null);
  }, [prospect.action_taken, prospect.funnel_stage]);

  const handleActionChange = useCallback(async (value: ExtendedActionTaken) => {
    // Optimistic update - update UI immediately
    setOptimisticAction(value);
    
    const updates: Partial<Prospect> = {};
    updates.action_taken = value;
    
    // Check if this is the final Leads target tag
    if (isLeadsFinalTarget(value)) {
      handleTargetComplete(value, prospect.name);
    }
    
    const result = await onUpdate(prospect.id, updates);
    // If update fails, revert optimistic state
    if (!result) {
      setOptimisticAction(null);
    }
  }, [prospect.id, prospect.name, onUpdate, isLeadsFinalTarget, handleTargetComplete]);

  const handleStageChange = useCallback(async (value: string) => {
    // Optimistic update - update UI immediately
    setOptimisticStage(value);
    
    const updates: Partial<Prospect> = { funnel_stage: value };
    
    // Check if this is the final Stage target tag
    if (isStageFinalTarget(value)) {
      handleTargetComplete(value, prospect.name);
    }
    
    const result = await onUpdate(prospect.id, updates);
    // If update fails, revert optimistic state
    if (!result) {
      setOptimisticStage(null);
    }
  }, [prospect.id, prospect.name, onUpdate, isStageFinalTarget, handleTargetComplete]);

  const cleanPhoneNumber = (phone: string) => phone.replace(/[^0-9+]/g, '');

  const openWhatsApp = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMarkLastContacted?.();
    const phone = cleanPhoneNumber(prospect.phone);
    const isDesktop = !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const whatsappUrl = isDesktop 
      ? `https://web.whatsapp.com/send?phone=${phone}`
      : `https://wa.me/${phone}`;
    window.open(whatsappUrl, '_blank');
  }, [prospect.phone, onMarkLastContacted]);

  const openCall = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMarkLastContacted?.();
    window.open(`tel:${cleanPhoneNumber(prospect.phone)}`, '_self');
  }, [prospect.phone, onMarkLastContacted]);

  const getActionDisplayValue = (): ExtendedActionTaken | null => {
    // Use optimistic value if available, otherwise use prospect value
    if (optimisticAction !== null) return optimisticAction;
    if (prospect.action_taken === 'Enrollment') return 'Enrollment';
    return prospect.action_taken || null;
  };
  
  const getStageDisplayValue = (): string | null => {
    // Use optimistic value if available, otherwise use prospect value
    if (optimisticStage !== null) return optimisticStage;
    return prospect.funnel_stage || null;
  };

  // Row background color
  const bgColor = isEven ? "bg-card" : "bg-muted";

  const renderCell = (columnId: string) => {
    const cellClass = cn(
      "px-2 py-2.5 whitespace-nowrap",
      isLastContacted ? "bg-primary/10" : (isEven ? "bg-card" : "bg-muted"),
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
        // Show phone number below name (not age/state)
        const phoneDisplay = prospect.phone || '';
        
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
                {/* Phone number below name */}
                {phoneDisplay && (
                  <div className={cn(
                    "text-muted-foreground truncate pl-1",
                    isMobileTable ? "text-[9px]" : "text-[10px]"
                  )} title={phoneDisplay}>
                    {phoneDisplay}
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
              options={actionOptions} 
              onChange={handleActionChange} 
              placeholder="Select..." 
              renderValue={(value) => <ActionBadge action={value} />} 
              showTagSeparation={hasLeadsTrackingTags}
              trackingOptions={leadsTrackingTagNames}
              nonTrackingOptions={leadsNonTrackingTags}
              finalTargetTag={leadsFinalTargetTag}
              stageTag={leadsStageTag}
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
              value={getStageDisplayValue()} 
              options={stageOptions} 
              onChange={handleStageChange} 
              renderValue={(value) => <StageBadge stage={value} />} 
              placeholder="Select..." 
              showTagSeparation={hasStageTrackingTags}
              trackingOptions={stageTagNames}
              nonTrackingOptions={stageNonTrackingTags}
              finalTargetTag={stageFinalTargetTag}
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
}, (prevProps, nextProps) => {
  // Custom comparison for memo - only re-render when these specific props change
  return (
    prevProps.prospect.id === nextProps.prospect.id &&
    prevProps.prospect.action_taken === nextProps.prospect.action_taken &&
    prevProps.prospect.funnel_stage === nextProps.prospect.funnel_stage &&
    prevProps.prospect.name === nextProps.prospect.name &&
    prevProps.prospect.phone === nextProps.prospect.phone &&
    prevProps.index === nextProps.index &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.isEven === nextProps.isEven &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isLastContacted === nextProps.isLastContacted &&
    prevProps.showSelection === nextProps.showSelection &&
    prevProps.isMobileTable === nextProps.isMobileTable
  );
});
