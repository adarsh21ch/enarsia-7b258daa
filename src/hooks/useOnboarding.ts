import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

export function useOnboarding() {
  const { user } = useAuth();
  const { profile, refetch } = useProfile();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(true); // default true = no overlay
  const [isSkipped, setIsSkipped] = useState(false);

  // Load from profile
  useEffect(() => {
    if (!profile || !user) return;
    const dbStep = profile.onboarding_step ?? 0;
    const completed = !!(profile as any).onboarding_completed;
    const skipped = !!(profile as any).onboarding_skipped;
    setCurrentStep(dbStep);
    setIsCompleted(completed);
    setIsSkipped(skipped);
  }, [profile, user]);

  const isOnboarding = !isCompleted && !isSkipped && currentStep >= 1 && currentStep <= 11;
  const showWelcome = !isCompleted && !isSkipped && currentStep === 0;

  const saveStep = useCallback(async (step: number, extras?: Record<string, any>) => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ onboarding_step: step, ...extras } as any)
      .eq('user_id', user.id);
  }, [user]);

  const goToStep = useCallback(async (step: number) => {
    setCurrentStep(step);
    await saveStep(step);
  }, [saveStep]);

  const advanceStep = useCallback(async () => {
    const next = currentStep + 1;
    if (next > 11) {
      // Complete
      setCurrentStep(12);
      setIsCompleted(true);
      await saveStep(12, { onboarding_completed: true });
    } else {
      setCurrentStep(next);
      await saveStep(next);
    }
  }, [currentStep, saveStep]);

  const skipStep = useCallback(async () => {
    await advanceStep();
  }, [advanceStep]);

  const completeOnboarding = useCallback(async () => {
    setCurrentStep(12);
    setIsCompleted(true);
    await saveStep(12, { onboarding_completed: true });
  }, [saveStep]);

  const skipAllOnboarding = useCallback(async () => {
    setIsSkipped(true);
    setIsCompleted(true);
    await saveStep(12, { onboarding_completed: true, onboarding_skipped: true });
  }, [saveStep]);

  const startTour = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        await supabase.rpc('setup_new_user_onboarding' as any, { p_user_id: user.id });
      }
      setCurrentStep(1);
      setIsCompleted(false);
      setIsSkipped(false);
      await saveStep(1, { onboarding_completed: false, onboarding_skipped: false });
    } finally {
      setLoading(false);
    }
  }, [user, saveStep]);

  const restartTour = useCallback(async () => {
    setCurrentStep(1);
    setIsCompleted(false);
    setIsSkipped(false);
    await saveStep(1, { onboarding_completed: false, onboarding_skipped: false });
  }, [saveStep]);

  // Which tab path is required for each step
  const requiredTab = useCallback((step: number): string | null => {
    switch (step) {
      case 1: case 2: case 3: case 4: return '/dashboard';
      case 5: return '/listup'; // target is follow-up tab in nav
      case 6: case 7: return '/listup';
      case 8: return '/tracking'; // target is trackup tab in nav
      case 9: return '/tracking';
      case 10: case 11: return '/dashboard';
      default: return null;
    }
  }, []);

  return {
    currentStep,
    isOnboarding,
    isCompleted,
    isSkipped,
    showWelcome,
    loading,
    startTour,
    restartTour,
    goToStep,
    advanceStep,
    skipStep,
    completeOnboarding,
    skipAllOnboarding,
    requiredTab,
  };
}
