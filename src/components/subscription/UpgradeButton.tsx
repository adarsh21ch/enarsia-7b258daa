import { Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { usePaymentLinks } from '@/hooks/usePaymentLinks';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface UpgradeButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

/**
 * Simple upgrade button that initiates payment when clicked.
 * Shows price from default plan.
 */
export function UpgradeButton({ className, variant = 'default', size = 'default' }: UpgradeButtonProps) {
  const { isPaid, loading: subLoading, refetch } = useSubscription();
  const { initiatePayment, loading: paymentLoading } = useRazorpay();
  const { toast } = useToast();
  const { getDefaultPlan, loading: plansLoading } = usePaymentLinks();

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

  // Don't show for paid users
  if (subLoading || isPaid) return null;

  const isLoading = paymentLoading || plansLoading;
  const buttonText = isLoading 
    ? 'Loading...' 
    : defaultPlan 
      ? `Upgrade to Pro – ₹${defaultPlan.price}` 
      : 'Upgrade to Pro';

  return (
    <Button
      onClick={handleUpgrade}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
    >
      <Crown className="h-4 w-4" />
      {buttonText}
    </Button>
  );
}
