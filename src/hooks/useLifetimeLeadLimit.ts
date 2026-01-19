import { useMemo, useCallback } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/** Free tier limit - lifetime leads added */
export const FREE_LIFETIME_LEAD_LIMIT = 1000;
/** Warning threshold - show upgrade prompt */
export const LEAD_WARNING_THRESHOLD = 950;

/**
 * Hook to check lifetime lead limits for free users.
 * Uses monotonic counter (total_leads_added) that never decreases.
 */
export function useLifetimeLeadLimit() {
  const { user } = useAuth();
  const { profile, refetch: refetchProfile } = useProfile();
  const { isPaid, plan } = useSubscription();

  const totalLeadsAdded = profile?.total_leads_added ?? 0;

  const limitInfo = useMemo(() => {
    // Paid users have no limit
    if (isPaid) {
      return {
        isAtLimit: false,
        isNearLimit: false,
        canAddLead: true,
        canAddLeads: (count: number) => true,
        lifetimeCount: totalLeadsAdded,
        limit: Infinity,
        remaining: Infinity,
        percentUsed: 0,
        showWarning: false,
      };
    }

    // Free users have lifetime limit
    const isAtLimit = totalLeadsAdded >= FREE_LIFETIME_LEAD_LIMIT;
    const isNearLimit = totalLeadsAdded >= LEAD_WARNING_THRESHOLD;
    const remaining = Math.max(0, FREE_LIFETIME_LEAD_LIMIT - totalLeadsAdded);
    const percentUsed = Math.min(100, (totalLeadsAdded / FREE_LIFETIME_LEAD_LIMIT) * 100);

    return {
      isAtLimit,
      isNearLimit,
      canAddLead: !isAtLimit,
      canAddLeads: (count: number) => totalLeadsAdded + count <= FREE_LIFETIME_LEAD_LIMIT,
      lifetimeCount: totalLeadsAdded,
      limit: FREE_LIFETIME_LEAD_LIMIT,
      remaining,
      percentUsed,
      showWarning: isNearLimit && !isPaid,
    };
  }, [totalLeadsAdded, isPaid]);

  /**
   * Increment the lifetime lead counter after adding leads.
   * This should be called after successfully adding leads.
   */
  const incrementLeadCount = useCallback(async (count: number = 1): Promise<number | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .rpc('increment_leads_added', { 
          user_uuid: user.id, 
          count 
        });
      
      if (error) {
        console.error('Error incrementing lead count:', error);
        return null;
      }
      
      // Refetch profile to update the local state
      refetchProfile?.();
      
      return data;
    } catch (err) {
      console.error('Failed to increment lead count:', err);
      return null;
    }
  }, [user, refetchProfile]);

  return {
    ...limitInfo,
    plan,
    isPaid,
    incrementLeadCount,
  };
}
