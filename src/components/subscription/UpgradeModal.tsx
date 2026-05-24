import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Crown, AlertTriangle, X } from 'lucide-react';
import { usePaymentLinks } from '@/hooks/usePaymentLinks';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { useEffect, useMemo, useState } from 'react';
import { TierCard } from './TierCard';
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
  const MOBILE_CHECKOUT_DELAY_MS = 320;
  const { initiatePayment, initiateSubscription, loading: paymentLoading } = useRazorpay();
  const { toast } = useToast();
  const { refetch } = useSubscription();
  const { plans, loading: plansLoading } = usePaymentLinks();
  const { config } = useAdminConfig();
  const isMobile = useIsMobile();

  const freeLimit = config.limits.hard_limit ?? config.limits.free_total_leads;
  const isAtLimit = currentLeadCount !== undefined && freeLimit !== undefined
    ? currentLeadCount >= freeLimit : false;

  // All paid plans shown as single "Pro" group
  const proPlans = useMemo(() => {
    return plans
      .filter(p => p.tier !== 'basic')
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [plans]);

  const defaultKey = proPlans.find(p => p.badgeText)?.plan_key || proPlans[0]?.plan_key || '';
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>(defaultKey);

  useEffect(() => {
    if (!open) return;
    const next = proPlans.find(p => p.badgeText)?.plan_key || proPlans[0]?.plan_key;
    if (next) setSelectedPlanKey(next);
  }, [open, proPlans]);

  const selectedPlan = proPlans.find(p => p.plan_key === selectedPlanKey) || proPlans[0];

  const prepareForMobileCheckout = async () => {
    if (!isMobile) return;
    onClose();
    await new Promise((resolve) => window.setTimeout(resolve, MOBILE_CHECKOUT_DELAY_MS));
  };

  const handleUpgrade = (planKey: string) => {
    const plan = plans.find(p => p.plan_key === planKey);
    if (plan?.billing_type === 'recurring') {
      initiateSubscription({
        planType: planKey,
        beforeOpen: prepareForMobileCheckout,
        onSuccess: () => { toast({ title: "Pro Plan Activated 🎉", description: "Your subscription has been started." }); refetch(); onClose(); },
        onError: (error) => console.error('Subscription error:', error),
      });
      return;
    }
    initiatePayment({
      planType: planKey,
      beforeOpen: prepareForMobileCheckout,
      onSuccess: () => { toast({ title: "Pro Plan Activated 🎉", description: "All features are now unlocked." }); refetch(); onClose(); },
      onError: (error) => console.error('Payment error:', error),
    });
  };

  const modalTitle = title || (isAtLimit ? 'Lead Limit Reached' : 'Upgrade to Pro');
  const modalDescription = description || (
    isAtLimit
      ? `You've reached the free limit of ${freeLimit ?? ''} prospects. Upgrade to continue.`
      : 'Choose a duration and unlock all features.'
  );

  const HeaderIcon = (
    <div className={`mx-auto ${isMobile ? 'w-10 h-10' : 'w-12 h-12'} rounded-full bg-primary/10 flex items-center justify-center`}>
      {isAtLimit ? (
        <AlertTriangle className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-amber-500`} />
      ) : (
        <Crown className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-primary`} />
      )}
    </div>
  );

  const PlanCards = plansLoading ? (
    <div className="h-48 bg-muted animate-pulse rounded-2xl" />
  ) : proPlans.length > 0 ? (
    <TierCard
      tierName="Pro"
      plans={proPlans}
      selectedPlanKey={selectedPlanKey}
      onSelectPlan={setSelectedPlanKey}
      compact={isMobile}
    />
  ) : null;

  const ctaPrice = (() => {
    if (!selectedPlan) return '';
    const first = selectedPlan.firstMonthPrice ?? null;
    const renewal = selectedPlan.renewalPrice ?? selectedPlan.price;
    return typeof first === 'number' && first > 0 && first < renewal ? first : selectedPlan.price;
  })();
  const ctaSubLine = (() => {
    if (!selectedPlan) return null;
    const first = selectedPlan.firstMonthPrice ?? null;
    const renewal = selectedPlan.renewalPrice ?? selectedPlan.price;
    const hasIntro = typeof first === 'number' && first > 0 && first < renewal;
    const parts: string[] = [];
    if (hasIntro) parts.push(`Then ₹${renewal} on renewal`);
    if (selectedPlan.cancelAnytime !== false) parts.push('Cancel anytime');
    parts.push('Secure payment via Razorpay');
    return parts.join(' · ');
  })();

  const CTAButton = (
    <div className="space-y-1">
      <Button
        onClick={() => selectedPlan && handleUpgrade(selectedPlanKey)}
        className="w-full h-11 font-semibold text-sm rounded-xl"
        disabled={paymentLoading || plansLoading}
      >
        <Crown className="h-4 w-4 mr-2" />
        {paymentLoading ? 'Opening payment...' : `Get ${selectedPlan?.name ?? 'Pro'} – ₹${ctaPrice}`}
      </Button>
      <p className="text-[10px] text-muted-foreground text-center">
        {ctaSubLine}
      </p>
    </div>
  );


  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onClose} dismissible={false}>
        <DrawerContent className="max-h-[98vh] flex flex-col outline-none">
          <div className="shrink-0 px-4 pt-2 pb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8" />
              <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="text-center space-y-0.5">
              {HeaderIcon}
              <DrawerTitle className="text-base">{modalTitle}</DrawerTitle>
              <p className="text-xs text-muted-foreground">{modalDescription}</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-1">
            {PlanCards}
          </div>
          <div className="shrink-0 px-4 pt-2 pb-4 border-t border-border/50 bg-card">
            {CTAButton}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border p-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="text-center space-y-2 shrink-0 px-6 pt-5 pb-2">
          {HeaderIcon}
          <DialogTitle className="text-lg">{modalTitle}</DialogTitle>
          <DialogDescription className="text-sm">{modalDescription}</DialogDescription>
        </DialogHeader>
        <div className="px-6 py-2 flex-1">
          {PlanCards}
        </div>
        <div className="shrink-0 px-6 pt-2 pb-4 border-t border-border/50 bg-card">
          {CTAButton}
        </div>
      </DialogContent>
    </Dialog>
  );
}
