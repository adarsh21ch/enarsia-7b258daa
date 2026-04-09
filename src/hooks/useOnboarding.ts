import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export function useOnboarding() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(0);
  const [isActive, setIsActive] = useState(false);
  const [demoSheetId, setDemoSheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Determine if onboarding should be active
  useEffect(() => {
    if (!profile || !user) return;

    if (profile.onboarding_completed) {
      setIsActive(false);
      return;
    }

    // Check 7-day auto-expire
    const startedAt = (profile as any).onboarding_started_at;
    if (startedAt) {
      const daysSince = (Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 7) {
        setIsActive(false);
        return;
      }
    }

    // Resume from localStorage first (faster), then DB
    const localStep = localStorage.getItem('nevorai_onboarding_step');
    const dbStep = profile.onboarding_step || 0;
    const resumeStep = localStep ? Math.max(parseInt(localStep), dbStep) : dbStep;

    if (resumeStep >= 11) {
      setIsActive(false);
      return;
    }

    setCurrentStep(resumeStep === 0 ? 0 : resumeStep as OnboardingStep);
    setIsActive(true);
  }, [profile, user]);

  // Find demo sheet ID
  useEffect(() => {
    if (!user || !isActive) return;
    supabase
      .from('sheets')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_demo', true)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setDemoSheetId(data.id);
      });
  }, [user, isActive]);

  const setupDemoData = useCallback(async () => {
    if (!user) return null;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc(
        'setup_new_user_onboarding' as any,
        { p_user_id: user.id }
      );
      if (error) {
        console.error('Error setting up demo data:', error);
        return null;
      }
      const result = data as any;
      if (result?.sheet_id) {
        setDemoSheetId(result.sheet_id);
      }
      return result;
    } catch (err) {
      console.error('Failed to setup demo data:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const goToStep = useCallback(async (step: OnboardingStep) => {
    setCurrentStep(step);
    localStorage.setItem('nevorai_onboarding_step', String(step));
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_step: step } as any)
        .eq('user_id', user.id);
    }
  }, [user]);

  const completeOnboarding = useCallback(async () => {
    setIsActive(false);
    setCurrentStep(11 as OnboardingStep);
    localStorage.setItem('nevorai_onboarding_step', '11');
    if (user) {
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_step: 11,
        } as any)
        .eq('user_id', user.id);
    }
  }, [user]);

  const skipOnboarding = useCallback(async () => {
    setIsActive(false);
    localStorage.setItem('nevorai_onboarding_step', '-1');
    if (user) {
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_step: -1,
        } as any)
        .eq('user_id', user.id);
    }
  }, [user]);

  const cleanupDemoData = useCallback(async () => {
    if (!user) return;
    try {
      await supabase.rpc('cleanup_onboarding_demo_data' as any, { p_user_id: user.id });
    } catch (err) {
      console.error('Failed to cleanup demo data:', err);
    }
  }, [user]);

  return {
    isActive,
    currentStep,
    demoSheetId,
    loading,
    setupDemoData,
    goToStep,
    completeOnboarding,
    skipOnboarding,
    cleanupDemoData,
    totalSteps: 11,
  };
}
