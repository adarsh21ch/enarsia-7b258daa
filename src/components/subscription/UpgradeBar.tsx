// Hidden for v1 launch - payment features disabled but code preserved
// To restore: uncomment all code below and remove the "return null" line

import { Lock, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useRazorpay } from '@/hooks/useRazorpay';

interface UpgradeBarProps {
  onUpgrade?: () => void;
}

export function UpgradeBar({ onUpgrade }: UpgradeBarProps) {
  // V1 LAUNCH: Hidden - return null immediately
  return null;

  /* PRESERVED CODE FOR FUTURE RESTORATION:
  const { isPro, loading } = useSubscription();
  const { initiatePayment, loading: paymentLoading } = useRazorpay();

  const handleSubscribe = () => {
    initiatePayment({
      planType: 'monthly',
      onSuccess: () => {
        if (onUpgrade) onUpgrade();
      },
    });
  };

  if (loading || isPro) return null;

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
                Monthly ₹249 (non-refundable) | Yearly ₹2,999 (7-day refund)
              </p>
            </div>
          </div>
          <Button 
            onClick={handleSubscribe}
            disabled={paymentLoading}
            variant="secondary"
            size="sm"
            className="shrink-0 font-semibold"
          >
            {paymentLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1" />
                Unlock Pro
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
  */
}