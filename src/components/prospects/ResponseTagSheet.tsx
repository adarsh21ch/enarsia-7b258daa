import { memo, useCallback } from 'react';
import { Star, Check, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ActionBadge } from './StatusBadge';
import { cn } from '@/lib/utils';
import { getTagColor } from '@/lib/tagColors';
import type { ExtendedActionTaken } from '@/types/prospect';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';

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
  /** Title shown at the top of the dialog. Defaults to "Response Tag". */
  title?: string;
}

/**
 * Centered tag-picker modal — used everywhere a response / stage tag is
 * picked (Leads card + table, Funnel card + table, mobile + desktop).
 *
 * Built on shadcn Dialog so it is ALWAYS centered with a dark backdrop on
 * every viewport. Never a side panel, never a bottom sheet.
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
  const { loading: tagsLoading } = useTrackingFormatContext();

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
    [currentValue, onSelect, onOpenChange],
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
            : 'border-border/50 bg-card/50 hover:bg-muted/50 hover:border-border',
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-label={title}
        className={cn(
          // Centered on every viewport (Radix Dialog handles fixed-center +
          // dark backdrop + Esc/backdrop dismissal automatically).
          'p-0 gap-0 overflow-hidden flex flex-col',
          'w-[calc(100%-32px)] max-w-md max-h-[80vh]',
          'rounded-2xl border border-border/60 shadow-2xl',
          'bg-popover/95 backdrop-blur-xl',
          // Hide default close button — we render our own Cancel footer.
          '[&>button]:hidden',
        )}
      >
        {/* Header — compact, with prominent prospect name */}
        <div className="px-3.5 pt-3 pb-2.5 border-b border-border/40 shrink-0">
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
          {tagsLoading && trackingOptions.length === 0 && nonTrackingOptions.length === 0 ? (
            <div className="space-y-2 py-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[52px] rounded-xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
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

              {trackingOptions.length === 0 && nonTrackingOptions.length === 0 && (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No response tags configured yet.
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky Cancel footer — large tap target */}
        <div className="border-t border-border/40 p-2.5 bg-popover/95 backdrop-blur-xl shrink-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn(
              'w-full flex items-center justify-center gap-1.5',
              'min-h-[44px] rounded-xl',
              'bg-muted/60 hover:bg-muted active:scale-[0.98]',
              'text-sm font-semibold text-foreground',
              'border border-border/60',
              'transition-all duration-150',
            )}
          >
            <X className="h-4 w-4" />
            <span>Cancel</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
});
