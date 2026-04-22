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
}

/**
 * Bottom-sheet variant of the Response tag selector.
 * Reuses the EXACT same data, sections, colors and badge component as the
 * existing InlineSelect dropdown — only the presentation surface changes.
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
          'w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl border transition-colors',
          'min-h-[52px] text-left active:scale-[0.98]',
          isSelected
            ? 'border-primary bg-primary/10'
            : 'border-border/60 bg-card hover:bg-muted/60'
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
        side="bottom"
        className="rounded-t-2xl p-0 max-h-[80vh] flex flex-col"
      >
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/40">
          <SheetTitle className="text-base font-semibold text-left">
            Response Tag
          </SheetTitle>
          {prospectName && (
            <p className="text-xs text-muted-foreground text-left truncate">
              {prospectName}
            </p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5 pb-[env(safe-area-inset-bottom)]">
          {/* Tracking tags section */}
          {trackingOptions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 px-1">
                Tracking tags (for analytics)
              </p>
              <div className="space-y-2">
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
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 px-1">
                Personal tags (not counted)
              </p>
              <div className="space-y-2">
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
