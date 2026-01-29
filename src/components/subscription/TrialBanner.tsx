import { Gift, Clock, Crown } from 'lucide-react';
import { useFreeTrial } from '@/hooks/useFreeTrial';
import { useSubscription } from '@/hooks/useSubscription';
import { usePaymentLinks } from '@/hooks/usePaymentLinks';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TrialBannerProps {
  className?: string;
  /** The tab/page ID where this banner is rendered (e.g., 'dashboard', 'profile', 'listup') */
  tabId?: string;
}

/**
 * Compact single-line banner showing active trial status.
 * Clickable to initiate upgrade payment.
 * Only renders for free users with an active trial.
 */
export function TrialBanner({ className, tabId }: TrialBannerProps) {
  const { isTrialActive, daysRemaining, hoursRemaining, loading, allowedTabs } = useFreeTrial();
  const { refetch } = useSubscription();
  const { initiatePayment, loading: paymentLoading } = useRazorpay();
  const { toast } = useToast();
  const { getDefaultPlan, loading: plansLoading } = usePaymentLinks();

  // Don't render if not in active trial or still loading
  if (loading || !isTrialActive) return null;

  // If tabId is provided, only render if this tab is in the allowed list
  if (tabId && !allowedTabs.includes(tabId.toLowerCase())) {
    return null;
  }

  const defaultPlan = getDefaultPlan();

  const handleUpgrade = () => {
    const planKey = defaultPlan?.plan_key || 'quarterly';
    initiatePayment({
      planType: planKey,
      onSuccess: () => {
        toast({
          title: "Pro Activated 🎉",
          description: "Welcome to premium! All features are now unlocked.",
        });
        refetch();
      },
      onError: (error) => {
        console.error('Payment error:', error);
      }
    });
  };

  // Determine urgency level for styling
  const isUrgent = daysRemaining <= 1;
  const isLastDay = daysRemaining === 0 && hoursRemaining > 0;

  const displayText = isLastDay 
    ? `⏰ ${hoursRemaining}h left in trial`
    : daysRemaining <= 1 
      ? `⏰ Last day of trial!` 
      : `🎉 ${daysRemaining} days left in your free trial`;

  const isLoading = paymentLoading || plansLoading;

  return (
    <button 
      onClick={handleUpgrade}
      disabled={isLoading}
      className={cn(
        "w-full rounded-lg px-3 py-2 border transition-all flex items-center justify-between gap-2",
        "hover:opacity-90 active:scale-[0.99] disabled:opacity-50",
        isUrgent 
          ? "bg-amber-500/10 border-amber-500/30"
          : "bg-emerald-500/10 border-emerald-500/30",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className={cn(
          "p-1 rounded-full shrink-0",
          isUrgent ? "bg-amber-500/20" : "bg-emerald-500/20"
        )}>
          {isUrgent ? (
            <Clock className={cn("h-3 w-3", isUrgent ? "text-amber-500" : "text-emerald-500")} />
          ) : (
            <Gift className="h-3 w-3 text-emerald-500" />
          )}
        </div>
        <span className={cn(
          "text-xs font-medium truncate",
          isUrgent ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
        )}>
          {displayText}
        </span>
      </div>
      <div className="flex items-center gap-1 text-xs font-medium text-primary shrink-0">
        <Crown className="h-3 w-3" />
        <span>{isLoading ? '...' : 'Upgrade'}</span>
      </div>
    </button>
  );
}
