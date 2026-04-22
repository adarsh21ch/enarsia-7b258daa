import { useState, useEffect, memo, useCallback, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import { Phone } from 'lucide-react';
import { Prospect, FunnelStage, ActionTaken, ProspectStatus, FUNNEL_STAGES, EXTENDED_ACTIONS, STATUSES, ExtendedActionTaken } from '@/types/prospect';
import { InlineSelect } from './InlineSelect';
import { StatusBadge, StageBadge, ActionBadge } from './StatusBadge';
import { InlineReportCard } from './InlineReportCard';
import { Checkbox } from '@/components/ui/checkbox';
import { CallIconButton } from '@/components/ui/ActionIcons';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { getTagColor } from '@/lib/tagColors';

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
  onDelete: (id: string) => Promise<boolean | Prospect | null>;
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

  // Build dropdown options: merge tracking + personal, fallback only when BOTH empty
  const combinedLeadsOptions = [...leadsTrackingTagNames, ...leadsNonTrackingTags];
  const actionOptions = combinedLeadsOptions.length > 0 
    ? combinedLeadsOptions
    : EXTENDED_ACTIONS;
  
  const combinedStageOptions = [...stageTagNames, ...stageNonTrackingTags];
  const stageOptions = combinedStageOptions.length > 0
    ? combinedStageOptions
    : FUNNEL_STAGES;
  
  // Show tag separation when we have any configured tags (tracking or personal)
  const showLeadsTagSeparation = leadsTrackingTagNames.length > 0 || leadsNonTrackingTags.length > 0;
  const showStageTagSeparation = stageTagNames.length > 0 || stageNonTrackingTags.length > 0;

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

  // Row background color and left accent
  const bgColor = isEven ? "bg-card" : "bg-muted";
  const activeTag = isCalling ? getActionDisplayValue() : getStageDisplayValue();
  const accentColor = activeTag ? getTagColor(activeTag, isCalling ? 'response' : 'stage') : null;

  const renderCell = (columnId: string) => {
    const cellClass = cn(
      "px-2 py-4 whitespace-nowrap",
      isLastContacted ? "bg-primary/10" : (isEven ? "bg-card" : "bg-muted"),
      isMobileTable && "text-xs px-1.5 py-3.5"
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
        // Show phone number and age/city below name
        const phoneDisplay = prospect.phone || '';
        const ageCityParts: string[] = [];
        if (prospect.age_or_dob) ageCityParts.push(prospect.age_or_dob);
        if (prospect.address) ageCityParts.push(prospect.address);
        const ageCityDisplay = ageCityParts.join(', ');
        
        return (
          <td 
            key={columnId} 
            className={cellClass} 
            style={{ width: '55%', minWidth: '160px' }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              {/* Call icon */}
              <CallIconButton onClick={openCall} color={accentColor || undefined} className={isMobileTable ? "h-8 w-8" : "h-8 w-8"} />
              <button
                onClick={onToggleExpand}
                className={cn(
                  "group flex items-center gap-1 flex-1 min-w-0 text-left cursor-pointer bg-transparent border-0 py-0.5 px-1 rounded-md hover:bg-primary/5 active:scale-[0.98] transition-all duration-200",
                  isExpanded && "bg-primary/10"
                )}
              >
                <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                  <span className={cn(
                    "font-semibold text-foreground group-hover:text-primary truncate transition-colors",
                    isMobileTable && "text-xs",
                    isExpanded && "text-primary"
                  )} title={prospect.name}>
                    {prospect.name}
                    {(prospect as any).is_demo && (
                      <span className="ml-1.5 inline-flex items-center px-1.5 py-0 rounded text-[9px] font-semibold bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400 leading-tight">
                        DEMO
                      </span>
                    )}
                  </span>
                  {/* Phone number below name */}
                  {phoneDisplay && (
                    <span className={cn(
                      "text-muted-foreground truncate",
                      isMobileTable ? "text-[10px]" : "text-[11px]"
                    )} title={phoneDisplay}>
                      {phoneDisplay}
                    </span>
                  )}
                  {/* Age, City below phone */}
                  {ageCityDisplay && (
                    <span className={cn(
                      "text-muted-foreground/70 truncate",
                      isMobileTable ? "text-[8px]" : "text-[9px]"
                    )} title={ageCityDisplay}>
                      {ageCityDisplay}
                    </span>
                  )}
                </div>
                {/* Chevron indicator for expandable */}
                <ChevronRight className={cn(
                  "h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-transform duration-200",
                  isMobileTable && "h-3 w-3",
                  isExpanded && "rotate-90 text-primary"
                )} />
              </button>
            </div>
          </td>
        );
      
      case 'action':
        return (
          <td 
            key={columnId} 
            className={cn(cellClass, "text-right")} 
            style={{ width: '35%', minWidth: '100px' }}
            onPointerDown={(e) => e.stopPropagation()}
            {...(index === 1 ? { 'data-onboarding': 'response-select' } : {})}
          >
            <div className="flex justify-end">
              <InlineSelect 
                value={getActionDisplayValue()} 
                options={actionOptions} 
                onChange={handleActionChange} 
                placeholder="Select..." 
                renderValue={(value) => <ActionBadge action={value} />} 
                showTagSeparation={showLeadsTagSeparation}
                trackingOptions={leadsTrackingTagNames}
                nonTrackingOptions={leadsNonTrackingTags}
                finalTargetTag={leadsFinalTargetTag}
                stageTag={leadsStageTag}
              />
            </div>
          </td>
        );
      
      case 'stage':
        return (
          <td 
            key={columnId} 
            className={cn(cellClass, "text-right")} 
            style={{ width: '35%', minWidth: '100px' }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <InlineSelect 
                value={getStageDisplayValue()} 
                options={stageOptions} 
                onChange={handleStageChange} 
                renderValue={(value) => <StageBadge stage={value} />} 
                placeholder="Select..." 
                showTagSeparation={showStageTagSeparation}
                trackingOptions={stageTagNames}
                nonTrackingOptions={stageNonTrackingTags}
                finalTargetTag={stageFinalTargetTag}
              />
            </div>
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
        {...(index === 1 ? { 'data-onboarding': 'lead-row-1' } : {})}
        className={cn(
          "group transition-colors duration-100 border-b border-border/20", 
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
            className={cn("px-2 py-3.5", bgColor)} 
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
    prevProps.prospect.age_or_dob === nextProps.prospect.age_or_dob &&
    prevProps.prospect.address === nextProps.prospect.address &&
    prevProps.index === nextProps.index &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.isEven === nextProps.isEven &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isLastContacted === nextProps.isLastContacted &&
    prevProps.showSelection === nextProps.showSelection &&
    prevProps.isMobileTable === nextProps.isMobileTable
  );
});
