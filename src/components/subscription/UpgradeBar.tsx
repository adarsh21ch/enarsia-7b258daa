import { Lock, Crown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { PLAN_CONFIG, PlanType } from '@/hooks/usePaymentLinks';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';

interface UpgradeBarProps {
  /** Which app context - affects messaging and plan suggestion */
  appContext?: 'neverai' | 'trackup';
  /** Whether to suggest Pro (for team features) or Mini (for basics) */
  suggestPro?: boolean;
  onUpgrade?: () => void;
}

export function UpgradeBar({ appContext = 'neverai', suggestPro = true, onUpgrade }: UpgradeBarProps) {
  const { isPaid, loading, refetch } = useSubscription();
  const { initiatePayment, loading: paymentLoading } = useRazorpay();
  const { toast } = useToast();

  const handleSubscribe = () => {
    const plan: PlanType = suggestPro || appContext === 'neverai' ? 'pro' : 'mini';
    initiatePayment({
      planType: plan,
      onSuccess: () => {
        toast({
          title: "Pro Activated 🎉",
          description: "Welcome to premium! All features are now unlocked.",
        });
        refetch();
        onUpgrade?.();
      },
      onError: (error) => {
        console.error('Payment error:', error);
      }
    });
  };

  if (loading || isPaid) return null;

  const plan: PlanType = suggestPro || appContext === 'neverai' ? 'pro' : 'mini';
  const planConfig = PLAN_CONFIG[plan];
  const PlanIcon = plan === 'pro' ? Crown : Zap;

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
                {planConfig.name} – ₹{planConfig.price}/month
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
            <PlanIcon className="h-4 w-4 mr-1" />
            {paymentLoading ? '...' : 'Unlock'}
          </Button>
        </div>
      </div>
    </div>
  );
}