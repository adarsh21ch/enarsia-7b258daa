import { Crown, Sparkles, Check, Calendar, Star, ExternalLink, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { usePaymentLinks, PlanType } from '@/hooks/usePaymentLinks';
import { format } from 'date-fns';
import { useState } from 'react';

interface UpgradeCardProps {
  /** Which app is showing this card - affects which plans are shown */
  appContext?: 'neverai' | 'trackup';
}

export function UpgradeCard({ appContext = 'neverai' }: UpgradeCardProps) {
  const { plan, isPro, isMini, isPaid, isAdminOverride, daysRemaining, subscription, loading } = useSubscription();
  const { openPaymentLink, PLAN_CONFIG } = usePaymentLinks();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('pro');

  if (loading) return null;

  // If user has active paid plan, show status
  if (isPaid) {
    const expiryDate = subscription?.expires_at 
      ? format(new Date(subscription.expires_at), 'MMM d, yyyy')
      : null;

    const planName = isPro ? 'NeverAI Pro' : 'TrackUp Mini';
    const planIcon = isPro ? Crown : Zap;
    const PlanIcon = planIcon;

    return (
      <div className="rounded-2xl p-5 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-emerald-500/20">
            <PlanIcon className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{planName} Active</h3>
            {isAdminOverride && (
              <span className="text-xs text-amber-500 font-medium">Admin Override</span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {isPro 
            ? 'Full access to team sync, analytics, and all premium features.'
            : 'Manual personal and team tracking enabled.'}
        </p>
        {expiryDate && !isAdminOverride && (
          <div className="flex items-center gap-2 text-sm bg-emerald-500/10 rounded-lg p-2">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <span className="text-emerald-700 font-medium">
              Valid until {expiryDate} ({daysRemaining} days left)
            </span>
          </div>
        )}
        
        {/* Mini users can upgrade to Pro */}
        {isMini && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground mb-3">
              Upgrade to Pro for team sync and advanced features
            </p>
            <Button 
              onClick={() => openPaymentLink('pro')}
              className="w-full"
              variant="outline"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Pro – ₹299/month
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Free user - show upgrade options
  // NeverAI app: Show ONLY Pro
  // TrackUp app: Show both Mini and Pro
  const showMini = appContext === 'trackup';

  return (
    <div className="rounded-2xl p-5 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-primary/20">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Unlock Premium Features</h3>
          <p className="text-xs text-muted-foreground">Choose a plan that works for you</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {/* NeverAI Pro Plan - Always shown */}
        <button
          type="button"
          onClick={() => setSelectedPlan('pro')}
          className={`w-full p-4 rounded-xl border-2 transition-all text-left relative ${
            selectedPlan === 'pro'
              ? 'border-primary bg-primary/10'
              : 'border-border bg-card hover:border-primary/50'
          }`}
        >
          <div className="absolute -top-2.5 right-3 px-2 py-0.5 bg-amber-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
            <Star className="h-3 w-3" />
            Recommended
          </div>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-4 w-4 text-primary" />
                <p className="font-semibold text-foreground">{PLAN_CONFIG.pro.name}</p>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{PLAN_CONFIG.pro.description}</p>
              <div className="space-y-1">
                {PLAN_CONFIG.pro.features.slice(0, 4).map((feature, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-primary shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-right shrink-0 ml-3">
              <p className="font-bold text-xl text-foreground">₹299</p>
              <p className="text-xs text-muted-foreground">/month</p>
            </div>
          </div>
        </button>

        {/* TrackUp Mini Plan - Only in TrackUp app */}
        {showMini && (
          <button
            type="button"
            onClick={() => setSelectedPlan('mini')}
            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
              selectedPlan === 'mini'
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card hover:border-primary/50'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <p className="font-semibold text-foreground">{PLAN_CONFIG.mini.name}</p>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{PLAN_CONFIG.mini.description}</p>
                <div className="space-y-1">
                  {PLAN_CONFIG.mini.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-amber-500 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="font-bold text-xl text-foreground">₹29</p>
                <p className="text-xs text-muted-foreground">/month</p>
              </div>
            </div>
          </button>
        )}
      </div>

      <Button 
        onClick={() => openPaymentLink(selectedPlan)}
        className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/30"
      >
        {selectedPlan === 'pro' ? (
          <>
            <Crown className="h-5 w-5 mr-2" />
            Get {PLAN_CONFIG.pro.name} – ₹{PLAN_CONFIG.pro.price}/month
          </>
        ) : (
          <>
            <Zap className="h-5 w-5 mr-2" />
            Get {PLAN_CONFIG.mini.name} – ₹{PLAN_CONFIG.mini.price}/month
          </>
        )}
        <ExternalLink className="h-4 w-4 ml-2" />
      </Button>
      
      <p className="text-xs text-center text-muted-foreground mt-3">
        Secure payment via Razorpay • Cancel anytime
      </p>
    </div>
  );
}
