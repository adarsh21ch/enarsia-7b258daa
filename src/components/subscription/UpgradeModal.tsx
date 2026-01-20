import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Check, AlertTriangle, Star } from 'lucide-react';
import { PLAN_CONFIG, PlanType, FREE_LEAD_LIMIT } from '@/hooks/usePaymentLinks';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useState } from 'react';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  /** Current lead count - if at limit, show appropriate messaging */
  currentLeadCount?: number;
  /** Whether user has team/leader features - suggests Pro instead of Mini */
  hasTeamFeatures?: boolean;
  /** Which app context - affects which plans to show */
  appContext?: 'nevorai' | 'trackup';
  /** Optional custom title */
  title?: string;
  /** Optional custom description */
  description?: string;
}

export function UpgradeModal({ 
  open, 
  onClose, 
  currentLeadCount,
  hasTeamFeatures = false,
  appContext = 'nevorai',
  title,
  description,
}: UpgradeModalProps) {
  const { initiatePayment, loading: paymentLoading } = useRazorpay();
  const { toast } = useToast();
  const { refetch } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('quarterly');
  
  const isAtLimit = currentLeadCount !== undefined && currentLeadCount >= FREE_LEAD_LIMIT;

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

  const modalTitle = title || (isAtLimit ? 'Lead Limit Reached' : 'Unlock Pro Features');
  const modalDescription = description || (
    isAtLimit 
      ? `You've added ${currentLeadCount}+ leads. Upgrade to continue tracking and unlock more features.`
      : 'Subscribe to unlock team tracking, analytics, and all premium features.'
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            {isAtLimit ? (
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            ) : (
              <Crown className="h-8 w-8 text-primary" />
            )}
          </div>
          <DialogTitle className="text-xl">{modalTitle}</DialogTitle>
          <DialogDescription className="text-center">
            {modalDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-4">
          {/* 4-Month Plan - Best Value */}
          <button
            type="button"
            onClick={() => setSelectedPlan('quarterly')}
            className={`w-full p-4 rounded-xl border-2 transition-all text-left relative ${
              selectedPlan === 'quarterly'
                ? 'border-primary bg-primary/5'
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
                ? 'border-primary bg-primary/5'
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
            className="w-full"
            disabled={paymentLoading}
          >
            <Crown className="h-4 w-4 mr-2" />
            {paymentLoading ? 'Opening payment...' : `Get ${PLAN_CONFIG[selectedPlan].name}`}
          </Button>

          <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
