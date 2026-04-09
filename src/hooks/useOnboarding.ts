import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

export type OnboardingStep = number; // 0=not started, 1-11=active, 12=completed

export function useOnboarding() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Load step from profile
  useEffect(() => {
    if (!profile || !user) return;
    const dbStep = profile.onboarding_step ?? 0;
    const localStep = localStorage.getItem('nevorai_onboarding_step');
    const step = localStep ? Math.max(parseInt(localStep), dbStep) : dbStep;
    setCurrentStep(step);
  }, [profile, user]);

  const isActive = currentStep >= 0 && currentStep < 12;
  const isOnboarding = currentStep >= 1 && currentStep <= 11;
  const isCompleted = currentStep >= 12;

  const goToStep = useCallback(async (step: number) => {
    setCurrentStep(step);
    localStorage.setItem('nevorai_onboarding_step', String(step));
    if (user) {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_step: step,
          ...(step >= 12 ? { onboarding_completed: true } : {})
        } as any)
        .eq('user_id', user.id);
    }
  }, [user]);

  const advanceStep = useCallback(async () => {
    const next = currentStep + 1;
    await goToStep(next);
  }, [currentStep, goToStep]);

  const skipStep = useCallback(async () => {
    await advanceStep();
  }, [advanceStep]);

  const completeOnboarding = useCallback(async () => {
    await goToStep(12);
  }, [goToStep]);

  const startTour = useCallback(async () => {
    setLoading(true);
    try {
      // Setup demo data
      if (user) {
        await supabase.rpc('setup_new_user_onboarding' as any, { p_user_id: user.id });
      }
      await goToStep(1);
    } finally {
      setLoading(false);
    }
  }, [user, goToStep]);

  const cleanupDemoData = useCallback(async () => {
    if (!user) return;
    try {
      await supabase.rpc('cleanup_onboarding_demo_data' as any, { p_user_id: user.id });
    } catch (err) {
      console.error('Failed to cleanup demo data:', err);
    }
  }, [user]);

  // Which tab is required for each step
  const requiredTab = useCallback((step: number): string | null => {
    switch (step) {
      case 1: case 2: case 3: case 4: return '/dashboard';
      case 5: return '/listup';
      case 6: case 7: return '/listup';
      case 8: return '/tracking';
      case 9: return '/tracking';
      case 10: case 11: return '/dashboard';
      default: return null;
    }
  }, []);

  return {
    currentStep,
    isActive,
    isOnboarding,
    isCompleted,
    loading,
    startTour,
    goToStep,
    advanceStep,
    skipStep,
    completeOnboarding,
    cleanupDemoData,
    requiredTab,
  };
}
