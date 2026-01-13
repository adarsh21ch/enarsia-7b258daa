import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Zap, Check, AlertTriangle } from 'lucide-react';
import { PLAN_CONFIG, PlanType, FREE_LEAD_LIMIT } from '@/hooks/usePaymentLinks';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';

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
  
  const isAtLimit = currentLeadCount !== undefined && currentLeadCount >= FREE_LEAD_LIMIT;
  const showMini = appContext === 'trackup' && !hasTeamFeatures;
  const suggestedPlan: PlanType = hasTeamFeatures ? 'pro' : (showMini ? 'mini' : 'pro');

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

  const modalTitle = title || (isAtLimit ? 'Lead Limit Reached' : 'Unlock Premium Features');
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
          {/* Primary suggested plan */}
          <div className="p-4 rounded-xl border-2 border-primary bg-primary/5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2">
                  {suggestedPlan === 'pro' ? (
                    <Crown className="h-5 w-5 text-primary" />
                  ) : (
                    <Zap className="h-5 w-5 text-amber-500" />
                  )}
                  <span className="font-semibold">{PLAN_CONFIG[suggestedPlan].name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {PLAN_CONFIG[suggestedPlan].description}
                </p>
              </div>
              <div className="text-right">
                <span className="font-bold text-lg">₹{PLAN_CONFIG[suggestedPlan].price}</span>
                <span className="text-xs text-muted-foreground">/mo</span>
              </div>
            </div>
            <div className="space-y-1 mb-4">
              {PLAN_CONFIG[suggestedPlan].features.slice(0, 3).map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <Button 
              onClick={() => handleUpgrade(suggestedPlan)} 
              className="w-full"
              disabled={paymentLoading}
            >
              {paymentLoading ? 'Opening payment...' : `Get ${PLAN_CONFIG[suggestedPlan].name}`}
            </Button>
          </div>

          {/* Secondary plan option */}
          {showMini && suggestedPlan === 'mini' && (
            <Button 
              variant="outline" 
              onClick={() => handleUpgrade('pro')} 
              className="w-full"
              disabled={paymentLoading}
            >
              <Crown className="h-4 w-4 mr-2" />
              Or get NevorAI Pro – ₹299/mo
            </Button>
          )}

          {suggestedPlan === 'pro' && appContext === 'trackup' && (
            <Button 
              variant="outline" 
              onClick={() => handleUpgrade('mini')} 
              className="w-full"
              disabled={paymentLoading}
            >
              <Zap className="h-4 w-4 mr-2" />
              Just need basics? TrackUp Mini – ₹29/mo
            </Button>
          )}

          <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}