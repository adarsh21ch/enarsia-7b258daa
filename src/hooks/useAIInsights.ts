import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type MetricType =
  | 'leads_added'
  | 'calls_made'
  | 'videos_sent'
  | 'follow_ups'
  | 'positive_prospects'
  | 'funnel_stages'
  | 'team_updates'
  | 'team_level_counts';

export const METRIC_LABELS: Record<MetricType, string> = {
  leads_added: 'Leads Added',
  calls_made: 'Calls Made',
  videos_sent: 'Videos Sent',
  follow_ups: 'Follow-ups',
  positive_prospects: 'Positive Prospects',
  funnel_stages: 'Funnel Stages',
  team_updates: 'Team Updates',
  team_level_counts: 'Team Level Counts',
};

export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface TrackerConfig {
  id: string;
  user_id: string;
  metric_type: MetricType;
  frequency: Frequency;
  notify_hour: number;
  is_active: boolean;
  last_sent_at: string | null;
  created_at: string;
}

export interface InsightPreferences {
  id: string;
  user_id: string;
  daily_snapshot: boolean;
  ai_alerts: boolean;
  coaching_insights: boolean;
  weekly_team_summary: boolean;
  snapshot_hour: number;
  created_at: string;
}

export function useAIInsights() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const trackersQuery = useQuery({
    queryKey: ['ai-trackers', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('ai_tracker_configs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as TrackerConfig[];
    },
    enabled: !!userId,
  });

  const prefsQuery = useQuery({
    queryKey: ['ai-prefs', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('ai_insight_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as InsightPreferences | null;
    },
    enabled: !!userId,
  });

  const addTracker = useMutation({
    mutationFn: async (tracker: { metric_type: MetricType; frequency: Frequency; notify_hour: number }) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase.from('ai_tracker_configs').insert({
        user_id: userId,
        ...tracker,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-trackers'] });
      toast.success('Tracker added');
    },
    onError: () => toast.error('Failed to add tracker'),
  });

  const updateTracker = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrackerConfig> & { id: string }) => {
      const { error } = await supabase.from('ai_tracker_configs').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-trackers'] }),
  });

  const deleteTracker = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_tracker_configs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-trackers'] });
      toast.success('Tracker removed');
    },
  });

  const updatePreferences = useMutation({
    mutationFn: async (prefs: Partial<InsightPreferences>) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('ai_insight_preferences')
        .upsert({ user_id: userId, ...prefs }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-prefs'] });
      toast.success('Preferences updated');
    },
    onError: () => toast.error('Failed to update preferences'),
  });

  return {
    trackers: trackersQuery.data || [],
    trackersLoading: trackersQuery.isLoading,
    preferences: prefsQuery.data,
    prefsLoading: prefsQuery.isLoading,
    addTracker,
    updateTracker,
    deleteTracker,
    updatePreferences,
  };
}
