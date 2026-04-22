import { memo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  /** Title shown at the top of the popup. Defaults to "Response Tag". */
  title?: string;
}

/**
 * Centered modal popup variant of the Response tag selector.
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 gap-0 overflow-hidden flex flex-col",
          "max-w-[92vw] sm:max-w-md w-[92vw] sm:w-full",
          "max-h-[80vh]",
          "rounded-2xl border border-border/60",
          "shadow-2xl shadow-black/20",
          "bg-card/95 backdrop-blur-xl"
        )}
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/40 space-y-1">
          <DialogTitle className="text-base font-semibold text-left tracking-tight">
            {title}
          </DialogTitle>
          {prospectName && (
            <p className="text-xs text-muted-foreground text-left truncate font-medium">
              {prospectName}
            </p>
          )}
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
});
