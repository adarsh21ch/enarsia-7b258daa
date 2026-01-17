import { AlertTriangle } from 'lucide-react';
import { UpgradeDrawer } from './UpgradeDrawer';
import { useLifetimeLeadLimit, FREE_LIFETIME_LEAD_LIMIT, LEAD_WARNING_THRESHOLD } from '@/hooks/useLifetimeLeadLimit';

/**
 * Warning banner shown when free user is approaching lead limit.
 * Shows at 450+ leads with upgrade CTA.
 */
export function LeadLimitWarningBanner() {
  const { showWarning, lifetimeCount, isAtLimit, isPaid } = useLifetimeLeadLimit();

  // Don't show for paid users or if not near limit
  if (isPaid || !showWarning) return null;

  const warningText = isAtLimit
    ? `You've reached the free limit of ${FREE_LIFETIME_LEAD_LIMIT} prospects.`
    : `You've used ${lifetimeCount} of ${FREE_LIFETIME_LEAD_LIMIT} free prospects.`;

  return (
    <div className="rounded-xl p-4 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20 shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-amber-700 dark:text-amber-400 text-sm">
            {warningText}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isAtLimit 
              ? 'Upgrade to Pro for unlimited leads and premium features.'
              : 'Upgrade to Pro for unlimited leads and premium features.'
            }
          </p>
        </div>
        <div className="shrink-0">
          <UpgradeDrawer variant="prominent" triggerText={isAtLimit ? 'Upgrade Now' : 'Upgrade to Pro'} />
        </div>
      </div>
    </div>
  );
}
