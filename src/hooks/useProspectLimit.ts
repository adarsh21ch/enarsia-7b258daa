import { useMemo } from 'react';
import { Prospect } from '@/types/prospect';

// Soft limit for upgrade prompt (no hard blocking)
const SOFT_PROSPECT_LIMIT = 50;

export function useProspectLimit(prospects: Prospect[], isPro: boolean) {
  // Count unique prospects by phone number
  const uniqueCount = useMemo(() => {
    const uniquePhones = new Set(prospects.map(p => p.phone?.trim().toLowerCase()).filter(Boolean));
    return uniquePhones.size;
  }, [prospects]);

  // No hard limits - just soft prompts for Free users
  const showUpgradeHint = !isPro && uniqueCount >= SOFT_PROSPECT_LIMIT;

  // Always allow adding - no blocking
  const canAdd = () => true;

  return {
    uniqueCount,
    isPro,
    showUpgradeHint,
    canAdd,
    // Legacy compatibility - no longer enforced
    isAtLimit: false,
    isNearLimit: showUpgradeHint,
    limit: Infinity,
    remaining: Infinity,
    getAvailableSlots: () => Infinity,
  };
}
