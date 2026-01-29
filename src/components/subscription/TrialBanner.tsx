import { Gift, Clock } from 'lucide-react';
import { useFreeTrial } from '@/hooks/useFreeTrial';
import { cn } from '@/lib/utils';

interface TrialBannerProps {
  className?: string;
  /** The tab/page ID where this banner is rendered (e.g., 'dashboard', 'profile', 'listup') */
  tabId?: string;
}

/**
 * Banner showing active trial status with days/hours remaining.
 * Only renders for free users with an active trial.
 * Admin can configure which tabs show this banner via the admin panel.
 */
export function TrialBanner({ className, tabId }: TrialBannerProps) {
  const { isTrialActive, daysRemaining, hoursRemaining, trialDays, loading, allowedTabs } = useFreeTrial();

  // Don't render if not in active trial or still loading
  if (loading || !isTrialActive) return null;

  // If tabId is provided, only render if this tab is in the allowed list
  if (tabId && !allowedTabs.includes(tabId.toLowerCase())) {
    return null;
  }

  // Determine urgency level for styling
  const isUrgent = daysRemaining <= 1;
  const isLastDay = daysRemaining === 0 && hoursRemaining > 0;

  return (
    <div 
      className={cn(
        "rounded-xl p-3 border transition-all",
        isUrgent 
          ? "bg-amber-500/10 border-amber-500/30"
          : "bg-emerald-500/10 border-emerald-500/30",
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={cn(
          "p-1.5 rounded-full shrink-0",
          isUrgent ? "bg-amber-500/20" : "bg-emerald-500/20"
        )}>
          {isUrgent ? (
            <Clock className={cn("h-4 w-4", isUrgent ? "text-amber-500" : "text-emerald-500")} />
          ) : (
            <Gift className="h-4 w-4 text-emerald-500" />
          )}
        </div>
        <div className="min-w-0">
          <p className={cn(
            "text-sm font-medium truncate",
            isUrgent ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
          )}>
            {isLastDay 
              ? `⏰ ${hoursRemaining}h left in trial!`
              : daysRemaining <= 1 
                ? `⏰ Last day of trial!` 
                : `🎉 ${daysRemaining} days left in your free trial!`
            }
          </p>
          <p className="text-xs text-muted-foreground">
            {trialDays}-day free trial • Full access to all features
          </p>
        </div>
      </div>
    </div>
  );
}