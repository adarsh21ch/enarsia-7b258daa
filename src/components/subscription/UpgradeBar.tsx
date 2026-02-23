import { Lock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/contexts/PermissionsContext';
import { usePaymentLinks } from '@/hooks/usePaymentLinks';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { useLeadLimit } from '@/hooks/useLeadLimit';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { useSubscription } from '@/hooks/useSubscription';
import { getTierDisplayName } from '@/config/tierLabels';

interface UpgradeBarProps {
  /** Which app context - affects messaging and plan suggestion */
  appContext?: 'nevorai' | 'trackup';
  /** Whether to suggest Pro (for team features) or Mini (for basics) */
  suggestPro?: boolean;
  onUpgrade?: () => void;
}

/**
 * Floating upgrade bar shown when free user exceeds threshold.
 * NOW USES DYNAMIC PLANS AND THRESHOLDS FROM ADMIN CONFIG.
 */
export function UpgradeBar({ appContext = 'nevorai', suggestPro = true, onUpgrade }: UpgradeBarProps) {
  const { isPaid, isLoading } = usePermissions();
  const { refetch } = useSubscription();
  const { currentCount } = useLeadLimit();
  const { initiatePayment, loading: paymentLoading } = useRazorpay();
  const { toast } = useToast();
  const { getDefaultPlan } = usePaymentLinks();
  const { config } = useAdminConfig();

  // Get dynamic threshold from admin config (default 500)
  const upgradeThreshold = config.limits.warning_threshold_1 ?? 500;
  
  // Get default plan dynamically
  const defaultPlan = getDefaultPlan();

  const handleSubscribe = () => {
    const planKey = defaultPlan?.plan_key || 'quarterly';
    const tierLabel = defaultPlan ? getTierDisplayName(defaultPlan.tier) : 'Plan';
    initiatePayment({
      planType: planKey,
      onSuccess: () => {
        toast({
          title: `${tierLabel} Plan Activated 🎉`,
          description: "All features are now unlocked.",
        });
        refetch();
        onUpgrade?.();
      },
      onError: (error) => {
        console.error('Payment error:', error);
      }
    });
  };

  // Hide upgrade bar for paid users OR free users below threshold
  if (isLoading || isPaid || currentCount < upgradeThreshold) return null;

  // Calculate duration text dynamically
  const months = defaultPlan ? Math.round(defaultPlan.durationDays / 30) : 4;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 px-4 pb-2">
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-4 shadow-2xl shadow-primary/30 border border-primary/20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20">
              <Lock className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-foreground">
                🔒 Upgrade to unlock this feature
              </p>
              <p className="text-xs text-primary-foreground/80">
                {defaultPlan?.name || 'Pro Plan'} – ₹{defaultPlan?.price || 299} for {months} month{months > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button 
            onClick={handleSubscribe}
            variant="secondary"
            size="sm"
            className="shrink-0 font-semibold"
            disabled={paymentLoading}
          >
            <Crown className="h-4 w-4 mr-1" />
            {paymentLoading ? '...' : 'Unlock'}
          </Button>
        </div>
      </div>
    </div>
  );
}
