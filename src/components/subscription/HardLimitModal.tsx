import { useState, useEffect } from 'react';
import { Crown, AlertTriangle, MessageCircle, Star, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpgradeNudge, NUDGE_THRESHOLDS } from '@/hooks/useUpgradeNudge';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { PLAN_CONFIG, PlanType } from '@/hooks/usePaymentLinks';

interface HardLimitModalProps {
  /** External control for modal visibility */
  forceOpen?: boolean;
  /** Callback when modal is closed */
  onClose?: () => void;
}

/**
 * One-time blocking modal shown when user hits the 1000 prospect limit.
 * Only shows once per session, does not re-show after dismissal.
 */
export function HardLimitModal({ forceOpen, onClose }: HardLimitModalProps) {
  const { shouldShowLimitModal, markLimitModalShown, currentStage, isPaid } = useUpgradeNudge();
  const { initiatePayment, loading: paymentLoading } = useRazorpay();
  const { refetch } = useSubscription();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('quarterly');
  const [hasShown, setHasShown] = useState(false);

  // Determine if modal should be open
  useEffect(() => {
    // If externally forced open
    if (forceOpen !== undefined) {
      setIsOpen(forceOpen);
      return;
    }

    // Auto-show logic: only once per session when at hard limit
    if (currentStage === 'stage4' && shouldShowLimitModal && !hasShown && !isPaid) {
      setIsOpen(true);
      setHasShown(true);
      markLimitModalShown();
    }
  }, [currentStage, shouldShowLimitModal, hasShown, isPaid, forceOpen, markLimitModalShown]);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const handleUpgrade = (plan: PlanType) => {
    initiatePayment({
      planType: plan,
      onSuccess: () => {
        toast({
          title: "Pro Activated 🎉",
          description: "Welcome to premium! All limits removed.",
        });
        refetch();
        handleClose();
      },
      onError: (error) => {
        console.error('Payment error:', error);
      }
    });
  };

  const handleContactSupport = () => {
    window.open('mailto:support@nevorai.com?subject=Prospect Limit Support', '_blank');
    handleClose();
  };

  // Don't render for paid users
  if (isPaid) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto p-3 rounded-full bg-amber-500/20 w-fit">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          <DialogTitle className="text-xl">Free Limit Reached</DialogTitle>
          <DialogDescription className="text-center">
            You've reached the free limit of {NUDGE_THRESHOLDS.STAGE_4} prospects.
            Upgrade to Pro for unlimited access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {/* 4-Month Plan - Best Value */}
          <button
            type="button"
            onClick={() => setSelectedPlan('quarterly')}
            className={`w-full p-4 rounded-xl border-2 transition-all text-left relative ${
              selectedPlan === 'quarterly'
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card hover:border-primary/50'
            }`}
          >
            <div className="absolute -top-2.5 right-3 px-2 py-0.5 bg-amber-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
              <Star className="h-3 w-3" />
              Best Value
            </div>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="h-4 w-4 text-primary" />
                  <p className="font-semibold text-foreground">{PLAN_CONFIG.quarterly.name}</p>
                </div>
                <div className="space-y-1">
                  {PLAN_CONFIG.quarterly.features.slice(0, 2).map((feature, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-primary shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="font-bold text-xl text-foreground">₹299</p>
                <p className="text-xs text-muted-foreground">for 4 months</p>
              </div>
            </div>
          </button>

          {/* Monthly Plan */}
          <button
            type="button"
            onClick={() => setSelectedPlan('monthly')}
            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
              selectedPlan === 'monthly'
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card hover:border-primary/50'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="h-4 w-4 text-primary" />
                  <p className="font-semibold text-foreground">{PLAN_CONFIG.monthly.name}</p>
                </div>
                <div className="space-y-1">
                  {PLAN_CONFIG.monthly.features.slice(0, 2).map((feature, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-primary shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="font-bold text-xl text-foreground">₹99</p>
                <p className="text-xs text-muted-foreground">for 1 month</p>
              </div>
            </div>
          </button>
        </div>

        <div className="space-y-3 mt-4">
          <Button 
            onClick={() => handleUpgrade(selectedPlan)}
            className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/30"
            disabled={paymentLoading}
          >
            {paymentLoading ? (
              'Opening payment...'
            ) : (
              <>
                <Crown className="h-5 w-5 mr-2" />
                Upgrade to Pro – ₹{PLAN_CONFIG[selectedPlan].price}
              </>
            )}
          </Button>

          <Button 
            variant="ghost" 
            onClick={handleContactSupport}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Contact Support
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-2">
          Secure payment via Razorpay
        </p>
      </DialogContent>
    </Dialog>
  );
}
