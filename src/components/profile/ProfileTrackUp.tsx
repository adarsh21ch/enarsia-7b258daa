import { useState } from 'react';
import { LeadsTracker } from '@/components/trackup/LeadsTracker';
import { FunnelTracker } from '@/components/trackup/FunnelTracker';
import { Button } from '@/components/ui/button';
import { BarChart3, Layers, Lock, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePaymentLinks } from '@/hooks/usePaymentLinks';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';

interface ProfileTrackUpProps {
  /** Whether user has Pro plan (full access) */
  isPro: boolean;
}

type TrackUpTab = 'leads' | 'funnel';

/**
 * Profile page tracking section with leads and funnel tabs.
 * NOW USES DYNAMIC PLANS FROM ADMIN CONFIG.
 */
export function ProfileTrackUp({ isPro }: ProfileTrackUpProps) {
  const [activeTab, setActiveTab] = useState<TrackUpTab>('leads');
  const { initiatePayment, loading: paymentLoading } = useRazorpay();
  const { toast } = useToast();
  const { refetch } = useSubscription();
  const { getDefaultPlan, loading: plansLoading } = usePaymentLinks();

  // Get default plan dynamically
  const defaultPlan = getDefaultPlan();

  const handleUpgrade = () => {
    const planKey = defaultPlan?.plan_key || 'quarterly';
    initiatePayment({
      planType: planKey,
      onSuccess: () => {
        toast({
          title: "Pro Activated 🎉",
          description: "Welcome to premium! All features are now unlocked.",
        });
        refetch();
      },
      onError: (error) => {
        console.error('Payment error:', error);
      }
    });
  };

  return (
    <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
      {/* Header with tabs */}
      <div className="p-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">My Tracking</h3>
          </div>
        </div>
        
        {/* Tab Toggle */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('leads')}
            className={cn(
              "flex-1 h-8 text-xs font-medium gap-1.5 rounded-md transition-all",
              activeTab === 'leads' 
                ? "bg-background shadow-sm text-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-transparent"
            )}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Leads
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('funnel')}
            className={cn(
              "flex-1 h-8 text-xs font-medium gap-1.5 rounded-md transition-all",
              activeTab === 'funnel' 
                ? "bg-background shadow-sm text-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-transparent"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Funnel
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative">
        {/* Pro Lock Overlay - Only show for free users */}
        {!isPro && (
          <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Premium Feature</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Upgrade to unlock personal tracking analytics
              </p>
              <Button 
                size="sm" 
                onClick={handleUpgrade}
                className="gap-1.5"
                disabled={paymentLoading || plansLoading}
              >
                <Crown className="h-3.5 w-3.5" />
                {paymentLoading ? 'Processing...' : defaultPlan ? `Upgrade – ₹${defaultPlan.price}` : 'Upgrade'}
              </Button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className={cn("p-3", !isPro && "blur-sm pointer-events-none")}>
          {activeTab === 'leads' ? (
            <LeadsTracker isPro={isPro} />
          ) : (
            <FunnelTracker isPro={isPro} />
          )}
        </div>
      </div>
    </div>
  );
}
