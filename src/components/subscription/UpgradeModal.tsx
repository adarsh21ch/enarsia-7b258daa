import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, AlertTriangle } from 'lucide-react';
import { usePaymentLinks } from '@/hooks/usePaymentLinks';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { useEffect, useMemo, useState } from 'react';
import { TierCard } from './TierCard';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  currentLeadCount?: number;
  hasTeamFeatures?: boolean;
  appContext?: 'nevorai' | 'trackup';
  title?: string;
  description?: string;
}

export function UpgradeModal({ 
  open, onClose, currentLeadCount, hasTeamFeatures = false,
  appContext = 'nevorai', title, description,
}: UpgradeModalProps) {
  const { initiatePayment, initiateSubscription, loading: paymentLoading } = useRazorpay();
  const { toast } = useToast();
  const { refetch } = useSubscription();
  const { plans, loading: plansLoading } = usePaymentLinks();
  const { config } = useAdminConfig();

  const freeLimit = config.limits.hard_limit ?? config.limits.free_total_leads;
  const isAtLimit = currentLeadCount !== undefined && freeLimit !== undefined
    ? currentLeadCount >= freeLimit : false;

  const { proPlans, premiumPlans } = useMemo(() => ({
    proPlans: plans.filter(p => p.tier === 'pro').sort((a, b) => a.sortOrder - b.sortOrder),
    premiumPlans: plans.filter(p => p.tier === 'premium').sort((a, b) => a.sortOrder - b.sortOrder),
  }), [plans]);

  const allPlans = [...proPlans, ...premiumPlans];
  const defaultKey = proPlans.find(p => p.badgeText)?.plan_key || proPlans[0]?.plan_key || premiumPlans[0]?.plan_key || '';
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>(defaultKey);

  useEffect(() => {
    if (!open) return;
    const next = proPlans.find(p => p.badgeText)?.plan_key || proPlans[0]?.plan_key || premiumPlans[0]?.plan_key;
    if (next) setSelectedPlanKey(next);
  }, [open, proPlans, premiumPlans]);

  const selectedPlan = allPlans.find(p => p.plan_key === selectedPlanKey) || allPlans[0];
  const isPremiumSelected = selectedPlan?.tier === 'premium';
  
  const handleUpgrade = (planKey: string) => {
    const plan = plans.find(p => p.plan_key === planKey);
    if (plan?.billing_type === 'recurring') {
      initiateSubscription({
        planType: planKey,
        onSuccess: () => { toast({ title: "Subscription Started 🎉", description: "Your recurring subscription has been initiated." }); refetch(); onClose(); },
        onError: (error) => console.error('Subscription error:', error),
      });
      return;
    }
    initiatePayment({
      planType: planKey,
      onSuccess: () => { toast({ title: "Pro Activated 🎉", description: "Welcome to premium! All features are now unlocked." }); refetch(); onClose(); },
      onError: (error) => console.error('Payment error:', error),
    });
  };

  const modalTitle = title || (isAtLimit ? 'Lead Limit Reached' : 'Unlock Pro Features');
  const modalDescription = description || (
    isAtLimit 
      ? `You've reached the free limit of ${freeLimit ?? ''} prospects. Upgrade to continue.`
      : 'Choose a plan that works for you.'
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
          <DialogDescription className="text-center">{modalDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-4">
          {plansLoading ? (
            <div className="space-y-3">
              <div className="h-36 bg-muted animate-pulse rounded-xl" />
              <div className="h-36 bg-muted animate-pulse rounded-xl" />
            </div>
          ) : (
            <>
              {proPlans.length > 0 && (
                <TierCard tierName="Pro" plans={proPlans} selectedPlanKey={selectedPlanKey} onSelectPlan={setSelectedPlanKey} />
              )}
              {premiumPlans.length > 0 && (
                <TierCard tierName="Premium" plans={premiumPlans} isPremium selectedPlanKey={selectedPlanKey} onSelectPlan={setSelectedPlanKey} />
              )}
            </>
          )}

          <Button 
            onClick={() => selectedPlan && handleUpgrade(selectedPlanKey)} 
            className={`w-full h-11 font-semibold ${isPremiumSelected ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
            disabled={paymentLoading || plansLoading}
          >
            <Crown className="h-4 w-4 mr-2" />
            {paymentLoading ? 'Opening payment...' : `Get ${selectedPlan?.name ?? 'Pro'} – ₹${selectedPlan?.price ?? ''}`}
          </Button>

          <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
