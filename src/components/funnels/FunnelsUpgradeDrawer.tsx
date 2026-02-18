import { Crown, Sparkles, Check, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { useFunnelSubscription } from '@/hooks/useFunnelSubscription';
import { usePaymentLinks, PlanConfig } from '@/hooks/usePaymentLinks';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState, useMemo } from 'react';

interface FunnelsUpgradeDrawerProps {
  triggerText?: string;
  trigger?: React.ReactNode;
}

export function FunnelsUpgradeDrawer({ triggerText, trigger }: FunnelsUpgradeDrawerProps) {
  const { isFunnelsPro, loading: subLoading } = useFunnelSubscription();
  const { initiatePayment, loading: paymentLoading } = useRazorpay();
  const { toast } = useToast();
  const { plans, loading: plansLoading } = usePaymentLinks();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  // Filter to only funnel and combined plans
  const funnelPlans = useMemo(() => {
    return plans
      .filter(p => p.plan_key.startsWith('funnels_') || p.plan_key.startsWith('combined_'))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [plans]);

  const [selectedPlanKey, setSelectedPlanKey] = useState<string>('');

  // Set default selection when plans load
  useMemo(() => {
    if (funnelPlans.length > 0 && !selectedPlanKey) {
      setSelectedPlanKey(funnelPlans[0].plan_key);
    }
  }, [funnelPlans, selectedPlanKey]);

  const selectedPlan = funnelPlans.find(p => p.plan_key === selectedPlanKey) || funnelPlans[0];

  const handleUpgrade = (planKey: string) => {
    initiatePayment({
      planType: planKey,
      onSuccess: () => {
        toast({
          title: "Funnels Pro Activated 🎉",
          description: "All funnel features are now unlocked!",
        });
        setOpen(false);
      },
      onError: (error) => {
        console.error('Payment error:', error);
      }
    });
  };

  if (subLoading || isFunnelsPro) return null;

  const TriggerButton = trigger || (
    <Button variant="default" size="sm" className="gap-2">
      <Crown className="h-4 w-4" />
      {triggerText || 'Upgrade Funnels'}
    </Button>
  );

  const PlanCard = ({ plan, isSelected }: { plan: PlanConfig; isSelected: boolean }) => {
    const months = Math.round(plan.durationDays / 30);
    const monthlyPrice = months >= 1 ? Math.floor(plan.price / months) : plan.price;
    const isCombined = plan.plan_key.startsWith('combined_');

    return (
      <button
        type="button"
        onClick={() => setSelectedPlanKey(plan.plan_key)}
        className={`w-full p-4 rounded-xl border-2 transition-all text-left relative ${
          isSelected
            ? 'border-primary bg-primary/10'
            : 'border-border bg-card hover:border-primary/50'
        }`}
      >
        {isCombined && (
          <div className="absolute -top-2.5 right-3 px-2 py-0.5 bg-amber-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
            <Star className="h-3 w-3" />
            Best Value
          </div>
        )}
        {plan.badgeText && !isCombined && (
          <div className="absolute -top-2.5 right-3 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
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
            {plan.features.length > 0 && (
              <div className="space-y-1">
                {plan.features.slice(0, 4).map((feature, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-primary shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="text-right shrink-0 ml-3">
            {months > 1 ? (
              <>
                <p className="font-bold text-xl text-foreground">
                  ₹{monthlyPrice}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ₹{plan.price} for {months} months
                </p>
              </>
            ) : (
              <>
                <p className="font-bold text-xl text-foreground">₹{plan.price}</p>
                <p className="text-xs text-muted-foreground">for 1 month</p>
              </>
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
          <h3 className="font-bold text-lg">Unlock Funnels Pro</h3>
          <p className="text-xs text-muted-foreground">Create unlimited funnels with advanced features</p>
        </div>
      </div>

      {plansLoading ? (
        <div className="space-y-3">
          <div className="h-28 bg-muted animate-pulse rounded-xl" />
          <div className="h-24 bg-muted animate-pulse rounded-xl" />
        </div>
      ) : funnelPlans.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No funnel plans available yet.</p>
      ) : (
        <div className="space-y-3">
          {funnelPlans.map((plan) => (
            <PlanCard 
              key={plan.plan_key} 
              plan={plan} 
              isSelected={selectedPlanKey === plan.plan_key} 
            />
          ))}
        </div>
      )}

      <Button 
        onClick={() => handleUpgrade(selectedPlanKey)}
        className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/30"
        disabled={paymentLoading || plansLoading || !selectedPlan}
      >
        {paymentLoading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Opening payment...
          </>
        ) : selectedPlan ? (
          <>
            <Crown className="h-5 w-5 mr-2" />
            Get {selectedPlan.name} – ₹{selectedPlan.price}
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
            <DrawerTitle className="sr-only">Funnels Pro Plans</DrawerTitle>
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
          <SheetTitle className="sr-only">Funnels Pro Plans</SheetTitle>
        </SheetHeader>
        {PlanContent}
      </SheetContent>
    </Sheet>
  );
}
