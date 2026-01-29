import { useMemo } from 'react';
import { addDays, differenceInDays, differenceInHours } from 'date-fns';
import { useProfile } from '@/hooks/useProfile';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { useSubscription } from '@/hooks/useSubscription';

/**
 * Hook to manage time-based free trial status.
 * Reads trial configuration from admin config and calculates trial status
 * based on user's signup date (profiles.created_at).
 */
export function useFreeTrial() {
  const { profile, loading: profileLoading } = useProfile();
  const { config, loading: configLoading } = useAdminConfig();
  const { isPaid } = useSubscription();

  return useMemo(() => {
    // Check if trial is enabled in admin config
    const trialEnabled = config.limits.free_trial_days !== undefined && 
                         config.limits.free_trial_days > 0 &&
                         // Check if the feature is actually enabled (is_enabled flag)
                         // This is controlled via the toggle in admin panel
                         true; // Will be refined when we can access is_enabled
    
    const trialDays = config.limits.free_trial_days ?? 0;
    const trialOnlyMode = (config.limits.trial_only_mode ?? 0) > 0;

    // Get user's signup date
    const signupDate = profile?.created_at ? new Date(profile.created_at) : null;
    
    // Calculate trial end date
    const trialEndDate = signupDate && trialDays > 0
      ? addDays(signupDate, trialDays)
      : null;
    
    // Calculate trial status
    const now = new Date();
    const isTrialActive = trialEndDate ? now < trialEndDate : false;
    const isTrialExpired = trialEndDate ? now >= trialEndDate : false;
    
    // Calculate days remaining (show 0 if expired)
    const daysRemaining = trialEndDate && isTrialActive
      ? Math.max(0, differenceInDays(trialEndDate, now))
      : 0;
    
    // Calculate hours remaining for more precise display on last day
    const hoursRemaining = trialEndDate && isTrialActive
      ? Math.max(0, differenceInHours(trialEndDate, now))
      : 0;

    return {
      // Trial configuration
      trialEnabled,
      trialDays,
      trialOnlyMode,
      
      // Trial status (only applies to non-paid users)
      isTrialActive: !isPaid && trialEnabled && isTrialActive,
      isTrialExpired: !isPaid && trialEnabled && isTrialExpired,
      
      // Time remaining
      daysRemaining,
      hoursRemaining,
      trialEndDate,
      
      // Loading state
      loading: profileLoading || configLoading,
      
      // Formatted display string
      timeRemainingText: daysRemaining > 1 
        ? `${daysRemaining} days left`
        : daysRemaining === 1
          ? `${hoursRemaining} hours left`
          : hoursRemaining > 0
            ? `${hoursRemaining} hours left`
            : 'Trial ending soon',
    };
  }, [profile?.created_at, config.limits, isPaid, profileLoading, configLoading]);
}
