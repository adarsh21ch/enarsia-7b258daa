import { memo, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Star, Check, X } from 'lucide-react';
import { ActionBadge } from './StatusBadge';
import { cn } from '@/lib/utils';
import { getTagColor } from '@/lib/tagColors';
import type { ExtendedActionTaken } from '@/types/prospect';

// Light haptic feedback (mobile only; no-op on desktop / unsupported)
function triggerHaptic() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(8);
    }
  } catch {
    /* ignore */
  }
}

interface ResponseTagSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentValue: ExtendedActionTaken | null;
  trackingOptions: readonly string[];
  nonTrackingOptions: readonly string[];
  finalTargetTag?: string | null;
  stageTag?: string | null;
  onSelect: (value: ExtendedActionTaken) => void;
  prospectName?: string;
  /** Title shown at the top of the sheet. Defaults to "Response Tag". */
  title?: string;
}

/**
 * Compact anchored tag-picker panel.
 *
 * Scroll-freeze fix (Apr 2026):
 *  - No AnimatePresence + no full-screen backdrop overlay. Previously the
 *    backdrop lingered during exit animation, blocking touches on the table
 *    below for 1-2s after dismissal. Now the panel unmounts instantly on
 *    close so the table is immediately scrollable.
 *  - Outside-tap dismissal uses a window-level pointerdown listener that
 *    only fires when the panel is open — no DOM overlay required.
 *  - `will-change: transform` keeps the panel composited so the enter
 *    animation doesn't fight with table scroll.
 */
export const ResponseTagSheet = memo(function ResponseTagSheet({
  open,
  onOpenChange,
  currentValue,
  trackingOptions,
  nonTrackingOptions,
  finalTargetTag = null,
  stageTag = null,
  onSelect,
  prospectName,
  title = 'Response Tag',
}: ResponseTagSheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  // Outside-tap dismissal — no DOM overlay, so the table below stays
  // immediately interactive (no scroll freeze after close).
  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (panelRef.current && target && panelRef.current.contains(target)) return;
      onOpenChange(false);
    };
    // Defer one tick so the opening tap doesn't immediately close it
    const id = window.setTimeout(() => {
      window.addEventListener('pointerdown', handlePointer, true);
    }, 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('pointerdown', handlePointer, true);
    };
  }, [open, onOpenChange]);

  const handlePick = useCallback(
    (value: string) => {
      triggerHaptic();
      // Single-select: applying a new tag replaces the old one.
      // Tapping the already-selected row clears it (parity with InlineSelect).
      if (value === currentValue) {
        onSelect('' as ExtendedActionTaken);
      } else {
        onSelect(value as ExtendedActionTaken);
      }
      onOpenChange(false);
    },
    [currentValue, onSelect, onOpenChange]
  );

  const renderRow = (option: string, showStar: boolean, tagType: 'response' | 'stage') => {
    const isSelected = option === currentValue;
    const color = getTagColor(option, tagType);
    return (
      <button
        key={option}
        type="button"
        onClick={() => handlePick(option)}
        className={cn(
          'group w-full flex items-center justify-between gap-2 px-3 rounded-xl border transition-all duration-150',
          'min-h-[52px] text-left active:scale-[0.985]',
          isSelected
            ? 'shadow-sm'
            : 'border-border/50 bg-card/50 hover:bg-muted/50 hover:border-border'
        )}
        style={
          isSelected
            ? {
                backgroundColor: `${color}1F`,
                borderColor: `${color}66`,
              }
            : undefined
        }
      >
        <div className="flex items-center gap-2 min-w-0">
          <ActionBadge action={option} />
          {showStar && (
            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
          )}
        </div>
        {isSelected && (
          <div
            className="flex items-center justify-center h-6 w-6 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          >
            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
          </div>
        )}
      </button>
    );
  };

  // Unmount instantly on close — no exit animation, no lingering overlay.
  if (!open) return null;

  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-label={title}
      initial={{ opacity: 0, x: 20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      style={{ willChange: 'transform' }}
      className={cn(
        'fixed right-2 z-50 flex flex-col',
        // Window: starts just below the table header row, ends just
        // above the SheetTabs strip — uses all available table space
        'top-[170px] bottom-[112px]',
        // Width — slightly wider than original for readability, but not
        // covering the whole screen
        'w-[75vw] max-w-[340px] sm:w-[50vw] sm:max-w-[360px]',
        // Premium glassy surface
        'rounded-2xl border border-border/60',
        'bg-popover/95 backdrop-blur-xl',
        'shadow-2xl shadow-black/40',
        'overflow-hidden'
      )}
    >
      {/* Header — compact, with prominent prospect name */}
      <div className="px-3.5 pt-3 pb-2.5 border-b border-border/40">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          {prospectName && (
            <p className="text-sm text-foreground truncate font-semibold tracking-tight leading-snug">
              {prospectName}
            </p>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* Tracking tags */}
        {trackingOptions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-1">
              Tracking (analytics)
            </p>
            <div className="space-y-1">
              {trackingOptions.map((opt) => {
                const showStar =
                  stageTag === opt ||
                  (finalTargetTag === opt && finalTargetTag !== stageTag);
                return renderRow(opt, showStar, 'response');
              })}
            </div>
          </div>
        )}

        {/* Personal tags */}
        {nonTrackingOptions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-1">
              Personal (not counted)
            </p>
            <div className="space-y-1">
              {nonTrackingOptions.map((opt) => renderRow(opt, false, 'response'))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {trackingOptions.length === 0 &&
          nonTrackingOptions.length === 0 && (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No response tags configured yet.
            </div>
          )}
      </div>

      {/* Sticky Cancel footer — large tap target for easy thumb access */}
      <div className="border-t border-border/40 p-2.5 bg-popover/95 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className={cn(
            'w-full flex items-center justify-center gap-1.5',
            'min-h-[44px] rounded-xl',
            'bg-muted/60 hover:bg-muted active:scale-[0.98]',
            'text-sm font-semibold text-foreground',
            'border border-border/60',
            'transition-all duration-150'
          )}
        >
          <X className="h-4 w-4" />
          <span>Cancel</span>
        </button>
      </div>
    </motion.div>
  );
});
