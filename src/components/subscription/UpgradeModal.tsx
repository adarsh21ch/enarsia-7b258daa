import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Crown, AlertTriangle, X } from 'lucide-react';
import { usePaymentLinks } from '@/hooks/usePaymentLinks';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

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
    setIsScrolled(false);
    const next = proPlans.find(p => p.badgeText)?.plan_key || proPlans[0]?.plan_key || premiumPlans[0]?.plan_key;
    if (next) setSelectedPlanKey(next);
  }, [open, proPlans, premiumPlans]);

  const selectedPlan = allPlans.find(p => p.plan_key === selectedPlanKey) || allPlans[0];
  const isPremiumSelected = selectedPlan?.tier === 'premium';

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setIsScrolled(scrollRef.current.scrollTop > 10);
    }
  }, []);
  
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

  const PlanCards = (
    <>
      {plansLoading ? (
        <div className="space-y-4">
          <div className="h-64 bg-muted animate-pulse rounded-2xl" />
          <div className="h-64 bg-muted animate-pulse rounded-2xl" />
        </div>
      ) : (
        <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-4'}`}>
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
    <div className="space-y-2">
      <Button 
        onClick={() => selectedPlan && handleUpgrade(selectedPlanKey)} 
        className={`w-full h-12 font-semibold text-[15px] rounded-xl ${isPremiumSelected ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
        disabled={paymentLoading || plansLoading}
      >
        <Crown className="h-4 w-4 mr-2" />
        {paymentLoading ? 'Opening payment...' : `Get ${selectedPlan?.name ?? 'Pro'} – ₹${selectedPlan?.price ?? ''}`}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center">
        Secure payment via Razorpay · Cancel anytime
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onClose} dismissible={false}>
        <DrawerContent className="max-h-[95vh] flex flex-col outline-none">
          {/* Fixed header with close button */}
          <div className="shrink-0 px-4 pt-3 pb-2">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8" />
              <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="text-center space-y-1.5">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                {isAtLimit ? (
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                ) : (
                  <Crown className="h-6 w-6 text-primary" />
                )}
              </div>
              <DrawerTitle className="text-lg">{modalTitle}</DrawerTitle>
              <p className="text-sm text-muted-foreground">{modalDescription}</p>
            </div>
          </div>

          {/* Scrollable plan cards */}
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto overscroll-contain px-4 py-2"
          >
            {PlanCards}
          </div>

          {/* Fixed CTA at bottom */}
          <div className={`shrink-0 px-4 pt-3 pb-6 border-t border-border/50 bg-card transition-shadow ${isScrolled ? 'shadow-[0_-4px_12px_rgba(0,0,0,0.08)]' : ''}`}>
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
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            {isAtLimit ? (
              <AlertTriangle className="h-7 w-7 text-amber-500" />
            ) : (
              <Crown className="h-7 w-7 text-primary" />
            )}
          </div>
          <DialogTitle className="text-xl">{modalTitle}</DialogTitle>
          <DialogDescription className="text-center">{modalDescription}</DialogDescription>
        </DialogHeader>

        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-2"
        >
          {PlanCards}
        </div>

        <div className={`shrink-0 px-6 pt-3 pb-5 border-t border-border/50 bg-card transition-shadow ${isScrolled ? 'shadow-[0_-4px_12px_rgba(0,0,0,0.08)]' : ''}`}>
          {CTAButton}
        </div>
      </DialogContent>
    </Dialog>
  );
}
