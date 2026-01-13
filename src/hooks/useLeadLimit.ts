import { useMemo } from 'react';
import { useGlobalProspects } from '@/contexts/ProspectsContext';
import { useSubscription } from '@/hooks/useSubscription';
import { FREE_LEAD_LIMIT } from '@/hooks/usePaymentLinks';

/**
 * Hook to check if user has reached the free lead limit.
 * Returns information about lead limits and whether user can add more leads.
 */
export function useLeadLimit() {
  const { prospects } = useGlobalProspects();
  const { isPaid, plan } = useSubscription();

  const totalLeads = prospects?.length ?? 0;
  
  const limitInfo = useMemo(() => {
    // Paid users have no limit
    if (isPaid) {
      return {
        isAtLimit: false,
        canAddLead: true,
        currentCount: totalLeads,
        limit: Infinity,
        remaining: Infinity,
        percentUsed: 0,
      };
    }

    // Free users have 500 lead limit
    const isAtLimit = totalLeads >= FREE_LEAD_LIMIT;
    const remaining = Math.max(0, FREE_LEAD_LIMIT - totalLeads);
    const percentUsed = Math.min(100, (totalLeads / FREE_LEAD_LIMIT) * 100);

    return {
      isAtLimit,
      canAddLead: !isAtLimit,
      currentCount: totalLeads,
      limit: FREE_LEAD_LIMIT,
      remaining,
      percentUsed,
    };
  }, [totalLeads, isPaid]);

  return {
    ...limitInfo,
    plan,
    isPaid,
  };
}
