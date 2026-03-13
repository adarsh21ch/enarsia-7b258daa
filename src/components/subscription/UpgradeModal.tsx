import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Crown, AlertTriangle, X } from 'lucide-react';
import { usePaymentLinks } from '@/hooks/usePaymentLinks';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { useEffect, useMemo, useState } from 'react';
import { TierCard } from './TierCard';
import { getTierDisplayName } from '@/config/tierLabels';
import { useIsMobile } from '@/hooks/use-mobile';

// ... keep existing code

  const isMobile = useIsMobile();

  const modalTitle = title || (isAtLimit ? 'Lead Limit Reached' : 'Upgrade Your Plan');
  const modalDescription = description || (
    isAtLimit 
      ? `You've reached the free limit of ${freeLimit ?? ''} prospects. Upgrade to continue.`
      : 'Choose a plan that works for you.'
  );

  const PlanContent = (
    <>
      <div className="space-y-3">
        {plansLoading ? (
          <div className="space-y-3">
            <div className="h-36 bg-muted animate-pulse rounded-xl" />
            <div className="h-36 bg-muted animate-pulse rounded-xl" />
          </div>
        ) : (
          <>
            {proPlans.length > 0 && (
              <TierCard tierName="Basic" plans={proPlans} selectedPlanKey={selectedPlanKey} onSelectPlan={setSelectedPlanKey} />
            )}
            {premiumPlans.length > 0 && (
              <TierCard tierName="Pro" plans={premiumPlans} isPremium selectedPlanKey={selectedPlanKey} onSelectPlan={setSelectedPlanKey} />
            )}
          </>
        )}
      </div>

      <div className="sticky bottom-0 pt-3 pb-1 bg-card space-y-2">
        <Button 
          onClick={() => selectedPlan && handleUpgrade(selectedPlanKey)} 
          className={`w-full h-11 font-semibold ${isPremiumSelected ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
          disabled={paymentLoading || plansLoading}
        >
          <Crown className="h-4 w-4 mr-2" />
          {paymentLoading ? 'Opening payment...' : `Get ${selectedPlan?.name ?? 'Pro'} – ₹${selectedPlan?.price ?? ''}`}
        </Button>

        <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">
          Maybe Later
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onClose}>
        <DrawerContent className="max-h-[92vh] flex flex-col">
          <DrawerHeader className="text-center space-y-3 shrink-0 px-4 pt-4 pb-2">
            <div className="mx-auto w-3 h-1 rounded-full bg-muted-foreground/30 mb-1" />
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              {isAtLimit ? (
                <AlertTriangle className="h-7 w-7 text-amber-500" />
              ) : (
                <Crown className="h-7 w-7 text-primary" />
              )}
            </div>
            <DrawerTitle className="text-lg">{modalTitle}</DrawerTitle>
            <p className="text-sm text-muted-foreground">{modalDescription}</p>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {PlanContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="text-center space-y-4 shrink-0 px-6 pt-6 pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            {isAtLimit ? (
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            ) : (
              <Crown className="h-8 w-8 text-primary" />
            )}
          </div>
          <DialogTitle className="text-xl">{modalTitle}</DialogTitle>
          <DialogDescription className="text-center">{modalDescription}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {PlanContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}
