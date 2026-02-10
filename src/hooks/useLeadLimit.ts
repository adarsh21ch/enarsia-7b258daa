import { useMemo } from 'react';
import { useGlobalProspects } from '@/contexts/ProspectsContext';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useAdminConfig } from '@/hooks/useAdminConfig';

/**
 * Hook to check if user has reached the free lead limit.
 * Now reads limits from the Feature Registry via useFeatureAccess.
 */
export function useLeadLimit() {
  const { prospects } = useGlobalProspects();
  const { canAccess, limit, isLoading } = useFeatureAccess('total_lead_limit');
  const { config } = useAdminConfig();

  const totalLeads = prospects?.length ?? 0;
  
  // Check if the limit is actually enabled in admin config
  const isLimitEnabled = config.limits_enabled?.free_total_leads !== false;
  const freeLeadLimit = !isLimitEnabled ? Infinity : (limit ?? Infinity);

  const limitInfo = useMemo(() => {
    // If no limit (paid/unlimited or admin disabled), no restriction
    if (freeLeadLimit === Infinity || limit === null) {
      return {
        isAtLimit: false,
        canAddLead: true,
        currentCount: totalLeads,
        limit: Infinity,
        remaining: Infinity,
        percentUsed: 0,
      };
    }

    // Free users have dynamic lead limit from feature registry
    const isAtLimit = totalLeads >= freeLeadLimit;
    const remaining = Math.max(0, freeLeadLimit - totalLeads);
    const percentUsed = Math.min(100, (totalLeads / freeLeadLimit) * 100);

    return {
      isAtLimit,
      canAddLead: !isAtLimit,
      currentCount: totalLeads,
      limit: freeLeadLimit,
      remaining,
      percentUsed,
    };
  }, [totalLeads, freeLeadLimit, limit]);

  return {
    ...limitInfo,
    isPaid: limit === null,
    loading: isLoading,
  };
}
