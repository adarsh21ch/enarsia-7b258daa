import { useState, useEffect } from 'react';
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

  // Memoize stable values for dependencies
  const userId = profile?.user_id;
  const useLeaderStages = profile?.use_leader_stages;
  const leadersId = profile?.leaders_id_of_my_leader;
  const responseLabels = profile?.response_labels;
  const stageLabels = profile?.stage_labels;

  useEffect(() => {
    if (profileLoading) return;
    
    if (!profile) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchTags = async () => {
      setLoading(true);

      try {
        // If user uses leader's tracking tags, fetch from leader
        if (useLeaderStages && leadersId) {
          const leaderConfig = await getLeaderStageConfig(leadersId);
          if (cancelled) return;
          if (leaderConfig) {
            setCallingTrackingTags(extractTagNames(leaderConfig.response_labels));
            setStageTrackingTags(extractTagNames(leaderConfig.stage_labels));
          } else {
            // Leader not found, fallback to user's own tags
            setCallingTrackingTags(extractTagNames(responseLabels));
            setStageTrackingTags(extractTagNames(stageLabels));
          }
        } else {
          // Use user's own tracking tags
          setCallingTrackingTags(extractTagNames(responseLabels));
          setStageTrackingTags(extractTagNames(stageLabels));
        }
      } catch (error) {
        if (cancelled) return;
        // Fallback to user's own tags on error silently
        setCallingTrackingTags(extractTagNames(responseLabels));
        setStageTrackingTags(extractTagNames(stageLabels));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchTags();

    return () => {
      cancelled = true;
    };
  }, [profileLoading, userId, useLeaderStages, leadersId, responseLabels, stageLabels, getLeaderStageConfig]);


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
