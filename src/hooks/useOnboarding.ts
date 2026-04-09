import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

export function useOnboarding() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(true);
  const [isSkipped, setIsSkipped] = useState(false);

  // Load from profile
  useEffect(() => {
    if (!profile || !user) return;
    const dbStep = profile.onboarding_step ?? 0;
    const completed = !!profile.onboarding_completed;
    const skipped = !!profile.onboarding_skipped;
    console.log('[Onboarding] loaded from DB:', { dbStep, completed, skipped });
    setCurrentStep(dbStep);
    setIsCompleted(completed);
    setIsSkipped(skipped);
  }, [profile, user]);

  const isOnboarding = !isCompleted && !isSkipped && currentStep >= 1 && currentStep <= 11;
  const showWelcome = !isCompleted && !isSkipped && currentStep === 0;

  const saveStep = useCallback(async (step: number, extras?: Record<string, unknown>) => {
    if (!user) return;
    const updateData: Record<string, unknown> = { onboarding_step: step, ...extras };
    console.log('[Onboarding] saving step:', updateData);
    const { error } = await supabase
      .from('profiles')
      .update(updateData as any)
      .eq('user_id', user.id);
    if (error) console.error('[Onboarding] save error:', error);
  }, [user]);

  const advanceStep = useCallback(async () => {
    const next = currentStep + 1;
    console.log('[Onboarding] advancing to step:', next);
    if (next > 11) {
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
      // Try to run setup RPC but don't block on failure
      if (user) {
        try {
          await supabase.rpc('setup_new_user_onboarding' as any, { p_user_id: user.id });
        } catch (e) {
          console.warn('[Onboarding] RPC setup_new_user_onboarding failed (non-fatal):', e);
        }
      }
      setCurrentStep(1);
      setIsCompleted(false);
      setIsSkipped(false);
      await saveStep(1, { onboarding_completed: false, onboarding_skipped: false });
      console.log('[Onboarding] tour started, step=1');
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

  const requiredTab = useCallback((step: number): string | null => {
    switch (step) {
      case 1: case 2: case 3: case 4: return '/dashboard';
      case 5: return '/dashboard'; // user is on dashboard, target is follow-up nav
      case 6: case 7: return '/listup';
      case 8: return '/listup'; // user is on listup, target is trackup nav
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
    goToStep: async (step: number) => { setCurrentStep(step); await saveStep(step); },
    advanceStep,
    skipStep,
    completeOnboarding,
    skipAllOnboarding,
    requiredTab,
  };
}
