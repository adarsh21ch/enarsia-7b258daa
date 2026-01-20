import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, AlertTriangle, Check, Star } from 'lucide-react';
import { PLAN_CONFIG, PlanType } from '@/hooks/usePaymentLinks';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { FREE_LIFETIME_LEAD_LIMIT } from '@/hooks/useLifetimeLeadLimit';
import { useState } from 'react';

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
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('quarterly');

  const handleUpgrade = (plan: PlanType) => {
    initiatePayment({
      planType: plan,
      onSuccess: () => {
        toast({
          title: "Pro Activated 🎉",
          description: "Welcome to premium! All features are now unlocked.",
        });
        refetch();
        onClose();
      },
      onError: (error) => {
        console.error('Payment error:', error);
      }
    });
  };

  const contextMessage = context === 'import'
    ? `You've reached the free limit of ${FREE_LIFETIME_LEAD_LIMIT} prospects. Upgrade to import more leads.`
    : `You've reached the free limit of ${FREE_LIFETIME_LEAD_LIMIT} prospects. Upgrade to continue adding leads.`;

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
                <p className="text-xs text-muted-foreground">Unlimited leads • Team sync • Analytics</p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="font-bold text-lg text-foreground">₹299</p>
                <p className="text-xs text-muted-foreground">4 months</p>
              </div>
            </div>
          </button>

          {/* Monthly Plan */}
          <button
            type="button"
            onClick={() => setSelectedPlan('monthly')}
            className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
              selectedPlan === 'monthly'
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card hover:border-primary/50'
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                <p className="font-semibold text-foreground">{PLAN_CONFIG.monthly.name}</p>
              </div>
              <div className="text-right">
                <span className="font-bold text-foreground">₹99</span>
                <span className="text-xs text-muted-foreground ml-1">/ 1 month</span>
              </div>
            </div>
          </button>

          <Button 
            onClick={() => handleUpgrade(selectedPlan)}
            className="w-full h-11 font-semibold"
            disabled={paymentLoading}
          >
            {paymentLoading ? (
              'Opening payment...'
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
