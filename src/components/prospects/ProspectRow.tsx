import { useState, useEffect, memo, useCallback, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import { Phone, Tag } from 'lucide-react';
import { Prospect, FunnelStage, ActionTaken, ProspectStatus, FUNNEL_STAGES, EXTENDED_ACTIONS, STATUSES, ExtendedActionTaken } from '@/types/prospect';
import { InlineSelect } from './InlineSelect';
import { StatusBadge, StageBadge, ActionBadge } from './StatusBadge';
import { ProspectDetailModal } from './ProspectDetailModal';
import { ResponseTagSheet } from './ResponseTagSheet';
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
      
      case 'action': {
        const actionVal = getActionDisplayValue();
        return (
          <td 
            key={columnId} 
            className={cn(cellClass, "text-right p-0 cursor-pointer hover:bg-muted/40 active:bg-muted/60 transition-colors")} 
            style={{ width: '35%', minWidth: '100px' }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setTagSheetOpen(true);
            }}
            {...(index === 1 ? { 'data-onboarding': 'response-select' } : {})}
          >
            <div className={cn(
              "flex items-center justify-end h-full w-full px-2 py-4",
              isMobileTable && "px-1.5 py-3.5"
            )}>
              {actionVal ? (
                <ActionBadge action={actionVal} />
              ) : (
                <span className="text-muted-foreground/50 text-xs">Select...</span>
              )}
            </div>
          </td>
        );
      }
      
      case 'stage': {
        const stageVal = getStageDisplayValue();
        return (
          <td 
            key={columnId} 
            className={cn(cellClass, "text-right p-0 cursor-pointer hover:bg-muted/40 active:bg-muted/60 transition-colors")} 
            style={{ width: '35%', minWidth: '100px' }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setStageSheetOpen(true);
            }}
          >
            <div className={cn(
              "flex items-center justify-end h-full w-full px-2 py-4",
              isMobileTable && "px-1.5 py-3.5"
            )}>
              {stageVal ? (
                <StageBadge stage={stageVal} />
              ) : (
                <span className="text-muted-foreground/50 text-xs">Select...</span>
              )}
            </div>
          </td>
        );
      }
      
      default:
        return null;
    }
  };

  const rowStyle = dragHandleProps?.style || {};
  const rowRef = dragHandleProps?.ref;
  const rowDragListeners = dragHandleProps?.listeners || {};

  // ===== Premium swipe gestures (iOS-style) =====
  // LEFT swipe → Call (green)   |   RIGHT swipe → Open Response Tag sheet (amber)
  const SWIPE_REVEAL = 110; // width threshold to fully reveal action
  const SWIPE_TRIGGER = 160; // distance to auto-trigger
  const TAG_TRIGGER_RATIO = 0.4; // 40% of viewport width threshold for tag sheet
  const x = useMotionValue(0);

  // LEFT (call) — progressive green surface fade-in as user drags left
  const surfaceOpacity = useTransform(x, [0, -40, -SWIPE_REVEAL], [0, 0.5, 1]);
  const callBtnOpacity = useTransform(x, [-20, -SWIPE_REVEAL * 0.7], [0, 1]);
  const callBtnTranslate = useTransform(x, [0, -SWIPE_REVEAL], [40, 0]);

  // RIGHT (tag) — amber/orange surface fade-in as user drags right
  const tagSurfaceOpacity = useTransform(x, [0, 40, SWIPE_REVEAL], [0, 0.5, 1]);
  const tagBtnOpacity = useTransform(x, [20, SWIPE_REVEAL * 0.7], [0, 1]);
  const tagBtnTranslate = useTransform(x, [0, SWIPE_REVEAL], [-40, 0]);

  // Card depth while dragging
  const cardScale = useMotionValue(1);
  const isSwipingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tagSheetOpen, setTagSheetOpen] = useState(false);
  const [stageSheetOpen, setStageSheetOpen] = useState(false);

  // Safety: reset card position whenever this row's prospect id changes
  // (prevents "stuck shifted" rows after data refetch / virtualization recycle)
  useEffect(() => {
    x.set(0);
    cardScale.set(1);
    setIsDragging(false);
  }, [prospect.id, x, cardScale]);

  const triggerCall = useCallback(() => {
    onMarkLastContacted?.();
    window.open(`tel:${cleanPhoneNumber(prospect.phone)}`, '_self');
  }, [prospect.phone, onMarkLastContacted]);

  const microBounce = useCallback(() => {
    // Micro-bounce on snap back: 1 → 1.02 → 1 over ~80ms
    animate(cardScale, [1, 1.02, 1], { duration: 0.18, ease: 'easeOut' });
  }, [cardScale]);

  const openTagSheet = useCallback(() => {
    // Right-swipe always opens the contextually-correct popup:
    // - Leads tab → Response tag popup
    // - Funnel tab → Stage tag popup
    if (isCalling) setTagSheetOpen(true);
    else setStageSheetOpen(true);
  }, [isCalling]);

  const handleDragStart = useCallback(() => {
    isSwipingRef.current = true;
    setIsDragging(true);
    animate(cardScale, 0.97, { type: 'spring', stiffness: 400, damping: 35 });
  }, [cardScale]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 390;
    const tagThreshold = viewportWidth * TAG_TRIGGER_RATIO;
    setIsDragging(false);

    // Restore scale from drag depth
    animate(cardScale, 1, { type: 'spring', stiffness: 500, damping: 42 });

    const snapBack = () => {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 42 });
    };

    // ===== RIGHT swipe → open Response Tag sheet =====
    if (offset > tagThreshold || (offset > SWIPE_REVEAL && velocity > 650)) {
      snapBack();
      setTimeout(microBounce, 80);
      setTimeout(openTagSheet, 120);
    }
    // ===== LEFT swipe → Call (full swipe or fast flick) =====
    else if (offset < -SWIPE_TRIGGER || velocity < -650) {
      triggerCall();
      snapBack();
      setTimeout(microBounce, 80);
    }
    // ===== Anything else → snap back immediately (no stuck reveal) =====
    else {
      snapBack();
      if (Math.abs(offset) > 20) setTimeout(microBounce, 40);
    }

    setTimeout(() => { isSwipingRef.current = false; }, 50);
  }, [x, cardScale, triggerCall, microBounce, openTagSheet]);

  const handleRevealedCallClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    triggerCall();
    animate(x, 0, { type: 'spring', stiffness: 500, damping: 42 });
    setTimeout(microBounce, 80);
  }, [x, triggerCall, microBounce]);

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
        <td
          colSpan={columnOrder.length}
          className={cn("p-0 relative", bgColor)}
          style={{ padding: '6px 8px' }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Green rounded surface underneath the card (LEFT swipe → call) */}
          <motion.div
            aria-hidden="true"
            style={{
              opacity: surfaceOpacity,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)',
            }}
            className="absolute inset-y-1.5 inset-x-2 pointer-events-none"
          />

          {/* Amber rounded surface underneath the card (RIGHT swipe → tag sheet) */}
          <motion.div
            aria-hidden="true"
            style={{
              opacity: tagSurfaceOpacity,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
            }}
            className="absolute inset-y-1.5 inset-x-2 pointer-events-none"
          />

          {/* Revealed circular Call button (right side, on left-swipe) */}
          <motion.div
            style={{ opacity: callBtnOpacity, x: callBtnTranslate }}
            className="absolute inset-y-0 right-0 flex items-center justify-end pr-5 pointer-events-none"
          >
            <button
              type="button"
              onClick={handleRevealedCallClick}
              aria-label={`Call ${prospect.name}`}
              className="pointer-events-auto flex items-center justify-center text-white active:scale-95 transition-transform"
              style={{
                height: '48px',
                minWidth: '48px',
                width: '48px',
                borderRadius: '9999px',
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(6px)',
                border: '1.5px solid rgba(255,255,255,0.35)',
                boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
              }}
            >
              <motion.span
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="flex items-center justify-center"
              >
                <Phone className="h-6 w-6" fill="currentColor" />
              </motion.span>
            </button>
          </motion.div>

          {/* Revealed Tag icon (left side, on right-swipe) */}
          <motion.div
            aria-hidden="true"
            style={{ opacity: tagBtnOpacity, x: tagBtnTranslate }}
            className="absolute inset-y-0 left-0 flex items-center justify-start pl-5 pointer-events-none"
          >
            <motion.span
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="flex items-center justify-center text-white"
              style={{
                height: '48px',
                width: '48px',
                borderRadius: '9999px',
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(6px)',
                border: '1.5px solid rgba(255,255,255,0.35)',
                boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
              }}
            >
              <Tag className="h-7 w-7" strokeWidth={2.25} />
            </motion.span>
          </motion.div>

          {/* Draggable foreground card (left + right) */}
          <motion.div
            drag="x"
            dragConstraints={{ left: -SWIPE_REVEAL * 1.4, right: SWIPE_REVEAL * 1.4 }}
            dragElastic={0.12}
            dragMomentum={false}
            dragDirectionLock
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            style={{
              x,
              scale: cardScale,
              borderRadius: '16px',
              boxShadow: isDragging
                ? '0 12px 40px rgba(0,0,0,0.15)'
                : 'none',
            }}
            className={cn("relative w-full overflow-hidden", bgColor)}
          >
            <table className="w-full" style={{ tableLayout: 'fixed' }}>
              <tbody>
                <tr className={cn(bgColor, isExpanded && "bg-primary/5")}>
                  {columnOrder.map(renderCell)}
                </tr>
              </tbody>
            </table>
          </motion.div>
        </td>
      </tr>
      <tr className="hidden">
        <td>
          <ProspectDetailModal
            prospect={prospect}
            open={isExpanded}
            onOpenChange={(o) => { if (!o) onToggleExpand(); }}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </td>
      </tr>

      {/* Response Tag popup — opens on tap of Response cell or right-swipe (Leads tab) */}
      {isCalling && (
        <ResponseTagSheet
          open={tagSheetOpen}
          onOpenChange={setTagSheetOpen}
          currentValue={getActionDisplayValue()}
          trackingOptions={leadsTrackingTagNames}
          nonTrackingOptions={leadsNonTrackingTags}
          finalTargetTag={leadsFinalTargetTag}
          stageTag={leadsStageTag}
          onSelect={handleActionChange}
          prospectName={prospect.name}
          title="Response Tag"
        />
      )}

      {/* Stage Tag popup — opens on tap of Stage cell or right-swipe (Funnel tab) */}
      {!isCalling && (
        <ResponseTagSheet
          open={stageSheetOpen}
          onOpenChange={setStageSheetOpen}
          currentValue={getStageDisplayValue()}
          trackingOptions={stageTagNames}
          nonTrackingOptions={stageNonTrackingTags}
          finalTargetTag={stageFinalTargetTag}
          onSelect={handleStageChange}
          prospectName={prospect.name}
          title="Stage Tag"
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
