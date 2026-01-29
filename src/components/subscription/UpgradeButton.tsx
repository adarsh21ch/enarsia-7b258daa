import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeDrawer } from './UpgradeDrawer';

interface UpgradeButtonProps {
  className?: string;
  variant?: 'default' | 'prominent' | 'compact';
  triggerText?: string;
}

/**
 * Simple upgrade button that opens the plan selection drawer.
 */
export function UpgradeButton({ variant = 'default', triggerText }: UpgradeButtonProps) {
  const { isPaid, loading: subLoading } = useSubscription();

  // Don't show for paid users
  if (subLoading || isPaid) return null;

  return <UpgradeDrawer variant={variant} triggerText={triggerText} />;
}
