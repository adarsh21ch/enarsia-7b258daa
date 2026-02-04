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
import { useUpgradeNudge } from '@/hooks/useUpgradeNudge';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { usePaymentLinks } from '@/hooks/usePaymentLinks';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { useFreeTrial } from '@/hooks/useFreeTrial';

interface HardLimitModalProps {
  /** External control for modal visibility */
  forceOpen?: boolean;
  /** Callback when modal is closed */
  onClose?: () => void;
}

/**
 * One-time blocking modal shown when user hits the prospect limit.
 * Only shows once per session, does not re-show after dismissal.
 * NOW USES DYNAMIC PLANS AND LIMITS FROM ADMIN CONFIG.
 */
export function HardLimitModal({ forceOpen, onClose }: HardLimitModalProps) {
  const { shouldShowLimitModal, markLimitModalShown, currentStage, isPaid, thresholds } = useUpgradeNudge();
  const { initiatePayment, loading: paymentLoading } = useRazorpay();
  const { refetch } = useSubscription();
  const { toast } = useToast();
  const { plans, getDefaultPlan, loading: plansLoading } = usePaymentLinks();
  const { config } = useAdminConfig();
  const { isTrialActive, trialOnlyMode, loading: trialLoading } = useFreeTrial();
  
  const [isOpen, setIsOpen] = useState(false);
  const defaultPlan = getDefaultPlan();
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>(defaultPlan?.plan_key || 'quarterly');
  const [hasShown, setHasShown] = useState(false);

  // Don't show modal if user is in active trial with trial-only mode OR if still loading
  // Including trialLoading prevents showing modal before subscription status is known
  const skipDueToTrial = trialLoading || (isTrialActive && trialOnlyMode);

  // Update selected plan when default plan loads
  useEffect(() => {
    if (defaultPlan?.plan_key) {
      setSelectedPlanKey(defaultPlan.plan_key);
    }
  }, [defaultPlan?.plan_key]);

  // Determine if modal should be open
  useEffect(() => {
    // Skip entirely if user is in active trial with trial-only mode
    if (skipDueToTrial) {
      setIsOpen(false);
      return;
    }
    
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
  }, [currentStage, shouldShowLimitModal, hasShown, isPaid, forceOpen, markLimitModalShown, skipDueToTrial]);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const handleUpgrade = () => {
    initiatePayment({
      planType: selectedPlanKey,
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

  // Don't render for paid users or users in active trial with trial-only mode
  if (isPaid || skipDueToTrial) return null;

  // Sort plans by sortOrder
  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);
  const selectedPlan = plans.find(p => p.plan_key === selectedPlanKey);

  // Get dynamic limit from thresholds (which come from admin config)
  const hardLimit = thresholds.STAGE_4;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto p-3 rounded-full bg-amber-500/20 w-fit">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          <DialogTitle className="text-xl">Free Limit Reached</DialogTitle>
          <DialogDescription className="text-center">
            You've reached the free limit of {hardLimit} prospects.
            Upgrade to Pro for unlimited access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {plansLoading ? (
            <div className="space-y-3">
              <div className="h-28 bg-muted animate-pulse rounded-xl" />
              <div className="h-24 bg-muted animate-pulse rounded-xl" />
            </div>
          ) : (
            sortedPlans.map((plan) => {
              const isSelected = selectedPlanKey === plan.plan_key;
              const months = Math.round(plan.durationDays / 30);
              
              return (
                <button
                  key={plan.id || plan.plan_key}
                  type="button"
                  onClick={() => setSelectedPlanKey(plan.plan_key)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left relative ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:border-primary/50'
                  }`}
                >
                  {plan.badgeText && (
                    <div className="absolute -top-2.5 right-3 px-2 py-0.5 bg-amber-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {plan.badgeText}
                    </div>
                  )}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Crown className="h-4 w-4 text-primary" />
                        <p className="font-semibold text-foreground">{plan.name}</p>
                      </div>
                      {plan.features && plan.features.length > 0 && (
                        <div className="space-y-1">
                          {plan.features.slice(0, 2).map((feature, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Check className="h-3 w-3 text-primary shrink-0" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-bold text-xl text-foreground">₹{plan.price}</p>
                      <p className="text-xs text-muted-foreground">for {months} month{months > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="space-y-3 mt-4">
          <Button 
            onClick={handleUpgrade}
            className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/30"
            disabled={paymentLoading || plansLoading}
          >
            {paymentLoading ? (
              'Opening payment...'
            ) : selectedPlan ? (
              <>
                <Crown className="h-5 w-5 mr-2" />
                Upgrade to Pro – ₹{selectedPlan.price}
              </>
            ) : (
              <>
                <Crown className="h-5 w-5 mr-2" />
                Upgrade Now
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
