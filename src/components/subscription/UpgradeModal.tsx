import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Check, AlertTriangle, Star } from 'lucide-react';
import { usePaymentLinks, PlanConfig } from '@/hooks/usePaymentLinks';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { useEffect, useMemo, useState } from 'react';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  /** Current lead count - if at limit, show appropriate messaging */
  currentLeadCount?: number;
  /** Whether user has team/leader features - suggests Pro instead of Mini */
  hasTeamFeatures?: boolean;
  /** Which app context - affects which plans to show */
  appContext?: 'nevorai' | 'trackup';
  /** Optional custom title */
  title?: string;
  /** Optional custom description */
  description?: string;
}

export function UpgradeModal({ 
  open, 
  onClose, 
  currentLeadCount,
  hasTeamFeatures = false,
  appContext = 'nevorai',
  title,
  description,
}: UpgradeModalProps) {
  const { initiatePayment, loading: paymentLoading } = useRazorpay();
  const { toast } = useToast();
  const { refetch } = useSubscription();
  const { getDefaultPlan, plans } = usePaymentLinks();
  const { config } = useAdminConfig();

  const freeLimit = config.limits.hard_limit ?? config.limits.free_total_leads;
  const isAtLimit = currentLeadCount !== undefined && freeLimit !== undefined
    ? currentLeadCount >= freeLimit
    : false;

  const sortedPlans = useMemo(() => [...plans].sort((a, b) => a.sortOrder - b.sortOrder), [plans]);
  const defaultPlan = getDefaultPlan();

  const [selectedPlanKey, setSelectedPlanKey] = useState<string>(defaultPlan?.plan_key || sortedPlans[0]?.plan_key || 'monthly');

  useEffect(() => {
    if (!open) return;
    const next = defaultPlan?.plan_key || sortedPlans[0]?.plan_key;
    if (next) setSelectedPlanKey(next);
  }, [open, defaultPlan?.plan_key, sortedPlans]);
  
  const handleUpgrade = (planKey: string) => {
    initiatePayment({
      planType: planKey,
      onSuccess: () => {
        toast({
          title: "Pro Activated 🎉",
          description: "Welcome to premium! All features are now unlocked.",
        });
        refetch();
        onClose();
      },
      onError: (error) => {
        console.error('Payment error:', error);
      }
    });
  };

  const modalTitle = title || (isAtLimit ? 'Lead Limit Reached' : 'Unlock Pro Features');
  const modalDescription = description || (
    isAtLimit 
      ? `You've reached the free limit of ${freeLimit ?? ''} prospects. Upgrade to continue.`
      : 'Subscribe to unlock team tracking, analytics, and all premium features.'
  );

  const primaryPlan: PlanConfig | undefined = sortedPlans.find(p => p.plan_key === selectedPlanKey) || defaultPlan || sortedPlans[0];
  const secondaryPlans = sortedPlans.filter(p => p.plan_key !== primaryPlan?.plan_key);
  const secondaryPlan = secondaryPlans[0];

  const formatDuration = (days: number) => {
    const months = Math.round(days / 30);
    if (months >= 1 && months * 30 === days) return `${months} month${months > 1 ? 's' : ''}`;
    return `${days} days`;
  };

  const getPerMonth = (plan: PlanConfig) => {
    const months = Math.round(plan.durationDays / 30);
    if (months > 1) return Math.floor(plan.price / months);
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            {isAtLimit ? (
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            ) : (
              <Crown className="h-8 w-8 text-primary" />
            )}
          </div>
          <DialogTitle className="text-xl">{modalTitle}</DialogTitle>
          <DialogDescription className="text-center">
            {modalDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-4">
          {primaryPlan && (
            <button
              type="button"
              onClick={() => setSelectedPlanKey(primaryPlan.plan_key)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left relative ${
                selectedPlanKey === primaryPlan.plan_key
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              {primaryPlan.badgeText && (
                <div className="absolute -top-2.5 right-3 px-2 py-0.5 bg-amber-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {primaryPlan.badgeText}
                </div>
              )}
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="h-4 w-4 text-primary" />
                    <p className="font-semibold text-foreground">{primaryPlan.name}</p>
                  </div>
                  <div className="space-y-1">
                    {primaryPlan.features.slice(0, 2).map((feature, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-primary shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  {getPerMonth(primaryPlan) ? (
                    <>
                      <p className="font-bold text-lg text-foreground">₹{getPerMonth(primaryPlan)}<span className="text-xs font-normal text-muted-foreground">/month</span></p>
                      <p className="text-[10px] text-muted-foreground">Billed as ₹{primaryPlan.price} for {formatDuration(primaryPlan.durationDays)}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-lg text-foreground">₹{primaryPlan.price}</p>
                      <p className="text-xs text-muted-foreground">{formatDuration(primaryPlan.durationDays)}</p>
                    </>
                  )}
                </div>
              </div>
            </button>
          )}

          {secondaryPlan && (
            <button
              type="button"
              onClick={() => setSelectedPlanKey(secondaryPlan.plan_key)}
              className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                selectedPlanKey === secondaryPlan.plan_key
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-primary" />
                  <p className="font-semibold text-foreground">{secondaryPlan.name}</p>
                </div>
                <div className="text-right">
                  {getPerMonth(secondaryPlan) ? (
                    <>
                      <span className="font-bold text-foreground">₹{getPerMonth(secondaryPlan)}<span className="text-xs font-normal text-muted-foreground">/month</span></span>
                      <p className="text-[10px] text-muted-foreground">Billed ₹{secondaryPlan.price} / {formatDuration(secondaryPlan.durationDays)}</p>
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-foreground">₹{secondaryPlan.price}</span>
                      <span className="text-xs text-muted-foreground ml-1">/ {formatDuration(secondaryPlan.durationDays)}</span>
                    </>
                  )}
                </div>
              </div>
            </button>
          )}

          <Button 
            onClick={() => primaryPlan && handleUpgrade(selectedPlanKey)} 
            className="w-full"
            disabled={paymentLoading}
          >
            <Crown className="h-4 w-4 mr-2" />
            {paymentLoading ? 'Opening payment...' : `Get ${primaryPlan?.name ?? 'Pro'}`}
          </Button>

          <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
