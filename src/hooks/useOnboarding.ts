import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

export function useOnboarding() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  // Default to completed = true so existing users are NEVER affected
  const [isCompleted, setIsCompleted] = useState(true);
  const [isSkipped, setIsSkipped] = useState(false);
  const eligibilityChecked = useRef(false);

  // Load from profile + extra eligibility guard
  useEffect(() => {
    if (!profile || !user) return;
    
    const dbStep = profile.onboarding_step ?? 0;
    const completed = !!profile.onboarding_completed;
    const skipped = !!profile.onboarding_skipped;

    // If already completed or skipped in DB, respect that immediately
    if (completed || skipped) {
      setIsCompleted(true);
      setIsSkipped(skipped);
      setCurrentStep(dbStep);
      return;
    }

    // For users who haven't completed onboarding, check if they have existing data
    // This prevents old users (who existed before onboarding was added) from seeing it
    if (!eligibilityChecked.current) {
      eligibilityChecked.current = true;
      (async () => {
        try {
          const { count } = await supabase
            .from('prospects')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_demo', false)
            .limit(1);
          
          if (count && count > 0) {
            // User has real data → auto-complete onboarding silently
            setIsCompleted(true);
            setIsSkipped(true);
            await supabase
              .from('profiles')
              .update({ onboarding_completed: true, onboarding_skipped: true, onboarding_step: 12 } as any)
              .eq('user_id', user.id);
            return;
          }
        } catch {
          // If query fails, don't block — keep safe default (completed)
        }

        // Truly new user — allow onboarding
        setCurrentStep(dbStep);
        setIsCompleted(false);
        setIsSkipped(false);
      })();
    } else {
      // Already checked eligibility, just sync state
      setCurrentStep(dbStep);
      setIsCompleted(false);
      setIsSkipped(false);
    }
  }, [profile, user]);

  const isOnboarding = !isCompleted && !isSkipped && currentStep >= 1 && currentStep <= 11;
  const showWelcome = !isCompleted && !isSkipped && currentStep === 0;

  const saveStep = useCallback(async (step: number, extras?: Record<string, unknown>) => {
    if (!user) return;
    const updateData: Record<string, unknown> = { onboarding_step: step, ...extras };
    const { error } = await supabase
      .from('profiles')
      .update(updateData as any)
      .eq('user_id', user.id);
    if (error) console.error('[Onboarding] save error:', error);
  }, [user]);

  const advanceStep = useCallback(async () => {
    const next = currentStep + 1;
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
      setCurrentStep(1);
      setIsCompleted(false);
      setIsSkipped(false);
      await saveStep(1, { onboarding_completed: false, onboarding_skipped: false });
    } finally {
      setLoading(false);
    }
  }, [saveStep]);

  // Manual retake from Profile — resets to welcome screen (step 0)
  const retakeTour = useCallback(async () => {
    setCurrentStep(0);
    setIsCompleted(false);
    setIsSkipped(false);
    eligibilityChecked.current = true; // Skip eligibility re-check for retake
    await saveStep(0, { onboarding_completed: false, onboarding_skipped: false });
  }, [saveStep]);

  return {
    currentStep,
    isOnboarding,
    isCompleted,
    isSkipped,
    showWelcome,
    loading,
    startTour,
    retakeTour,
    goToStep: async (step: number) => { setCurrentStep(step); await saveStep(step); },
    advanceStep,
    skipStep,
    completeOnboarding,
    skipAllOnboarding,
  };
}
