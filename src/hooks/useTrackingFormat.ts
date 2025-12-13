import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

export interface TrackingTag {
  name: string;
  isFilter: boolean;
  isFinalTarget: boolean;
}

export interface StageTag {
  name: string;
  isFinalTarget: boolean;
}

export interface TeamLevel {
  id: string;
  position: number;
  code: string;
  label: string;
  isDefault: boolean;
}

export interface TrackingFormat {
  // Leads tracking (responses)
  leadsTrackingTags: TrackingTag[];  // Max 3-4, for analytics
  leadsNonTrackingTags: string[];    // Unlimited, display only
  
  // Stage tracking (sales stages)
  stageTags: StageTag[];             // Ordered stages
  stageNonTrackingTags: string[];    // Optional stage labels
  
  // Team levels
  levels: TeamLevel[];
  
  // Metadata
  rootLeaderName: string | null;
  rootLeaderId: string | null;
  isUsingLeaderFormat: boolean;
  isRootLeader: boolean;
}

interface CachedFormat extends TrackingFormat {
  fetchedAt: number;
}

// Cache tracking format for 5 minutes
const FORMAT_CACHE_TTL = 5 * 60 * 1000;
let formatCache: Record<string, CachedFormat> = {};

// Parse response_labels JSON structure
function parseResponseLabels(labels: any): { leadsTracking: TrackingTag[]; leadsNonTracking: string[] } {
  if (!labels) {
    return { leadsTracking: [], leadsNonTracking: [] };
  }
  
  // Handle new format: { tracking: [...], nonTracking: [...] }
  if (typeof labels === 'object' && labels.tracking) {
    return {
      leadsTracking: (labels.tracking || []).map((t: any) => ({
        name: t.name || t,
        isFilter: t.isFilter ?? true,
        isFinalTarget: t.isFinalTarget ?? false,
      })),
      leadsNonTracking: labels.nonTracking || [],
    };
  }
  
  // Handle legacy format: string[]
  if (Array.isArray(labels)) {
    const tracking = labels.slice(0, 3).map((name, idx, arr) => ({
      name: String(name),
      isFilter: true,
      isFinalTarget: idx === arr.length - 1,
    }));
    const nonTracking = labels.slice(3).map(String);
    return { leadsTracking: tracking, leadsNonTracking: nonTracking };
  }
  
  return { leadsTracking: [], leadsNonTracking: [] };
}

// Parse stage_labels JSON structure
function parseStageLabels(labels: any): { stageTags: StageTag[]; stageNonTracking: string[] } {
  if (!labels) {
    return { stageTags: [], stageNonTracking: [] };
  }
  
  // Handle new format: { stages: [...], nonTracking: [...] }
  if (typeof labels === 'object' && labels.stages) {
    return {
      stageTags: (labels.stages || []).map((s: any) => ({
        name: s.name || s,
        isFinalTarget: s.isFinalTarget ?? false,
      })),
      stageNonTracking: labels.nonTracking || [],
    };
  }
  
  // Handle legacy format: string[]
  if (Array.isArray(labels)) {
    const stageTags = labels.map((name, idx, arr) => ({
      name: String(name),
      isFinalTarget: idx === arr.length - 1,
    }));
    return { stageTags, stageNonTracking: [] };
  }
  
  return { stageTags: [], stageNonTracking: [] };
}

export function useTrackingFormat() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [trackingFormat, setTrackingFormat] = useState<TrackingFormat | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch root leader's tracking format by walking the leader chain
  const fetchRootLeaderFormat = useCallback(async (startLeaderId: string): Promise<{
    rootLeaderId: string;
    rootLeaderName: string;
    format: TrackingFormat;
  } | null> => {
    // Check cache first
    const cacheKey = `root_${startLeaderId}`;
    const cached = formatCache[cacheKey];
    if (cached && Date.now() - cached.fetchedAt < FORMAT_CACHE_TTL) {
      return {
        rootLeaderId: cached.rootLeaderId || startLeaderId,
        rootLeaderName: cached.rootLeaderName || 'Leader',
        format: cached
      };
    }

    let currentLeaderId = startLeaderId;
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      iterations++;
      
      const { data: leaderProfile, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, neverai_id, leaders_id_of_my_leader, use_leader_stages, response_labels, stage_labels')
        .ilike('neverai_id', currentLeaderId)
        .maybeSingle();

      if (error || !leaderProfile) {
        console.error('Error fetching leader profile:', error);
        return null;
      }

      // If this leader creates their own format (is root leader)
      if (!leaderProfile.use_leader_stages || !leaderProfile.leaders_id_of_my_leader) {
        // Get their levels
        const { data: levels } = await supabase
          .from('leader_levels')
          .select('id, label, code, is_default, position')
          .eq('leader_id', leaderProfile.user_id)
          .order('position', { ascending: true });

        const { leadsTracking, leadsNonTracking } = parseResponseLabels(leaderProfile.response_labels);
        const { stageTags, stageNonTracking } = parseStageLabels(leaderProfile.stage_labels);

        const format: TrackingFormat = {
          leadsTrackingTags: leadsTracking,
          leadsNonTrackingTags: leadsNonTracking,
          stageTags,
          stageNonTrackingTags: stageNonTracking,
          levels: (levels || []).map(l => ({
            id: l.id,
            position: l.position,
            code: l.code || `L${l.position}`,
            label: l.label,
            isDefault: l.is_default
          })),
          rootLeaderName: leaderProfile.display_name || 'Leader',
          rootLeaderId: leaderProfile.neverai_id,
          isUsingLeaderFormat: false,
          isRootLeader: true
        };

        // Cache the result
        formatCache[cacheKey] = { ...format, fetchedAt: Date.now() };

        return {
          rootLeaderId: leaderProfile.neverai_id || currentLeaderId,
          rootLeaderName: leaderProfile.display_name || 'Leader',
          format
        };
      }

      currentLeaderId = leaderProfile.leaders_id_of_my_leader;
    }

    console.error('Max iterations reached while walking leader chain');
    return null;
  }, []);

  // Load tracking format for current user
  const loadTrackingFormat = useCallback(async () => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // If user creates their own format (is root leader)
      if (!profile.use_leader_stages || !profile.leaders_id_of_my_leader) {
        // User is their own root leader
        const { data: levels } = await supabase
          .from('leader_levels')
          .select('id, label, code, is_default, position')
          .eq('leader_id', user.id)
          .order('position', { ascending: true });

        const { leadsTracking, leadsNonTracking } = parseResponseLabels(profile.response_labels);
        const { stageTags, stageNonTracking } = parseStageLabels(profile.stage_labels);

        setTrackingFormat({
          leadsTrackingTags: leadsTracking,
          leadsNonTrackingTags: leadsNonTracking,
          stageTags,
          stageNonTrackingTags: stageNonTracking,
          levels: (levels || []).map(l => ({
            id: l.id,
            position: l.position,
            code: l.code || `L${l.position}`,
            label: l.label,
            isDefault: l.is_default
          })),
          rootLeaderName: profile.display_name || 'You',
          rootLeaderId: profile.neverai_id,
          isUsingLeaderFormat: false,
          isRootLeader: true
        });
      } else {
        // User uses leader's format - walk the chain to root
        const rootResult = await fetchRootLeaderFormat(profile.leaders_id_of_my_leader);
        
        if (rootResult) {
          setTrackingFormat({
            ...rootResult.format,
            isUsingLeaderFormat: true,
            isRootLeader: false,
            rootLeaderName: rootResult.rootLeaderName,
            rootLeaderId: rootResult.rootLeaderId
          });
        } else {
          // Fallback to empty format
          setTrackingFormat({
            leadsTrackingTags: [],
            leadsNonTrackingTags: [],
            stageTags: [],
            stageNonTrackingTags: [],
            levels: [],
            rootLeaderName: null,
            rootLeaderId: null,
            isUsingLeaderFormat: true,
            isRootLeader: false
          });
        }
      }
    } catch (error) {
      console.error('Error loading tracking format:', error);
    } finally {
      setLoading(false);
    }
  }, [user, profile, fetchRootLeaderFormat]);

  useEffect(() => {
    if (!profileLoading) {
      loadTrackingFormat();
    }
  }, [profileLoading, loadTrackingFormat]);

  // Clear cache and reload
  const refreshFormat = useCallback(() => {
    formatCache = {};
    loadTrackingFormat();
  }, [loadTrackingFormat]);

  // === LEADS helpers ===
  const leadsTrackingTagNames = useMemo(() => 
    trackingFormat?.leadsTrackingTags.map(t => t.name) || [],
    [trackingFormat]
  );

  const leadsFinalTargetTag = useMemo(() => 
    trackingFormat?.leadsTrackingTags.find(t => t.isFinalTarget)?.name || null,
    [trackingFormat]
  );

  const isLeadsFinalTarget = useCallback((tagName: string) => {
    return trackingFormat?.leadsTrackingTags.find(t => t.name === tagName)?.isFinalTarget || false;
  }, [trackingFormat]);

  const isLeadsTrackingTag = useCallback((tagName: string) => {
    return trackingFormat?.leadsTrackingTags.some(t => t.name === tagName) || false;
  }, [trackingFormat]);

  // === STAGE helpers ===
  const stageTagNames = useMemo(() => 
    trackingFormat?.stageTags.map(t => t.name) || [],
    [trackingFormat]
  );

  const stageFinalTargetTag = useMemo(() => 
    trackingFormat?.stageTags.find(t => t.isFinalTarget)?.name || null,
    [trackingFormat]
  );

  const isStageFinalTarget = useCallback((tagName: string) => {
    return trackingFormat?.stageTags.find(t => t.name === tagName)?.isFinalTarget || false;
  }, [trackingFormat]);

  const isStageTag = useCallback((tagName: string) => {
    return trackingFormat?.stageTags.some(t => t.name === tagName) || false;
  }, [trackingFormat]);

  // === Legacy helpers for backward compatibility ===
  const trackingTagNames = leadsTrackingTagNames;
  const nonTrackingTags = trackingFormat?.leadsNonTrackingTags || [];
  const finalTargetTag = leadsFinalTargetTag;
  
  const isFinalTarget = useCallback((tagName: string) => {
    return isLeadsFinalTarget(tagName) || isStageFinalTarget(tagName);
  }, [isLeadsFinalTarget, isStageFinalTarget]);
  
  const isTrackingTag = useCallback((tagName: string) => {
    return isLeadsTrackingTag(tagName) || isStageTag(tagName);
  }, [isLeadsTrackingTag, isStageTag]);

  return {
    trackingFormat,
    loading: loading || profileLoading,
    refreshFormat,
    
    // Leads (Response) tags
    leadsTrackingTags: trackingFormat?.leadsTrackingTags || [],
    leadsNonTrackingTags: trackingFormat?.leadsNonTrackingTags || [],
    leadsTrackingTagNames,
    leadsFinalTargetTag,
    isLeadsFinalTarget,
    isLeadsTrackingTag,
    
    // Stage tags
    stageTags: trackingFormat?.stageTags || [],
    stageNonTrackingTags: trackingFormat?.stageNonTrackingTags || [],
    stageTagNames,
    stageFinalTargetTag,
    isStageFinalTarget,
    isStageTag,
    
    // Team levels
    levels: trackingFormat?.levels || [],
    
    // Metadata
    isRootLeader: trackingFormat?.isRootLeader || false,
    isUsingLeaderFormat: trackingFormat?.isUsingLeaderFormat || false,
    rootLeaderName: trackingFormat?.rootLeaderName || null,
    
    // Legacy aliases for backward compatibility
    trackingTagNames,
    nonTrackingTags,
    finalTargetTag,
    isFinalTarget,
    isTrackingTag,
  };
}
