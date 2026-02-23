import { useState, useEffect } from 'react';
import { Clock, Crown, MessageCircle, Star, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFreeTrial } from '@/hooks/useFreeTrial';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { usePaymentLinks } from '@/hooks/usePaymentLinks';

interface TrialExpiredModalProps {
  /** External control for modal visibility */
  forceOpen?: boolean;
  /** Callback when modal is closed */
  onClose?: () => void;
}

/**
 * Modal shown when user's free trial has expired.
 * Only shows when trial is enabled, expired, and user is not paid.
 */
export function TrialExpiredModal({ forceOpen, onClose }: TrialExpiredModalProps) {
  const { isTrialExpired, trialDays, trialOnlyMode, loading: trialLoading } = useFreeTrial();
  const { initiatePayment, loading: paymentLoading } = useRazorpay();
  const { refetch, isPaid } = useSubscription();
  const { toast } = useToast();
  const { plans, getDefaultPlan, loading: plansLoading } = usePaymentLinks();
  
  const [isOpen, setIsOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const defaultPlan = getDefaultPlan();
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>(defaultPlan?.plan_key || 'quarterly');

  // Update selected plan when default plan loads
  useEffect(() => {
    if (defaultPlan?.plan_key) {
      setSelectedPlanKey(defaultPlan.plan_key);
    }
  }, [defaultPlan?.plan_key]);

  // Determine if modal should be open
  useEffect(() => {
    // If externally forced open
    if (forceOpen !== undefined) {
      setIsOpen(forceOpen);
      return;
    }

    // Don't auto-show while loading - prevents false positives for Pro users
    // This fixes the race condition where isPaid defaults to false before subscription loads
    if (trialLoading) return;

    // Auto-show logic: only when trial is expired AND trial-only mode is on
    // This ensures the modal only shows when trial expiry actually blocks the user
    if (isTrialExpired && trialOnlyMode && !hasShown && !isPaid) {
      setIsOpen(true);
      setHasShown(true);
    }
  }, [isTrialExpired, trialOnlyMode, hasShown, isPaid, forceOpen, trialLoading]);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const handleUpgrade = () => {
    initiatePayment({
      planType: selectedPlanKey,
      onSuccess: () => {
        toast({
          title: "Plan Activated 🎉",
          description: "All limits removed. Enjoy full access!",
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
    window.open('mailto:support@nevorai.com?subject=Trial Support', '_blank');
    handleClose();
  };

  // Don't render for paid users
  if (isPaid) return null;

  // Sort plans by sortOrder
  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);
  const selectedPlan = plans.find(p => p.plan_key === selectedPlanKey);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto p-3 rounded-full bg-amber-500/20 w-fit">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
          <DialogTitle className="text-xl">Your Free Trial Has Ended</DialogTitle>
          <DialogDescription className="text-center">
            You've completed your {trialDays}-day free trial.
            Upgrade to Pro to continue using all features.
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
                      <p className="font-bold text-xl text-foreground">₹{months > 1 ? Math.floor(plan.price / months) : plan.price}{months > 1 ? '/month' : ''}</p>
                      {months > 1 ? (
                        <p className="text-xs text-muted-foreground">Billed as ₹{plan.price} for {months} months</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">for 1 month</p>
                      )}
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
                Continue with Pro – ₹{(() => { const m = Math.round(selectedPlan.durationDays / 30); return m > 1 ? `${Math.floor(selectedPlan.price / m)}/month` : selectedPlan.price; })()}
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
