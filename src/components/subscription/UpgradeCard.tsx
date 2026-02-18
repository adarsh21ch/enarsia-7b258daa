import { Crown, Sparkles, Check, Calendar, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { usePermissions } from '@/contexts/PermissionsContext';
import { PLAN_CONFIG, PlanType } from '@/hooks/usePaymentLinks';
import { useRazorpay } from '@/hooks/useRazorpay';
import { format } from 'date-fns';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UpgradeCardProps {
  /** Which app is showing this card - affects which plans are shown */
  appContext?: 'nevorai' | 'trackup';
}

export function UpgradeCard({ appContext = 'nevorai' }: UpgradeCardProps) {
  const { isPro, isPaid, isAdminOverride, daysRemaining, subscription, loading, refetch } = useSubscription();
  const { isPaid: permPaid, isLoading: permLoading } = usePermissions();
  const { initiatePayment, initiateSubscription, loading: paymentLoading } = useRazorpay();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('quarterly');

  const handleUpgrade = (planType: PlanType) => {
    const plan = PLAN_CONFIG[planType];
    
    // Route to correct flow based on billing_type
    if (plan?.billing_type === 'recurring') {
      initiateSubscription({
        planType,
        onSuccess: () => {
          toast({ title: "Subscription Started 🎉", description: "Your recurring plan has been initiated." });
          refetch();
        },
        onError: (error) => console.error('Subscription error:', error),
      });
      return;
    }
    
    initiatePayment({
      planType,
      onSuccess: () => {
        toast({ title: "Pro Activated 🎉", description: "Welcome to premium! All features are now unlocked." });
        refetch();
      },
      onError: (error) => console.error('Payment error:', error),
    });
  };

  if (loading || permLoading) return null;

  // If user has active paid plan, show status
  if (permPaid || isPaid) {
    const expiryDate = subscription?.expires_at 
      ? format(new Date(subscription.expires_at), 'MMM d, yyyy')
      : null;

    return (
      <div className="rounded-2xl p-5 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-emerald-500/20">
            <Crown className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Pro Active</h3>
            {isAdminOverride && (
              <span className="text-xs text-amber-500 font-medium">Admin Override</span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Full access to team sync, analytics, and all premium features.
        </p>
        {expiryDate && !isAdminOverride && (
          <div className="flex items-center gap-2 text-sm bg-emerald-500/10 rounded-lg p-2">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <span className="text-emerald-700 font-medium">
              Valid until {expiryDate} ({daysRemaining} days left)
            </span>
          </div>
        )}
      </div>
    );
  }

  // Free user - show upgrade options
  return (
    <div className="rounded-2xl p-5 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-primary/20">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Unlock Pro Features</h3>
          <p className="text-xs text-muted-foreground">Choose a plan that works for you</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
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
                {PLAN_CONFIG.quarterly.features.slice(0, 4).map((feature, i) => (
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
      
      <p className="text-xs text-center text-muted-foreground mt-3">
        Secure payment via Razorpay • Cancel anytime
      </p>
    </div>
  );
}
