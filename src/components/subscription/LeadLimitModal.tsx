import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, AlertTriangle, Star } from 'lucide-react';
import { usePaymentLinks } from '@/hooks/usePaymentLinks';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useState, useEffect } from 'react';

interface LeadLimitModalProps {
  open: boolean;
  onClose: () => void;
  /** How many leads user is trying to add */
  attemptedCount?: number;
  /** Context: 'add' for single add, 'import' for bulk import */
  context?: 'add' | 'import';
}

/**
 * Inline modal shown when user hits the free lead limit.
 * Displays upgrade options without redirecting.
 * NOW USES DYNAMIC PLANS FROM ADMIN CONFIG.
 */
export function LeadLimitModal({ 
  open, 
  onClose, 
  attemptedCount = 1,
  context = 'add' 
}: LeadLimitModalProps) {
  const { initiatePayment, loading: paymentLoading } = useRazorpay();
  const { toast } = useToast();
  const { refetch } = useSubscription();
  const { plans, getDefaultPlan, loading: plansLoading } = usePaymentLinks();
  const { config } = useAdminConfig();
  
  // Get default plan key for initial selection
  const defaultPlan = getDefaultPlan();
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>(defaultPlan?.plan_key || 'quarterly');

  // Update selected plan when default plan loads
  useEffect(() => {
    if (defaultPlan?.plan_key) {
      setSelectedPlanKey(defaultPlan.plan_key);
    }
  }, [defaultPlan?.plan_key]);

  const handleUpgrade = () => {
    initiatePayment({
      planType: selectedPlanKey,
      onSuccess: () => {
        toast({
          title: "Plan Activated 🎉",
          description: "All features are now unlocked.",
        });
        refetch();
        onClose();
      },
      onError: (error) => {
        console.error('Payment error:', error);
      }
    });
  };

  // Sort plans by sortOrder
  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);
  const selectedPlan = plans.find(p => p.plan_key === selectedPlanKey);

  // Get dynamic limit from admin config
  const freeLimit = config.limits.hard_limit ?? config.limits.free_total_leads ?? 1000;

  const contextMessage = context === 'import'
    ? `You've reached the free limit of ${freeLimit} prospects. Upgrade to import more leads.`
    : `You've reached the free limit of ${freeLimit} prospects. Upgrade to continue adding leads.`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          <DialogTitle className="text-xl">Free Limit Reached</DialogTitle>
          <DialogDescription className="text-center">
            {contextMessage}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-4">
          {plansLoading ? (
            <div className="space-y-3">
              <div className="h-20 bg-muted animate-pulse rounded-xl" />
              <div className="h-16 bg-muted animate-pulse rounded-xl" />
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
                      <p className="text-xs text-muted-foreground">Unlimited leads • Team sync • Analytics</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-bold text-lg text-foreground">₹{months > 1 ? Math.floor(plan.price / months) : plan.price}{months > 1 ? '/month' : ''}</p>
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

          <Button 
            onClick={handleUpgrade}
            className="w-full h-11 font-semibold"
            disabled={paymentLoading || plansLoading}
          >
            {paymentLoading ? (
              'Opening payment...'
            ) : selectedPlan ? (
              <>
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro – ₹{(() => { const m = Math.round(selectedPlan.durationDays / 30); return m > 1 ? `${Math.floor(selectedPlan.price / m)}/month` : selectedPlan.price; })()}
              </>
            ) : (
              <>
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </>
            )}
          </Button>

          <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
