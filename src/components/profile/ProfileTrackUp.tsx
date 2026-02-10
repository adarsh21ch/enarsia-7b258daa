import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { BarChart3, Layers, Lock, Crown, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePaymentLinks } from '@/hooks/usePaymentLinks';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { usePersonalSnapshotV2Read } from '@/hooks/usePersonalSnapshotV2Read';
import { useSnapshotV2ComputedData } from '@/hooks/useSnapshotV2ComputedData';
import { useTrackingFormat } from '@/hooks/useTrackingFormat';
import { useFunnelConfig } from '@/hooks/useFunnelConfig';
import { formatTrackingValue } from '@/lib/snapshotSlotUtils';

interface ProfileTrackUpProps {
  isPro: boolean;
}

type TrackUpTab = 'leads' | 'funnel';

/**
 * Profile page tracking section — uses V2 snapshot data.
 */
export function ProfileTrackUp({ isPro }: ProfileTrackUpProps) {
  const [activeTab, setActiveTab] = useState<TrackUpTab>('leads');
  const { initiatePayment, loading: paymentLoading } = useRazorpay();
  const { toast } = useToast();
  const { refetch } = useSubscription();
  const { getDefaultPlan, loading: plansLoading } = usePaymentLinks();

  const defaultPlan = getDefaultPlan();

  // V2 data — tag names must be resolved before read hook
  const { leadsTrackingTags, stageTags, leadsTrackingTagNames, stageTagNames, stageFinalTargetTag } = useTrackingFormat();
  const monthYear = format(new Date(), 'yyyy-MM');
  const { snapshots: personalSnapshots } = usePersonalSnapshotV2Read(monthYear, leadsTrackingTagNames, stageTagNames);
  const { getEffectiveConfig } = useFunnelConfig();
  const effectiveConfig = getEffectiveConfig();

  const activeTags = activeTab === 'leads' ? leadsTrackingTags : [];
  const activeStages = activeTab === 'funnel' ? stageTags : [];

  const { kpiData, responseTagNames, stageTagNames: computedStageNames } = useSnapshotV2ComputedData(
    personalSnapshots,
    activeTags.length > 0 ? leadsTrackingTags : [],
    activeStages.length > 0 ? stageTags : stageTags,
    effectiveConfig?.funnel_length ?? 3,
    effectiveConfig?.day_1_start ?? null,
  );

  const handleUpgrade = () => {
    const planKey = defaultPlan?.plan_key || 'quarterly';
    initiatePayment({
      planType: planKey,
      onSuccess: () => {
        toast({ title: "Pro Activated 🎉", description: "Welcome to premium! All features are now unlocked." });
        refetch();
      },
      onError: (error) => console.error('Payment error:', error),
    });
  };

  // Build mini summary items based on active tab
  const summaryItems = useMemo(() => {
    if (activeTab === 'leads') {
      return [
        { label: 'Leads', value: kpiData.totalLeads },
        { label: 'Responses', value: kpiData.totalResponses },
        ...responseTagNames.slice(0, 3).map((name) => ({
          label: name,
          value: kpiData.responseTagTotals[name] ?? 0,
        })),
      ];
    }
    return [
      ...computedStageNames.map((name) => ({
        label: name,
        value: kpiData.stageTagTotals[name] ?? 0,
        isStar: name === kpiData.finalTagName,
      })),
    ];
  }, [activeTab, kpiData, responseTagNames, computedStageNames]);

  return (
    <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
      {/* Header with tabs */}
      <div className="p-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">My Tracking</h3>
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">
            {format(new Date(), 'MMM yyyy')}
          </span>
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
        {/* Pro Lock Overlay */}
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

        {/* V2 Mini Summary Grid */}
        <div className={cn("p-3", !isPro && "blur-sm pointer-events-none")}>
          <div className="grid grid-cols-3 gap-2">
            {summaryItems.map((item) => (
              <div key={item.label} className="rounded-lg bg-muted/50 px-2.5 py-2 text-center">
                <div className="flex items-center justify-center gap-1">
                  {'isStar' in item && item.isStar && (
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  )}
                  <span className="text-lg font-bold text-foreground">
                    {formatTrackingValue(item.value)}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
          {personalSnapshots.length === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              No tracking data yet this month
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
