import { UpgradeModal } from '@/components/subscription/UpgradeModal';

interface ProLimitModalProps {
  open: boolean;
  onClose: () => void;
  currentCount?: number;
  /** Whether user has team/leader features */
  hasTeamFeatures?: boolean;
}

/**
 * Modal shown when user hits the free lead limit (500 leads).
 * This is a wrapper around UpgradeModal with lead-specific messaging.
 */
export function ProLimitModal({ open, onClose, currentCount, hasTeamFeatures }: ProLimitModalProps) {
  return (
    <UpgradeModal
      open={open}
      onClose={onClose}
      currentLeadCount={currentCount}
      hasTeamFeatures={hasTeamFeatures}
      appContext="neverai"
    />
  );
}
