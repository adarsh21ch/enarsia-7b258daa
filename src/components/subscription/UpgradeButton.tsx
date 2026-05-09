import { usePermissions } from '@/contexts/PermissionsContext';
import { useFreeTrial } from '@/hooks/useFreeTrial';
import { useUpgradeUrgency } from '@/lib/planUtils';
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
 *
 * Visibility rules:
 * - Hidden for paid users (always)
 * - When tabId is provided, only renders if that tab is in the admin allowedTabs list
 * - EXCEPTION: when the user is in an urgent state (expired Pro, hit lead limit,
 *   trial expired) the button ALWAYS renders, bypassing the tab whitelist —
 *   no user should ever be stuck without an upgrade CTA.
 */
export function UpgradeButton({ variant = 'default', triggerText, tabId }: UpgradeButtonProps) {
  const { isPaid, isLoading } = usePermissions();
  const { allowedTabs } = useFreeTrial();
  const { isUrgent } = useUpgradeUrgency();

  // Don't show for paid users
  if (isLoading || isPaid) return null;

  // If tabId specified AND user is not in an urgent state, respect admin whitelist
  if (tabId && !allowedTabs.includes(tabId) && !isUrgent) return null;

  return <UpgradeDrawer variant={variant} triggerText={triggerText} />;
}
