import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addDays, differenceInDays, differenceInHours } from 'date-fns';
import { useProfile } from '@/hooks/useProfile';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';

// Fetch trial banner tab configuration
async function fetchTrialBannerTabs(): Promise<string[]> {
  const { data, error } = await supabase
    .from('admin_config_text')
    .select('config_value, is_enabled')
    .eq('config_key', 'trial_banner_tabs')
    .maybeSingle();
  
  if (error || !data || !data.is_enabled) {
    return ['dashboard', 'profile', 'listup']; // Default tabs
  }
  
  return data.config_value.split(',').map((t: string) => t.trim().toLowerCase());
}

/**
 * Hook to manage time-based free trial status.
 * Reads trial configuration from admin config and calculates trial status
 * based on user's trial_start_date (or created_at as fallback).
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

  // Fetch which tabs should show the trial banner
  const { data: allowedTabs = ['dashboard', 'profile', 'listup'] } = useQuery({
    queryKey: ['trial-banner-tabs'],
    queryFn: fetchTrialBannerTabs,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    // Check if trial is enabled in admin config
    // Trial is enabled if free_trial_days exists and is > 0
    const trialDays = config.limits.free_trial_days ?? 0;
    const trialEnabled = trialDays > 0;
    
    // Trial Only Mode is enabled when the key exists in config.limits
    // The get_app_config RPC only returns keys where is_enabled = true
    // So we check for presence of the key (meaning toggle is ON in admin)
    const trialOnlyMode = 'trial_only_mode' in config.limits;

    // Get user's trial start date - use trial_start_date if set, otherwise fall back to created_at
    // This allows admin to reset trials for existing users
    const rawProfile = profile as any; // Access trial_start_date which may not be in types yet
    const trialStartDate = rawProfile?.trial_start_date 
      ? new Date(rawProfile.trial_start_date)
      : profile?.created_at 
        ? new Date(profile.created_at) 
        : null;
    
    // Calculate trial end date
    const trialEndDate = trialStartDate && trialDays > 0
      ? addDays(trialStartDate, trialDays)
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
      
      // Which tabs should show the trial banner
      allowedTabs,
      
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
  }, [profile, config.limits, isPaid, profileLoading, configLoading, allowedTabs]);
}
