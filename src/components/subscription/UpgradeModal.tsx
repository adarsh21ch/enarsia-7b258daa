import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Crown, AlertTriangle } from 'lucide-react';
import { usePaymentLinks } from '@/hooks/usePaymentLinks';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { useEffect, useMemo, useState } from 'react';
import { TierCard } from './TierCard';
import { getTierDisplayName } from '@/config/tierLabels';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();

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
    const tierLabel = plan ? getTierDisplayName(plan.tier) : 'Plan';
    initiatePayment({
      planType: planKey,
      onSuccess: () => { toast({ title: `${tierLabel} Plan Activated 🎉`, description: "All features are now unlocked." }); refetch(); onClose(); },
      onError: (error) => console.error('Payment error:', error),
    });
  };

  const modalTitle = title || (isAtLimit ? 'Lead Limit Reached' : 'Upgrade Your Plan');
  const modalDescription = description || (
    isAtLimit 
      ? `You've reached the free limit of ${freeLimit ?? ''} prospects. Upgrade to continue.`
      : 'Compare plans and choose what works best for you.'
  );

  const HeaderIcon = (
    <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
      {isAtLimit ? (
        <AlertTriangle className="h-7 w-7 text-amber-500" />
      ) : (
        <Crown className="h-7 w-7 text-primary" />
      )}
    </div>
  );

  const PlanCards = (
    <>
      {plansLoading ? (
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
          <div className="h-64 bg-muted animate-pulse rounded-2xl" />
          <div className="h-64 bg-muted animate-pulse rounded-2xl" />
        </div>
      ) : (
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
          {proPlans.length > 0 && (
            <TierCard tierName="Basic" plans={proPlans} selectedPlanKey={selectedPlanKey} onSelectPlan={setSelectedPlanKey} />
          )}
          {premiumPlans.length > 0 && (
            <TierCard tierName="Pro" plans={premiumPlans} isPremium selectedPlanKey={selectedPlanKey} onSelectPlan={setSelectedPlanKey} />
          )}
        </div>
      )}
    </>
  );

  const CTAButton = (
    <div className="shrink-0 pt-3 pb-1 space-y-2">
      <Button 
        onClick={() => selectedPlan && handleUpgrade(selectedPlanKey)} 
        className={`w-full h-12 font-semibold text-[15px] rounded-xl ${isPremiumSelected ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
        disabled={paymentLoading || plansLoading}
      >
        <Crown className="h-4 w-4 mr-2" />
        {paymentLoading ? 'Opening payment...' : `Get ${selectedPlan?.name ?? 'Pro'} – ₹${selectedPlan?.price ?? ''}`}
      </Button>
      <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground text-sm">
        Maybe Later
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onClose}>
        <DrawerContent className="max-h-[92vh] flex flex-col">
          <DrawerHeader className="text-center space-y-3 shrink-0 px-4 pt-4 pb-2">
            <div className="mx-auto w-3 h-1 rounded-full bg-muted-foreground/30 mb-1" />
            {HeaderIcon}
            <DrawerTitle className="text-lg">{modalTitle}</DrawerTitle>
            <p className="text-sm text-muted-foreground">{modalDescription}</p>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-4">
            {PlanCards}
          </div>
          <div className="px-4 pb-6">
            {CTAButton}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="text-center space-y-3 shrink-0 px-6 pt-6 pb-2">
          {HeaderIcon}
          <DialogTitle className="text-xl">{modalTitle}</DialogTitle>
          <DialogDescription className="text-center">{modalDescription}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          {PlanCards}
        </div>

        <div className="px-6 pb-5">
          {CTAButton}
        </div>
      </DialogContent>
    </Dialog>
  );
}
