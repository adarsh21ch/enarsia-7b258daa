import { useState, useCallback, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { differenceInCalendarDays, startOfDay, format } from 'date-fns';

interface UserStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  grace_used: number;
  updated_at: string;
}

export function useStreak() {
  const { user } = useAuth();
  const { config } = useAdminConfig();
  const queryClient = useQueryClient();
  const recordingRef = useRef(false);

  // Check if streak feature is enabled via admin config
  const streakEnabled = 'streak_enabled' in config.limits;
  const graceDays = config.limits.streak_grace_days ?? 1;

  // Fetch allowed actions from admin_config_text
  const { data: activeActions } = useQuery({
    queryKey: ['streak-active-actions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_config_text')
        .select('config_value, is_enabled')
        .eq('config_key', 'streak_active_actions')
        .maybeSingle();
      if (error || !data || !data.is_enabled) return ['manual_add', 'import', 'call', 'tracking_update'];
      return data.config_value.split(',').map((s: string) => s.trim());
    },
    staleTime: 30000,
  });

  // Fetch user's streak row
  const { data: streak, isLoading } = useQuery({
    queryKey: ['user-streak', user?.id],
    queryFn: async (): Promise<UserStreak | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_streaks' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) {
        console.error('Error fetching streak:', error);
        return null;
      }
      return data as unknown as UserStreak | null;
    },
    enabled: !!user && streakEnabled,
    staleTime: 60000,
  });

  const currentStreak = streak?.current_streak ?? 0;
  const longestStreak = streak?.longest_streak ?? 0;
  const lastActiveDate = streak?.last_active_date ?? null;
  const graceUsed = streak?.grace_used ?? 0;

  // Is user in grace period right now?
  const isInGracePeriod = useMemo(() => {
    if (!lastActiveDate) return false;
    const today = startOfDay(new Date());
    const lastActive = startOfDay(new Date(lastActiveDate));
    const gap = differenceInCalendarDays(today, lastActive);
    return gap > 1 && gap <= 1 + graceDays;
  }, [lastActiveDate, graceDays]);

  // Record activity - idempotent per day per source
  const recordActivity = useCallback(async (source: string) => {
    if (!user || !streakEnabled || recordingRef.current) return;
    if (activeActions && !activeActions.includes(source)) return;

    recordingRef.current = true;
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // Upsert daily activity
      await supabase
        .from('user_daily_activity' as any)
        .upsert(
          {
            user_id: user.id,
            activity_date: today,
            has_activity: true,
            activity_sources: [source],
          },
          { onConflict: 'user_id,activity_date' }
        );

      // Calculate new streak values
      const todayDate = startOfDay(new Date());
      let newStreak = currentStreak;
      let newGraceUsed = graceUsed;

      if (lastActiveDate) {
        const lastActive = startOfDay(new Date(lastActiveDate));
        const gap = differenceInCalendarDays(todayDate, lastActive);

        if (gap === 0) {
          // Already active today, no streak change needed
          return;
        } else if (gap === 1) {
          newStreak = currentStreak + 1;
          newGraceUsed = 0;
        } else if (gap <= 1 + graceDays) {
          newStreak = currentStreak + 1;
          newGraceUsed = gap - 1;
        } else {
          newStreak = 1;
          newGraceUsed = 0;
        }
      } else {
        // First ever activity
        newStreak = 1;
        newGraceUsed = 0;
      }

      const newLongest = Math.max(longestStreak, newStreak);

      // Upsert streak row
      await supabase
        .from('user_streaks' as any)
        .upsert(
          {
            user_id: user.id,
            current_streak: newStreak,
            longest_streak: newLongest,
            last_active_date: today,
            grace_used: newGraceUsed,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      // Invalidate to refetch
      queryClient.invalidateQueries({ queryKey: ['user-streak', user.id] });
    } catch (err) {
      console.error('Failed to record streak activity:', err);
    } finally {
      recordingRef.current = false;
    }
  }, [user, streakEnabled, activeActions, currentStreak, longestStreak, lastActiveDate, graceUsed, graceDays, queryClient]);

  return {
    currentStreak,
    longestStreak,
    lastActiveDate,
    graceUsed,
    isInGracePeriod,
    streakEnabled,
    loading: isLoading,
    recordActivity,
  };
}
