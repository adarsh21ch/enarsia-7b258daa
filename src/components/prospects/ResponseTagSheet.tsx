import { memo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Check, X } from 'lucide-react';
import { ActionBadge } from './StatusBadge';
import { cn } from '@/lib/utils';
import type { ExtendedActionTaken } from '@/types/prospect';

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
 * Design intent (per product spec, Apr 2026):
 *  - Sits INSIDE the table area only — between the table header at the top
 *    and the SheetTabs strip at the bottom — instead of covering the whole
 *    screen like a full-height side sheet.
 *  - Slides in from the right edge of the viewport with a soft scale, so the
 *    user keeps spatial context (the row they tapped is still partly visible
 *    on the left) and tag selection feels like a quick "popover" rather than
 *    a modal.
 *  - Mobile-first: occupies ~78vw on phones, ~360px on tablet+, capped so
 *    the table row remains glanceable behind it.
 *
 * Layout offsets are tuned to the Dashboard chrome:
 *    top    ≈ fixed header (logo+tabs) + KPI strip + banners
 *    bottom ≈ SheetTabs strip + BottomNav
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
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const handlePick = useCallback(
    (value: string) => {
      // Toggle off if same value tapped (parity with InlineSelect)
      if (value === currentValue) {
        onSelect('' as ExtendedActionTaken);
      } else {
        onSelect(value as ExtendedActionTaken);
      }
      onOpenChange(false);
    },
    [currentValue, onSelect, onOpenChange]
  );

  const renderRow = (option: string, showStar: boolean) => {
    const isSelected = option === currentValue;
    return (
      <button
        key={option}
        type="button"
        onClick={() => handlePick(option)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border transition-all duration-150',
          'min-h-[34px] text-left active:scale-[0.97]',
          isSelected
            ? 'border-primary bg-primary/10 shadow-sm'
            : 'border-border/60 bg-card/60 hover:bg-muted/60 hover:border-border'
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <ActionBadge action={option} />
          {showStar && (
            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
          )}
        </div>
        {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
      </button>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Tap-outside catcher — transparent, no dimming */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-40 bg-transparent"
            aria-hidden="true"
          />

          {/* Anchored panel — sits between table header and sheet-tabs strip */}
          <motion.div
            role="dialog"
            aria-label={title}
            initial={{ opacity: 0, x: -20, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={cn(
              'fixed left-2 z-50 flex flex-col',
              // Window: starts just below the table header row, ends just
              // above the SheetTabs strip — uses all available table space
              'top-[170px] bottom-[112px]',
              // Slightly wider — still leaves the lead row visible on the right
              'w-[70vw] max-w-[320px] sm:w-[46vw] sm:max-w-[340px]',
              // Premium glassy surface
              'rounded-2xl border border-border/60',
              'bg-popover/95 backdrop-blur-xl',
              'shadow-2xl shadow-black/40',
              'overflow-hidden'
            )}
          >
            {/* Header — compact, with prominent prospect name (Cancel button moved to bottom for thumb reach) */}
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
                      return renderRow(opt, showStar);
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
                    {nonTrackingOptions.map((opt) => renderRow(opt, false))}
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
        </>
      )}
    </AnimatePresence>
  );
});
