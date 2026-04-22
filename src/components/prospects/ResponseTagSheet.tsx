import { memo, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Star, Check } from 'lucide-react';
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
 * Right-side slide-in Sheet variant of the Response/Stage tag selector.
 *
 * Design intent (per product spec):
 *  - Slides in from the RIGHT (where the Response/Stage column lives) so the
 *    selector appears next to the very cell the user tapped — building muscle
 *    memory and making selection extremely fast.
 *  - Covers ~half the screen on tablet/desktop (max-w-md) and ~70% on mobile,
 *    so the rest of the row stays visible for context.
 *  - Premium glassy surface with backdrop blur; reuses ActionBadge so colours
 *    stay 1:1 with the inline cells.
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
          'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-all duration-150',
          'min-h-[48px] text-left active:scale-[0.97]',
          isSelected
            ? 'border-primary bg-primary/10 shadow-sm'
            : 'border-border/60 bg-card hover:bg-muted/60 hover:border-border'
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <ActionBadge action={option} />
          {showStar && (
            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
          )}
        </div>
        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
      </button>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'p-0 gap-0 flex flex-col',
          // Width: ~70% on mobile, half-screen on tablet/desktop
          'w-[72vw] sm:w-[55vw] md:w-[45vw] lg:w-[38vw] sm:max-w-md',
          'border-l border-border/60',
          'bg-card/95 backdrop-blur-xl',
          'shadow-2xl shadow-black/30'
        )}
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/40 space-y-1">
          <SheetTitle className="text-base font-semibold text-left tracking-tight">
            {title}
          </SheetTitle>
          {prospectName && (
            <p className="text-xs text-muted-foreground text-left truncate font-medium">
              {prospectName}
            </p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Tracking tags section */}
          {trackingOptions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-1">
                Tracking tags (for analytics)
              </p>
              <div className="space-y-1.5">
                {trackingOptions.map((opt) => {
                  const showStar =
                    stageTag === opt ||
                    (finalTargetTag === opt && finalTargetTag !== stageTag);
                  return renderRow(opt, showStar);
                })}
              </div>
            </div>
          )}

          {/* Personal tags section */}
          {nonTrackingOptions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-1">
                Personal tags (not counted)
              </p>
              <div className="space-y-1.5">
                {nonTrackingOptions.map((opt) => renderRow(opt, false))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {trackingOptions.length === 0 && nonTrackingOptions.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No response tags configured yet.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
});
