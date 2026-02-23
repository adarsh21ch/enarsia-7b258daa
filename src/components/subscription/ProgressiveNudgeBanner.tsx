import { useState, useEffect } from 'react';
import { Info, AlertTriangle, X, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UpgradeDrawer } from './UpgradeDrawer';
import { useUpgradeNudge, NUDGE_THRESHOLDS } from '@/hooks/useUpgradeNudge';
import { cn } from '@/lib/utils';

interface ProgressiveNudgeBannerProps {
  /** Where banner is displayed - affects sticky behavior for stage 3 */
  context?: 'calling' | 'profile';
}

/**
 * Progressive upgrade nudge banners based on prospect count.
 * Non-spammy, value-based messaging with proper dismissal tracking.
 */
export function ProgressiveNudgeBanner({ context = 'calling' }: ProgressiveNudgeBannerProps) {
  const {
    currentStage,
    lifetimeCount,
    remainingToLimit,
    isPaid,
    shouldShowStage1,
    shouldShowStage2,
    shouldShowStage3,
    dismissStage1,
    dismissStage2,
  } = useUpgradeNudge();

  // Local dismissed state for immediate UI response
  const [stage1Dismissed, setStage1Dismissed] = useState(false);
  const [stage2Dismissed, setStage2Dismissed] = useState(false);

  // Sync with storage on mount
  useEffect(() => {
    setStage1Dismissed(!shouldShowStage1 && currentStage === 'stage1');
    setStage2Dismissed(!shouldShowStage2 && currentStage === 'stage2');
  }, [shouldShowStage1, shouldShowStage2, currentStage]);

  // Don't show anything for paid users or if no stage applies
  if (isPaid || currentStage === 'none' || currentStage === 'stage4') {
    return null;
  }

  // STAGE 1: Soft informational banner (800+ prospects)
  if (currentStage === 'stage1') {
    if (stage1Dismissed || !shouldShowStage1) return null;

    const handleDismiss = () => {
      setStage1Dismissed(true);
      dismissStage1();
    };

    return (
      <div className="rounded-lg p-3 bg-muted/50 border border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-md bg-primary/10 shrink-0 mt-0.5">
            <Info className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground font-medium">
              You're managing a large prospect list now
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Power users usually upgrade before reaching the limit.
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <UpgradeDrawer 
              variant="compact" 
              triggerText="Learn more" 
            />
            <button
              onClick={handleDismiss}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STAGE 2: Soft highlighted banner (900+ prospects)
  if (currentStage === 'stage2') {
    if (stage2Dismissed || !shouldShowStage2) return null;

    const handleDismiss = () => {
      setStage2Dismissed(true);
      dismissStage2();
    };

    return (
      <div className="rounded-lg p-3 bg-amber-500/10 border border-amber-500/30 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-md bg-amber-500/20 shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
              You're approaching the free limit
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-0.5">
              Upgrade anytime for uninterrupted access. {remainingToLimit} prospects remaining.
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <UpgradeDrawer 
              variant="compact" 
              triggerText="Upgrade when ready" 
            />
            <button
              onClick={handleDismiss}
              className="p-1 text-amber-600/70 hover:text-amber-700 dark:text-amber-400/70 dark:hover:text-amber-300 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STAGE 3: Sticky visible banner (950+ prospects)
  if (currentStage === 'stage3' && shouldShowStage3) {
    return (
      <div className="rounded-xl p-3 bg-gradient-to-r from-amber-500/20 via-amber-500/15 to-amber-500/10 border border-amber-500/40">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/25 shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-amber-800 dark:text-amber-200 text-sm">
              You're very close to the free limit
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-0.5">
              Only {remainingToLimit} prospects left. Upgrade now to avoid interruptions.
            </p>
          </div>
          <div className="shrink-0">
            <UpgradeDrawer 
              variant="prominent" 
              triggerText="Upgrade Now" 
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
