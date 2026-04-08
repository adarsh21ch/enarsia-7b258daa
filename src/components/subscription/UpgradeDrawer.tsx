import { Crown, Sparkles, Tag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { useSubscription } from '@/hooks/useSubscription';
import { usePermissions } from '@/contexts/PermissionsContext';
import { usePaymentLinks, PlanConfig } from '@/hooks/usePaymentLinks';
import { useAdminConfig, Offer } from '@/hooks/useAdminConfig';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState, useMemo } from 'react';
import { TierCard } from './TierCard';

interface UpgradeDrawerProps {
  variant?: 'default' | 'prominent' | 'compact';
  triggerText?: string;
}

export function UpgradeDrawer({ variant = 'default', triggerText }: UpgradeDrawerProps) {
  const MOBILE_CHECKOUT_DELAY_MS = 320;
  const { isPaid: permPaid, isLoading: permLoading } = usePermissions();
  const { initiatePayment, initiateSubscription, loading: paymentLoading } = useRazorpay();
  const { toast } = useToast();
  const { refetch } = useSubscription();
  const { plans, loading: plansLoading } = usePaymentLinks();
  const { config } = useAdminConfig();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  // All paid plans shown as "Pro" (filter out funnels-only plans)
  const proPlans = useMemo(() => {
    return plans
      .filter(p => !p.plan_key.startsWith('funnels_') && p.tier !== 'basic')
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [plans]);

  const defaultKey = proPlans.find(p => p.badgeText)?.plan_key || proPlans[0]?.plan_key || '';
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>(defaultKey);

  // Coupon code state
  const [couponCode, setCouponCode] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedOffer, setAppliedOffer] = useState<Offer | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const activeOffers = useMemo(() => {
    const now = new Date();
    return config.offers.filter(o =>
      o.is_active && o.promo_code &&
      new Date(o.start_date) <= now && new Date(o.end_date) >= now
    );
  }, [config.offers]);

  const offersForSelectedPlan = useMemo(() => {
    const selectedPlan = plans.find(p => p.plan_key === selectedPlanKey);
    if (!selectedPlan) return [];
    return activeOffers.filter(o => o.applicable_plan_ids.includes(selectedPlan.id));
  }, [activeOffers, plans, selectedPlanKey]);

  const hasOffersForPlan = offersForSelectedPlan.length > 0;
  const selectedPlan = proPlans.find(p => p.plan_key === selectedPlanKey) || proPlans[0];

  const prepareForMobileCheckout = async () => {
    if (!isMobile) return;
    setOpen(false);
    await new Promise((resolve) => window.setTimeout(resolve, MOBILE_CHECKOUT_DELAY_MS));
  };

  const validateCoupon = () => {
    if (!couponCode.trim()) { setCouponError('Please enter a coupon code'); return; }
    setValidatingCoupon(true);
    setCouponError(null);
    setTimeout(() => {
      const matchedOffer = activeOffers.find(
        o => o.promo_code?.toUpperCase() === couponCode.trim().toUpperCase()
      );
      if (matchedOffer) {
        const sp = plans.find(p => p.plan_key === selectedPlanKey);
        if (sp && matchedOffer.applicable_plan_ids.includes(sp.id)) {
          setAppliedOffer(matchedOffer);
          toast({ title: "Coupon Applied! 🎉", description: `${matchedOffer.discount_value}% discount activated` });
        } else {
          setCouponError('This coupon is not valid for the selected plan');
          setAppliedOffer(null);
        }
      } else {
        setCouponError('Invalid or expired coupon code');
        setAppliedOffer(null);
      }
      setValidatingCoupon(false);
    }, 500);
  };

  const removeCoupon = () => { setAppliedOffer(null); setCouponCode(''); setCouponError(null); };

  const getDisplayPrice = (plan: PlanConfig) => {
    if (appliedOffer && appliedOffer.applicable_plan_ids.includes(plan.id)) {
      if (appliedOffer.discount_type === 'percent') {
        return Math.round(plan.price * (1 - appliedOffer.discount_value / 100));
      }
      return Math.max(0, plan.price - appliedOffer.discount_value);
    }
    return plan.price;
  };

  const handleUpgrade = (planKey: string) => {
    const plan = plans.find(p => p.plan_key === planKey);
    if (plan?.billing_type === 'recurring') {
      initiateSubscription({
        planType: planKey,
        beforeOpen: prepareForMobileCheckout,
        onSuccess: () => {
          toast({ title: "Pro Plan Activated 🎉", description: "Your subscription has been started." });
          refetch(); setOpen(false);
        },
        onError: (error) => console.error('Subscription error:', error),
      });
      return;
    }
    const offerDetails = appliedOffer && plan ? {
      offerId: appliedOffer.id,
      promoCode: appliedOffer.promo_code || '',
      discountType: appliedOffer.discount_type as 'percent' | 'fixed',
      discountValue: appliedOffer.discount_value,
      discountedAmount: getDisplayPrice(plan),
    } : undefined;
    initiatePayment({
      planType: planKey,
      offer: offerDetails,
      beforeOpen: prepareForMobileCheckout,
      onSuccess: () => {
        toast({ title: "Pro Plan Activated 🎉", description: "All features are now unlocked." });
        refetch(); setOpen(false);
      },
      onError: (error) => console.error('Payment error:', error),
    });
  };

  const handlePlanChange = (planKey: string) => {
    setSelectedPlanKey(planKey);
    if (appliedOffer) {
      const newPlan = plans.find(p => p.plan_key === planKey);
      if (newPlan && !appliedOffer.applicable_plan_ids.includes(newPlan.id)) {
        removeCoupon();
        toast({ title: "Coupon Removed", description: "The coupon is not valid for this plan", variant: "destructive" });
      }
    }
  };

  if (permLoading || permPaid) return null;

  const buttonText = triggerText || 'Upgrade Now';

  const TriggerButton = variant === 'compact' ? (
    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/20">
      {buttonText}
    </Button>
  ) : variant === 'prominent' ? (
    <button className="w-full rounded-lg px-3 py-1.5 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 border border-amber-500/30 flex items-center gap-2 transition-all duration-200 hover:border-amber-500/50 active:scale-[0.99]">
      <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
      <span className="font-medium text-xs text-amber-700 dark:text-amber-300">{buttonText}</span>
      <Sparkles className="h-3 w-3 text-amber-500/50 ml-auto shrink-0" />
    </button>
  ) : (
    <Button variant="outline" size="sm" className="gap-2">
      <Crown className="h-4 w-4" />
      {buttonText}
    </Button>
  );

  const PlanContent = (
    <div className="space-y-4 p-1">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-primary/20">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Upgrade to Pro</h3>
          <p className="text-xs text-muted-foreground">Choose a duration that works for you</p>
        </div>
      </div>

      {plansLoading ? (
        <div className="h-40 bg-muted animate-pulse rounded-xl" />
      ) : proPlans.length > 0 ? (
        <TierCard
          tierName="Pro"
          plans={proPlans}
          selectedPlanKey={selectedPlanKey}
          onSelectPlan={handlePlanChange}
        />
      ) : null}

      {/* Coupon Code Section */}
      {hasOffersForPlan && (
        <div className="pt-2 border-t">
          {appliedOffer ? (
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  {appliedOffer.promo_code} – {appliedOffer.discount_value}% off
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={removeCoupon} className="h-7 text-xs">Remove</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {offersForSelectedPlan[0] && selectedPlan && (
                <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    🎁 Use <span className="font-bold">{offersForSelectedPlan[0].promo_code}</span> and get {selectedPlan.name} at just <span className="font-bold">₹{Math.round(selectedPlan.price * (1 - offersForSelectedPlan[0].discount_value / 100))}</span>!
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                  className="flex-1 h-9 text-sm uppercase"
                  onKeyDown={(e) => e.key === 'Enter' && validateCoupon()}
                />
                <Button variant="outline" size="sm" onClick={validateCoupon} disabled={validatingCoupon || !couponCode.trim()} className="h-9">
                  {validatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                </Button>
              </div>
              {couponError && <p className="text-xs text-destructive">{couponError}</p>}
            </div>
          )}
        </div>
      )}

      <Button
        onClick={() => handleUpgrade(selectedPlanKey)}
        className="w-full h-12 text-base font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/30"
        disabled={paymentLoading || plansLoading || !selectedPlan}
      >
        {paymentLoading ? 'Opening payment...' : selectedPlan ? (
          <><Crown className="h-5 w-5 mr-2" />Get Pro – ₹{getDisplayPrice(selectedPlan)}</>
        ) : (
          <><Crown className="h-5 w-5 mr-2" />Upgrade Now</>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Secure payment via Razorpay • Cancel anytime
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{TriggerButton}</DrawerTrigger>
        <DrawerContent className="px-4 pb-8">
          <DrawerHeader className="px-0">
            <DrawerTitle className="sr-only">Upgrade to Pro</DrawerTitle>
          </DrawerHeader>
          {PlanContent}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{TriggerButton}</SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[450px]">
        <SheetHeader>
          <SheetTitle className="sr-only">Upgrade to Pro</SheetTitle>
        </SheetHeader>
        {PlanContent}
      </SheetContent>
    </Sheet>
  );
}
