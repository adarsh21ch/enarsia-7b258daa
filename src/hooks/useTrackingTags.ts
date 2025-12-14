import { useState, useEffect, useCallback } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useCustomOptionsContext } from '@/contexts/CustomOptionsContext';

// Helper to extract tag names from any format (new JSON object or legacy string array)
const extractTagNames = (labels: any): string[] => {
  if (!labels) return [];
  
  // New JSON format: { tracking: [...], nonTracking: [...] }
  if (labels && typeof labels === 'object' && !Array.isArray(labels)) {
    const tracking = labels.tracking || [];
    return tracking.map((t: any) => typeof t === 'string' ? t : t.name).filter(Boolean);
  }
  
  // Legacy string array format: ["tag1", "tag2"]
  if (Array.isArray(labels)) {
    return labels.map((t: any) => typeof t === 'string' ? t : t.name).filter(Boolean);
  }
  
  return [];
};

interface TrackingTags {
  callingTrackingTags: string[];
  stageTrackingTags: string[];
  // Combined: tracking tags + custom tags for dropdown options
  callingAllOptions: string[];
  stageAllOptions: string[];
  loading: boolean;
}

export function useTrackingTags(): TrackingTags {
  const { profile, loading: profileLoading, getLeaderStageConfig } = useProfile();
  const { getCustomOptionsForType } = useCustomOptionsContext();
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
          setCallingTrackingTags(extractTagNames(leaderConfig.response_labels));
          setStageTrackingTags(extractTagNames(leaderConfig.stage_labels));
        } else {
          // Leader not found, fallback to user's own tags
          setCallingTrackingTags(extractTagNames(profile.response_labels));
          setStageTrackingTags(extractTagNames(profile.stage_labels));
        }
      } else {
        // Use user's own tracking tags
        setCallingTrackingTags(extractTagNames(profile.response_labels));
        setStageTrackingTags(extractTagNames(profile.stage_labels));
      }
    } catch (error) {
      // Fallback to user's own tags on error silently
      setCallingTrackingTags(extractTagNames(profile.response_labels));
      setStageTrackingTags(extractTagNames(profile.stage_labels));
    } finally {
      setLoading(false);
    }
  }, [profile?.user_id, profile?.use_leader_stages, profile?.leaders_id_of_my_leader, getLeaderStageConfig]);

  useEffect(() => {
    if (!profileLoading) {
      fetchTrackingTags();
    }
  }, [profileLoading, fetchTrackingTags]);

  // Get custom options for each type
  const customActionOptions = getCustomOptionsForType('action_taken').map(o => o.option_value);
  const customStageOptions = getCustomOptionsForType('funnel_stage').map(o => o.option_value);

  // Combine tracking tags (Default Tags) + custom options (Custom Tags), removing duplicates
  const callingAllOptions = [...callingTrackingTags];
  customActionOptions.forEach(opt => {
    if (!callingAllOptions.includes(opt)) {
      callingAllOptions.push(opt);
    }
  });

  const stageAllOptions = [...stageTrackingTags];
  customStageOptions.forEach(opt => {
    if (!stageAllOptions.includes(opt)) {
      stageAllOptions.push(opt);
    }
  });

  return {
    callingTrackingTags,
    stageTrackingTags,
    callingAllOptions,
    stageAllOptions,
    loading: loading || profileLoading,
  };
}
