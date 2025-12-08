import { Crown, Sparkles, Check, Calendar, Loader2, Star, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSubscription } from '@/hooks/useSubscription';
import { useRazorpay } from '@/hooks/useRazorpay';
import { format } from 'date-fns';
import { useState } from 'react';

type PlanType = 'monthly' | 'yearly';

export function UpgradeCard() {
  const { isPro, isAdminOverride, daysRemaining, subscription, loading, refetch } = useSubscription();
  const { initiatePayment, loading: paymentLoading } = useRazorpay();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly');
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);

  const isValidCoupon = couponCode.trim().toUpperCase() === 'ACHIEVERS1000';
  const yearlyPrice = couponApplied && isValidCoupon ? 1999 : 2999;
  const yearlyPricePerMonth = Math.round(yearlyPrice / 12);

  const handleApplyCoupon = () => {
    if (isValidCoupon) {
      setCouponApplied(true);
    }
  };

  const handleSubscribe = (plan: PlanType) => {
    initiatePayment({
      planType: plan,
      couponCode: plan === 'yearly' && couponApplied && isValidCoupon ? 'ACHIEVERS1000' : undefined,
      onSuccess: () => {
        refetch();
      },
    });
  };

  if (loading) return null;

  if (isPro) {
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
            <h3 className="font-bold text-lg">Pro Plan Active</h3>
            {isAdminOverride && (
              <span className="text-xs text-amber-500 font-medium">Admin Override</span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          You have full access to all premium features including Track Up and Action Up.
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

  return (
    <div className="rounded-2xl p-5 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-primary/20">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Unlock Pro Features</h3>
          <p className="text-xs text-muted-foreground">Get the most out of NevorAI</p>
        </div>
      </div>

      <div className="space-y-2 mb-5">
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-primary" />
          <span>Track Up - Funnel & Leads Tracker</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-primary" />
          <span>Action Up - Activity Center & AI Insights</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-primary" />
          <span>Advanced Analytics & Reports</span>
        </div>
      </div>

      {/* Plan Selection */}
      <div className="space-y-3 mb-4">
        {/* Yearly Plan - Best Value */}
        <button
          type="button"
          onClick={() => setSelectedPlan('yearly')}
          className={`w-full p-4 rounded-xl border-2 transition-all text-left relative ${
            selectedPlan === 'yearly'
              ? 'border-primary bg-primary/10'
              : 'border-border bg-card hover:border-primary/50'
          }`}
        >
          <div className="absolute -top-2.5 right-3 px-2 py-0.5 bg-amber-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
            <Star className="h-3 w-3" />
            Best Value
          </div>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-foreground">Pro Yearly</p>
              <p className="text-xs text-muted-foreground">12 months of Pro access</p>
            </div>
            <div className="text-right">
              {couponApplied && isValidCoupon ? (
                <>
                  <p className="font-bold text-lg text-foreground">₹1,999</p>
                  <p className="text-xs text-muted-foreground line-through">₹2,999</p>
                </>
              ) : (
                <>
                  <p className="font-bold text-lg text-foreground">₹2,999</p>
                  <p className="text-xs text-muted-foreground">₹{yearlyPricePerMonth}/month</p>
                </>
              )}
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
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-foreground">Pro Monthly</p>
              <p className="text-xs text-muted-foreground">1 month of Pro access</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg text-foreground">₹249</p>
              <p className="text-xs text-muted-foreground">/month</p>
            </div>
          </div>
        </button>
      </div>

      {/* Coupon Code Section - Only show for yearly plan */}
      {selectedPlan === 'yearly' && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Achievers Club members: Use code ACHIEVERS1000 for ₹1,000 OFF
            </span>
          </div>
          {!couponApplied ? (
            <div className="flex gap-2">
              <Input
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="h-9 text-sm"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleApplyCoupon}
                disabled={!isValidCoupon}
                className="shrink-0"
              >
                Apply
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-emerald-600">
                ✓ ACHIEVERS1000 applied – ₹1,000 OFF!
              </span>
              <button 
                type="button"
                onClick={() => { setCouponApplied(false); setCouponCode(''); }}
                className="text-xs text-muted-foreground underline"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}

      <Button 
        onClick={() => handleSubscribe(selectedPlan)}
        disabled={paymentLoading}
        className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/30"
      >
        {paymentLoading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Crown className="h-5 w-5 mr-2" />
            {selectedPlan === 'yearly' 
              ? `Unlock Pro Yearly – ₹${yearlyPrice.toLocaleString()}` 
              : 'Unlock Pro Monthly – ₹249'
            }
          </>
        )}
      </Button>
    </div>
  );
}
