import { Crown, Sparkles, Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { useSubscription } from '@/hooks/useSubscription';
import { PLAN_CONFIG, PlanType } from '@/hooks/usePaymentLinks';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';

interface UpgradeDrawerProps {
  /** Trigger button variant */
  variant?: 'default' | 'prominent' | 'compact';
  /** Custom trigger text */
  triggerText?: string;
}

export function UpgradeDrawer({ variant = 'default', triggerText }: UpgradeDrawerProps) {
  const { isPaid, loading } = useSubscription();
  const { initiatePayment, loading: paymentLoading } = useRazorpay();
  const { toast } = useToast();
  const { refetch } = useSubscription();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('quarterly');

  const handleUpgrade = (planType: PlanType) => {
    initiatePayment({
      planType,
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

  // Don't show for paid users or while loading
  if (loading || isPaid) return null;

  const buttonText = triggerText || 'Upgrade to Pro';

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

      <div className="space-y-3">
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
              <p className="text-xs text-muted-foreground mb-2">{PLAN_CONFIG.quarterly.description}</p>
              <div className="space-y-1">
                {PLAN_CONFIG.quarterly.features.slice(0, 3).map((feature, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-primary shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-right shrink-0 ml-3">
              <p className="font-bold text-xl text-foreground">₹299</p>
              <p className="text-xs text-muted-foreground">for 4 months</p>
              <p className="text-xs text-primary font-medium">Just ₹75 / month</p>
            </div>
          </div>
        </button>

        {/* Monthly Plan */}
        <button
          type="button"
          onClick={() => setSelectedPlan('monthly')}
          className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
            selectedPlan === 'monthly'
              ? 'border-primary bg-primary/10'
              : 'border-border bg-card hover:border-primary/50'
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-4 w-4 text-primary" />
                <p className="font-semibold text-foreground">{PLAN_CONFIG.monthly.name}</p>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{PLAN_CONFIG.monthly.description}</p>
              <div className="space-y-1">
                {PLAN_CONFIG.monthly.features.slice(0, 3).map((feature, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-primary shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-right shrink-0 ml-3">
              <p className="font-bold text-xl text-foreground">₹99</p>
              <p className="text-xs text-muted-foreground">for 1 month</p>
            </div>
          </div>
        </button>
      </div>

      <Button 
        onClick={() => handleUpgrade(selectedPlan)}
        className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/30"
        disabled={paymentLoading}
      >
        {paymentLoading ? (
          'Opening payment...'
        ) : (
          <>
            <Crown className="h-5 w-5 mr-2" />
            Get {PLAN_CONFIG[selectedPlan].name} – ₹{PLAN_CONFIG[selectedPlan].price}
          </>
        )}
      </Button>
      
      <p className="text-xs text-center text-muted-foreground">
        Secure payment via Razorpay • Cancel anytime
      </p>
    </div>
  );

  // Mobile: Bottom drawer
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

  // Desktop: Right slide-in sheet
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
