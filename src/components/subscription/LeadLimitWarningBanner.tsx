import { AlertTriangle } from 'lucide-react';
import { UpgradeDrawer } from './UpgradeDrawer';
import { useLifetimeLeadLimit, FREE_LIFETIME_LEAD_LIMIT } from '@/hooks/useLifetimeLeadLimit';

interface LeadLimitWarningBannerProps {
  /** Compact mode for inline display in action bars */
  compact?: boolean;
  /** Context where banner is displayed - affects messaging */
  context?: 'profile' | 'calling';
}

/**
 * Warning banner shown when free user is approaching lead limit.
 * Shows at 450+ leads with upgrade CTA.
 */
export function LeadLimitWarningBanner({ compact = false, context = 'calling' }: LeadLimitWarningBannerProps) {
  const { showWarning, lifetimeCount, remaining, isAtLimit, isPaid } = useLifetimeLeadLimit();

  // Don't show for paid users or if not near limit
  if (isPaid || !showWarning) return null;

  // Profile-specific messaging
  const getWarningText = () => {
    if (context === 'profile') {
      return isAtLimit
        ? `You've reached the free limit of ${FREE_LIFETIME_LEAD_LIMIT} prospects.`
        : `You are about to reach your free limit of ${FREE_LIFETIME_LEAD_LIMIT} prospects.`;
    }
    return isAtLimit
      ? `You've reached the free limit of ${FREE_LIFETIME_LEAD_LIMIT} prospects.`
      : `⚠️ You're close to your free limit (${remaining} of ${FREE_LIFETIME_LEAD_LIMIT} left).`;
  };

  const getSubText = () => {
    if (context === 'profile') {
      return isAtLimit
        ? 'Upgrade to Pro to continue using NevorAI.'
        : 'Upgrade to Pro for unlimited access.';
    }
    return 'Upgrade to Pro for unlimited prospects.';
  };

  const warningText = getWarningText();
  const subText = getSubText();

  // Compact inline banner for action bars
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
        <span className="text-xs font-medium text-amber-700 dark:text-amber-400 truncate">
          {isAtLimit ? 'Free limit reached' : `${remaining} leads left`}
        </span>
        <UpgradeDrawer 
          variant="compact" 
          triggerText="Upgrade" 
        />
      </div>
    );
  }

  // Full banner for larger areas
  return (
    <div className="rounded-xl p-3 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20 shrink-0">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-amber-700 dark:text-amber-400 text-sm">
            {warningText}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {subText}
          </p>
        </div>
        <div className="shrink-0">
          <UpgradeDrawer 
            variant="prominent" 
            triggerText={isAtLimit ? 'Upgrade Now' : 'Upgrade to Pro'} 
          />
        </div>
      </div>
    </div>
  );
}
