import { usePermissions } from '@/contexts/PermissionsContext';
import { useFreeTrial } from '@/hooks/useFreeTrial';
import { UpgradeDrawer } from './UpgradeDrawer';

interface UpgradeButtonProps {
  className?: string;
  variant?: 'default' | 'prominent' | 'compact';
  triggerText?: string;
  /** Which tab this button lives on — visibility is controlled by admin config */
  tabId?: string;
}

/**
 * Simple upgrade button that opens the plan selection drawer.
 * Uses permissions context instead of direct subscription check.
 * When tabId is provided, only renders if that tab is in the admin allowedTabs list.
 */
export function UpgradeButton({ variant = 'default', triggerText, tabId }: UpgradeButtonProps) {
  const { isPaid, isLoading } = usePermissions();
  const { allowedTabs } = useFreeTrial();

  // Don't show for paid users
  if (isLoading || isPaid) return null;

  // If tabId specified, only show on admin-whitelisted tabs
  if (tabId && !allowedTabs.includes(tabId)) return null;

  return <UpgradeDrawer variant={variant} triggerText={triggerText} />;
}
