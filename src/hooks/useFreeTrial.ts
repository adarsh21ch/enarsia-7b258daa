import { useMemo } from 'react';
import { addDays, differenceInDays, differenceInHours } from 'date-fns';
import { useProfile } from '@/hooks/useProfile';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { useSubscription } from '@/hooks/useSubscription';

/**
 * Hook to manage time-based free trial status.
 * Reads trial configuration from admin config and calculates trial status
 * based on user's signup date (profiles.created_at).
 * 
 * IMPORTANT: trialOnlyMode is determined by the presence of the key
 * in config.limits (which means is_enabled = true in the database).
 * The get_app_config RPC only returns limits where is_enabled = true,
 * so if the key exists, the toggle is ON.
 */
export function useFreeTrial() {
  const { profile, loading: profileLoading } = useProfile();
  const { config, loading: configLoading } = useAdminConfig();
  const { isPaid } = useSubscription();

  return useMemo(() => {
    // Check if trial is enabled in admin config
    // Trial is enabled if free_trial_days exists and is > 0
    const trialDays = config.limits.free_trial_days ?? 0;
    const trialEnabled = trialDays > 0;
    
    // Trial Only Mode is enabled when the key exists in config.limits
    // The get_app_config RPC only returns keys where is_enabled = true
    // So we check for presence of the key (meaning toggle is ON in admin)
    const trialOnlyMode = 'trial_only_mode' in config.limits;

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
