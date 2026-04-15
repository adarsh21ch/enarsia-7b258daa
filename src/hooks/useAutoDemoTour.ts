import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

export type DemoTourState = 'loading' | 'welcome' | 'seeding' | 'touring' | 'completing' | 'idle';

const DEMO_LEADS = [
  { name: 'Rahul Sharma', phone: '0000000001', address: 'Mumbai', action_taken: 'Enrolment' },
  { name: 'Priya Mehta', phone: '0000000002', address: 'Delhi', action_taken: 'Not Interested' },
  { name: 'Amit Gupta', phone: '0000000003', address: 'Bangalore', action_taken: 'Busy' },
  { name: 'Sunita Yadav', phone: '0000000004', address: 'Pune', action_taken: 'Follow Up' },
  { name: 'Vikram Singh', phone: '0000000005', address: 'Chennai', action_taken: 'Callback' },
];

const DEMO_RESPONSE_LABELS = ['Enrolment', 'Not Interested', 'Busy', 'Follow Up', 'Callback'];
const DEMO_STAGE_LABELS = ['New Lead', 'Interested', 'Demo Done', 'Enrolled'];

export function useAutoDemoTour() {
  const { user } = useAuth();
  const { profile, refetch: refetchProfile } = useProfile();
  const [tourState, setTourState] = useState<DemoTourState>('loading');
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps] = useState(12);
  const initRef = useRef(false);
  
  // Store original labels to restore on cleanup
  const originalLabelsRef = useRef<{ response: string[] | null; stage: string[] | null }>({ response: null, stage: null });

  // Determine initial state from profile
  useEffect(() => {
    if (!user || !profile) {
      setTourState('loading');
      return;
    }
    if (initRef.current) return;
    initRef.current = true;

    const step = profile.onboarding_step ?? 0;
    const completed = !!profile.onboarding_completed;
    const skipped = !!profile.onboarding_skipped;

    // Guard: only show to brand new users
    if (completed || skipped || step > 0) {
      setTourState('idle');
      return;
    }

    // New user: show welcome
    setTourState('welcome');
  }, [user, profile]);

  // Seed demo data
  const seedDemoData = useCallback(async () => {
    if (!user) return false;
    setTourState('seeding');

    try {
      // Store original labels
      originalLabelsRef.current = {
        response: profile?.response_labels as string[] || [],
        stage: profile?.stage_labels as string[] || [],
      };

      // 1. Create demo sheet
      const { data: sheet, error: sheetErr } = await supabase
        .from('sheets')
        .insert({ user_id: user.id, name: 'Demo Sheet', is_demo: true })
        .select('id')
        .single();

      if (sheetErr) throw sheetErr;

      // 2. Create demo leads
      const leadsToInsert = DEMO_LEADS.map(lead => ({
        ...lead,
        user_id: user.id,
        sheet_id: sheet.id,
        is_demo: true,
      }));

      const { error: leadsErr } = await supabase
        .from('prospects')
        .insert(leadsToInsert as any);

      if (leadsErr) throw leadsErr;

      // 3. Set temporary response and stage labels
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          response_labels: DEMO_RESPONSE_LABELS,
          stage_labels: DEMO_STAGE_LABELS,
          onboarding_step: 1,
        } as any)
        .eq('user_id', user.id);

      if (profileErr) throw profileErr;

      return true;
    } catch (e) {
      console.error('[AutoDemoTour] Failed to seed demo data:', e);
      return false;
    }
  }, [user, profile]);

  // Start the tour
  const startTour = useCallback(async () => {
    const success = await seedDemoData();
    if (success) {
      setCurrentStep(1);
      setTourState('touring');
      // Refetch profile so the app picks up new labels
      await refetchProfile?.();
    } else {
      // If seeding fails, skip to idle
      await skipTour();
    }
  }, [seedDemoData, refetchProfile]);

  // Skip the tour entirely
  const skipTour = useCallback(async () => {
    if (!user) return;
    setTourState('idle');
    
    // Clean up any demo data that may have been created
    await cleanupDemoData();

    await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        onboarding_skipped: true,
        onboarding_step: 12,
      } as any)
      .eq('user_id', user.id);

    await refetchProfile?.();
  }, [user, refetchProfile]);

  // Advance to next step
  const advanceStep = useCallback(() => {
    setCurrentStep(prev => {
      const next = prev + 1;
      if (next > totalSteps) {
        setTourState('completing');
        return prev;
      }
      return next;
    });
  }, [totalSteps]);

  // Clean up demo data
  const cleanupDemoData = useCallback(async () => {
    if (!user) return;

    try {
      // Delete demo prospects
      await supabase
        .from('prospects')
        .delete()
        .eq('user_id', user.id)
        .eq('is_demo', true);

      // Delete demo sheets
      await supabase
        .from('sheets')
        .delete()
        .eq('user_id', user.id)
        .eq('is_demo', true);

      // Restore original labels (or empty arrays)
      const orig = originalLabelsRef.current;
      await supabase
        .from('profiles')
        .update({
          response_labels: orig.response && orig.response.length > 0 ? orig.response : [],
          stage_labels: orig.stage && orig.stage.length > 0 ? orig.stage : [],
        } as any)
        .eq('user_id', user.id);
    } catch (e) {
      console.error('[AutoDemoTour] Cleanup error:', e);
    }
  }, [user]);

  // Complete the tour
  const completeTour = useCallback(async () => {
    if (!user) return;

    await cleanupDemoData();

    await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        onboarding_skipped: false,
        onboarding_step: 12,
      } as any)
      .eq('user_id', user.id);

    setTourState('idle');
    await refetchProfile?.();
  }, [user, cleanupDemoData, refetchProfile]);

  return {
    tourState,
    currentStep,
    totalSteps,
    startTour,
    skipTour,
    advanceStep,
    completeTour,
    setTourState,
  };
}
