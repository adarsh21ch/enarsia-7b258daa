import { useMemo, useCallback } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/** Default free tier limit - overridden by feature registry */
export const FREE_LIFETIME_LEAD_LIMIT = 200;
/** Default warning threshold - overridden by admin config */
export const LEAD_WARNING_THRESHOLD = 190;

/**
 * Hook to check lifetime lead limits for free users.
 * Now reads limits from the Feature Registry via useFeatureAccess.
 */
export function useLifetimeLeadLimit() {
  const { user } = useAuth();
  const { profile, loading: profileLoading, refetch: refetchProfile } = useProfile();
  const { canAccess, limit, isLoading: featureLoading } = useFeatureAccess('total_lead_limit');
  const { config, loading: configLoading } = useAdminConfig();

  const totalLeadsAdded = profile?.total_leads_added ?? 0;
  const isLoading = profileLoading || featureLoading || configLoading;

  // Check if the limit is actually enabled in admin config
  const isLimitEnabled = config.limits_enabled?.free_total_leads !== false;

  // Get limit from feature registry (null = unlimited for paid/trial users)
  // If admin disabled the limit, treat as unlimited regardless
  const freeLimit = !isLimitEnabled ? Infinity : (limit ?? Infinity);
  const warningThreshold = config.limits.warning_threshold_3 ?? LEAD_WARNING_THRESHOLD;
  const isPaid = limit === null; // null limit means unlimited (paid/trial)

  const limitInfo = useMemo(() => {
    // Unlimited users (paid/trial)
    if (freeLimit === Infinity) {
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

    // Free users have lifetime limit from feature registry
    const isAtLimit = totalLeadsAdded >= freeLimit;
    const isNearLimit = totalLeadsAdded >= warningThreshold;
    const remaining = Math.max(0, freeLimit - totalLeadsAdded);
    const percentUsed = Math.min(100, (totalLeadsAdded / freeLimit) * 100);

    return {
      isAtLimit,
      isNearLimit,
      canAddLead: !isAtLimit,
      canAddLeads: (count: number) => totalLeadsAdded + count <= freeLimit,
      lifetimeCount: totalLeadsAdded,
      limit: freeLimit,
      remaining,
      percentUsed,
      showWarning: isNearLimit && !isPaid,
    };
  }, [totalLeadsAdded, freeLimit, warningThreshold, isPaid]);

  /**
   * Increment the lifetime lead counter after adding leads.
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
      
      refetchProfile?.();
      return data;
    } catch (err) {
      console.error('Failed to increment lead count:', err);
      return null;
    }
  }, [user, refetchProfile]);

  return {
    ...limitInfo,
    plan: isPaid ? 'pro' : 'free',
    isPaid,
    isLoading,
    incrementLeadCount,
    configuredLimit: typeof freeLimit === 'number' && freeLimit !== Infinity ? freeLimit : FREE_LIFETIME_LEAD_LIMIT,
    configuredWarningThreshold: warningThreshold,
  };
}
