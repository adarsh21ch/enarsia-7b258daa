import { useMemo } from 'react';
import { Prospect } from '@/types/prospect';

const FREE_PROSPECT_LIMIT = 100;
const PRO_PROSPECT_LIMIT = 10000;

export function useProspectLimit(prospects: Prospect[], isPro: boolean) {
  // Count unique prospects by phone number
  const uniqueCount = useMemo(() => {
    const uniquePhones = new Set(prospects.map(p => p.phone?.trim().toLowerCase()).filter(Boolean));
    return uniquePhones.size;
  }, [prospects]);

  const limit = isPro ? PRO_PROSPECT_LIMIT : FREE_PROSPECT_LIMIT;
  const remaining = Math.max(0, limit - uniqueCount);
  const isAtLimit = uniqueCount >= limit;
  const isNearLimit = !isPro && uniqueCount >= 95;

  // Check if we can add N new prospects
  const canAdd = (count: number = 1) => {
    return uniqueCount + count <= limit;
  };

  // Calculate how many we can still add
  const getAvailableSlots = () => remaining;

  return {
    uniqueCount,
    limit,
    remaining,
    isAtLimit,
    isNearLimit,
    isPro,
    canAdd,
    getAvailableSlots,
  };
}
