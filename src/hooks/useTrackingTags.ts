import { useState, useEffect, useCallback } from 'react';
import { useProfile } from '@/hooks/useProfile';

interface TrackingTags {
  callingTrackingTags: string[];
  stageTrackingTags: string[];
  loading: boolean;
}

export function useTrackingTags(): TrackingTags {
  const { profile, loading: profileLoading, getLeaderStageConfig } = useProfile();
  const [callingTrackingTags, setCallingTrackingTags] = useState<string[]>([]);
  const [stageTrackingTags, setStageTrackingTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrackingTags = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // If user uses leader's tracking tags, fetch from leader
      if (profile.use_leader_stages && profile.leaders_id_of_my_leader) {
        const leaderConfig = await getLeaderStageConfig(profile.leaders_id_of_my_leader);
        if (leaderConfig) {
          setCallingTrackingTags(leaderConfig.response_labels || []);
          setStageTrackingTags(leaderConfig.stage_labels || []);
        } else {
          // Leader not found, fallback to user's own tags
          setCallingTrackingTags(profile.response_labels || []);
          setStageTrackingTags(profile.stage_labels || []);
        }
      } else {
        // Use user's own tracking tags
        setCallingTrackingTags(profile.response_labels || []);
        setStageTrackingTags(profile.stage_labels || []);
      }
    } catch (error) {
      console.error('Error fetching tracking tags:', error);
      // Fallback to user's own tags on error
      setCallingTrackingTags(profile.response_labels || []);
      setStageTrackingTags(profile.stage_labels || []);
    } finally {
      setLoading(false);
    }
  }, [profile, getLeaderStageConfig]);

  useEffect(() => {
    if (!profileLoading) {
      fetchTrackingTags();
    }
  }, [profileLoading, fetchTrackingTags]);

  return {
    callingTrackingTags,
    stageTrackingTags,
    loading: loading || profileLoading,
  };
}
