import { Crown, Sparkles, Check, Star, Tag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { useSubscription } from '@/hooks/useSubscription';
import { usePaymentLinks, PlanConfig } from '@/hooks/usePaymentLinks';
import { useAdminConfig, Offer } from '@/hooks/useAdminConfig';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState, useMemo } from 'react';

interface UpgradeDrawerProps {
  variant?: 'default' | 'prominent' | 'compact';
  triggerText?: string;
}

export function UpgradeDrawer({ variant = 'default', triggerText }: UpgradeDrawerProps) {
  const { isPaid, loading } = useSubscription();
  const { initiatePayment, loading: paymentLoading } = useRazorpay();
  const { toast } = useToast();
  const { refetch } = useSubscription();
  const { plans, getDefaultPlan, loading: plansLoading } = usePaymentLinks();
  const { config } = useAdminConfig();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  
  const defaultPlan = getDefaultPlan();
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>(defaultPlan?.plan_key || 'quarterly');
  
  // Coupon code state
  const [couponCode, setCouponCode] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedOffer, setAppliedOffer] = useState<Offer | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Get active offers
  const activeOffers = useMemo(() => {
    const now = new Date();
    return config.offers.filter(o => 
      o.is_active && 
      o.promo_code && 
      new Date(o.start_date) <= now && 
      new Date(o.end_date) >= now
    );
  }, [config.offers]);

  // Check if selected plan has any active offers
  const offersForSelectedPlan = useMemo(() => {
    const selectedPlan = plans.find(p => p.plan_key === selectedPlanKey);
    if (!selectedPlan) return [];
    return activeOffers.filter(o => o.applicable_plan_ids.includes(selectedPlan.id));
  }, [activeOffers, plans, selectedPlanKey]);

  const hasOffersForPlan = offersForSelectedPlan.length > 0;

  const validateCoupon = () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }
    
    setValidatingCoupon(true);
    setCouponError(null);
    
    // Simulate a small delay for UX
    setTimeout(() => {
      const matchedOffer = activeOffers.find(
        o => o.promo_code?.toUpperCase() === couponCode.trim().toUpperCase()
      );
      
      if (matchedOffer) {
        // Check if offer applies to selected plan
        const selectedPlan = plans.find(p => p.plan_key === selectedPlanKey);
        if (selectedPlan && matchedOffer.applicable_plan_ids.includes(selectedPlan.id)) {
          setAppliedOffer(matchedOffer);
          toast({
            title: "Coupon Applied! 🎉",
            description: `${matchedOffer.discount_value}% discount activated`,
          });
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

  const removeCoupon = () => {
    setAppliedOffer(null);
    setCouponCode('');
    setCouponError(null);
  };

  const handleUpgrade = (planKey: string) => {
    const plan = plans.find(p => p.plan_key === planKey);
    
    // Build offer details if a coupon is applied
    const offerDetails = appliedOffer && plan ? {
      offerId: appliedOffer.id,
      promoCode: appliedOffer.promo_code || '',
      discountType: appliedOffer.discount_type as 'percent' | 'fixed',
      discountValue: appliedOffer.discount_value,
      discountedAmount: getDisplayPrice(plan),
    } : undefined;
    
    // Use dynamic payment flow (popup checkout)
    initiatePayment({
      planType: planKey,
      offer: offerDetails,
      onSuccess: () => {
        toast({
          title: "Pro Activated 🎉",
          description: "Welcome to premium! All features are now unlocked.",
        });
        refetch();
        setOpen(false);
      },
      onError: (error) => {
        console.error('Payment error:', error);
      }
    });
  };

  // Reset coupon when plan changes
  const handlePlanChange = (planKey: string) => {
    setSelectedPlanKey(planKey);
    if (appliedOffer) {
      const newPlan = plans.find(p => p.plan_key === planKey);
      if (newPlan && !appliedOffer.applicable_plan_ids.includes(newPlan.id)) {
        removeCoupon();
        toast({
          title: "Coupon Removed",
          description: "The coupon is not valid for this plan",
          variant: "destructive",
        });
      }
    }
  };

  if (loading || isPaid) return null;

  const buttonText = triggerText || 'Upgrade to Pro';
  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);
  const selectedPlan = plans.find(p => p.plan_key === selectedPlanKey) || defaultPlan;

  // Calculate discounted price if offer applied
  const getDisplayPrice = (plan: PlanConfig) => {
    if (appliedOffer && appliedOffer.applicable_plan_ids.includes(plan.id)) {
      if (appliedOffer.discount_type === 'percent') {
        return Math.round(plan.price * (1 - appliedOffer.discount_value / 100));
      } else {
        return Math.max(0, plan.price - appliedOffer.discount_value);
      }
    }
    return plan.price;
  };

  const TriggerButton = variant === 'compact' ? (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
    >
      {buttonText}
    </Button>
  ) : (
    <Button
      variant={variant === 'prominent' ? 'default' : 'outline'}
      size="sm"
      className={variant === 'prominent' 
        ? 'gap-2 shadow-lg shadow-primary/20' 
        : 'gap-2'
      }
    >
      <Crown className="h-4 w-4" />
      {buttonText}
    </Button>
  );

  const PlanCard = ({ plan, isSelected }: { plan: PlanConfig; isSelected: boolean }) => {
    const hasFeatures = plan.features && plan.features.length > 0;
    const displayPrice = getDisplayPrice(plan);
    const originalPrice = plan.price;
    const hasDiscount = appliedOffer && appliedOffer.applicable_plan_ids.includes(plan.id);
    const months = Math.round(plan.durationDays / 30);
    // Use floor for charm pricing (prices ending in 9 feel more attractive)
    const monthlyPrice = months >= 1 ? Math.floor(displayPrice / months) : displayPrice;

    return (
      <button
        type="button"
        onClick={() => handlePlanChange(plan.plan_key)}
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
            <p className="text-xs text-muted-foreground mb-2">{plan.description}</p>
            {hasFeatures && (
              <div className="space-y-1">
                {plan.features.slice(0, 3).map((feature, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-primary shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="text-right shrink-0 ml-3">
            {hasDiscount ? (
              <>
                <p className="text-sm text-muted-foreground line-through">₹{originalPrice}</p>
                <p className="font-bold text-xl text-green-600 dark:text-green-400">₹{displayPrice}</p>
              </>
            ) : (
              <p className="font-bold text-xl text-foreground">₹{originalPrice}</p>
            )}
            <p className="text-xs text-muted-foreground">
              for {months} month{months > 1 ? 's' : ''}
            </p>
            {months > 1 && (
              <p className="text-xs text-primary font-medium">Just ₹{monthlyPrice} / month</p>
            )}
          </div>
        </div>
      </button>
    );
  };

  const PlanContent = (
    <div className="space-y-4 p-1">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-primary/20">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Unlock Pro Features</h3>
          <p className="text-xs text-muted-foreground">Choose a plan that works for you</p>
        </div>
      </div>

      {plansLoading ? (
        <div className="space-y-3">
          <div className="h-28 bg-muted animate-pulse rounded-xl" />
          <div className="h-24 bg-muted animate-pulse rounded-xl" />
        </div>
      ) : (
        <div className="space-y-3">
          {sortedPlans.map((plan) => (
            <PlanCard 
              key={plan.id || plan.plan_key} 
              plan={plan} 
              isSelected={selectedPlanKey === plan.plan_key} 
            />
          ))}
        </div>
      )}

      {/* Coupon Code Section - Only show if selected plan has offers */}
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
              <Button variant="ghost" size="sm" onClick={removeCoupon} className="h-7 text-xs">
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Promotional message */}
              {offersForSelectedPlan[0] && selectedPlan && (
                <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    🎁 Use <span className="font-bold">{offersForSelectedPlan[0].promo_code}</span> as a welcome bonus and get {selectedPlan.name} at just <span className="font-bold">₹{Math.round(selectedPlan.price * (1 - offersForSelectedPlan[0].discount_value / 100))}</span>!
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  className="flex-1 h-9 text-sm uppercase"
                  onKeyDown={(e) => e.key === 'Enter' && validateCoupon()}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={validateCoupon}
                  disabled={validatingCoupon || !couponCode.trim()}
                  className="h-9"
                >
                  {validatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                </Button>
              </div>
              {couponError && (
                <p className="text-xs text-destructive">{couponError}</p>
              )}
            </div>
          )}
        </div>
      )}

      <Button 
        onClick={() => handleUpgrade(selectedPlanKey)}
        className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/30"
        disabled={paymentLoading || plansLoading}
      >
        {paymentLoading ? (
          'Opening payment...'
        ) : selectedPlan ? (
          <>
            <Crown className="h-5 w-5 mr-2" />
            Get {selectedPlan.name} – ₹{getDisplayPrice(selectedPlan)}
          </>
        ) : (
          <>
            <Crown className="h-5 w-5 mr-2" />
            Upgrade Now
          </>
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
        <DrawerTrigger asChild>
          {TriggerButton}
        </DrawerTrigger>
        <DrawerContent className="px-4 pb-8">
          <DrawerHeader className="px-0">
            <DrawerTitle className="sr-only">Upgrade Plans</DrawerTitle>
          </DrawerHeader>
          {PlanContent}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {TriggerButton}
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[450px]">
        <SheetHeader>
          <SheetTitle className="sr-only">Upgrade Plans</SheetTitle>
        </SheetHeader>
        {PlanContent}
      </SheetContent>
    </Sheet>
  );
}