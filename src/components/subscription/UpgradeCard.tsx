import { Crown, Sparkles, Check, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function UpgradeCard() {
  const { isPro, isAdminOverride, daysRemaining, subscription, loading } = useSubscription();
  const { toast } = useToast();

  const handleSubscribe = () => {
    toast({
      title: "Opening Payment Gateway",
      description: "Redirecting to Razorpay for Pro access...",
    });
    window.open('https://rzp.io/rzp/iQIz9kH', '_blank');
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

      <p className="text-sm text-muted-foreground mb-4">
        Get <span className="font-bold text-foreground">1 Month</span> of Pro access for <span className="font-bold text-foreground">₹249</span> to unlock Track Up, Action Up and all premium features.
      </p>

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

      <Button 
        onClick={handleSubscribe}
        className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/30"
      >
        <Crown className="h-5 w-5 mr-2" />
        Unlock Pro – ₹249 / 1 Month
      </Button>
    </div>
  );
}
