import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

export interface TrackingTag {
  name: string;
  isStageTag: boolean;  // true = filter tag (appears in Funnel tab), false = leads-only
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
  leadsNonTrackingTags: string[];    // Combined personal tags for dropdowns
  
  // Stage tracking (sales stages)
  stageTags: StageTag[];             // Ordered stages
  stageNonTrackingTags: string[];    // Combined personal tags for dropdowns
  
  // Leader's personal tags (read-only, inherited)
  leaderLeadsPersonalTags: string[];
  leaderStagePersonalTags: string[];
  
  // User's own personal tags (editable)
  ownLeadsPersonalTags: string[];
  ownStagePersonalTags: string[];
  
  // Team levels
  levels: TeamLevel[];
  
  // Metadata
  directLeaderName: string | null;
  directLeaderId: string | null;
  isUsingLeaderFormat: boolean;
  isRootLeader: boolean;
  
  // Legacy aliases (kept for compatibility)
  rootLeaderName: string | null;
  rootLeaderId: string | null;
}

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
        // Support both old "isFilter" and new "isStageTag" field names
        isStageTag: t.isStageTag ?? t.isFilter ?? false,
        isFinalTarget: t.isFinalTarget ?? false,
      })),
      leadsNonTracking: labels.nonTracking || [],
    };
  }
  
  // Handle legacy format: string[]
  if (Array.isArray(labels)) {
    const tracking = labels.map((name, idx, arr) => ({
      name: String(name),
      isStageTag: false,  // Legacy tags are NOT stage tags by default
      isFinalTarget: false,  // No Final for leads - Final is only for stages
    }));
    return { leadsTracking: tracking, leadsNonTracking: [] };
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
  const { profile, loading: profileLoading, refetch: refetchProfile } = useProfile();
  const [trackingFormat, setTrackingFormat] = useState<TrackingFormat | null>(null);
  const [loading, setLoading] = useState(true);
  const lastRefreshTokenRef = useRef<string | null>(null);

  // Fetch DIRECT leader's tracking format (single lookup, no chain walking)
  const fetchDirectLeaderFormat = useCallback(async (leaderNeveraiId: string): Promise<{
    directLeaderId: string;
    directLeaderName: string;
    leadsTracking: TrackingTag[];
    leadsNonTracking: string[];
    stageTags: StageTag[];
    stageNonTracking: string[];
    levels: TeamLevel[];
  } | null> => {
    // Single lookup to direct leader - no chain walking
    const { data: leaderProfile, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, neverai_id, response_labels, stage_labels')
      .ilike('neverai_id', leaderNeveraiId)
      .maybeSingle();

    if (error || !leaderProfile) {
      console.error('Error fetching direct leader profile:', error);
      return null;
    }

    // Get leader's levels
    const { data: levels } = await supabase
      .from('leader_levels')
      .select('id, label, code, is_default, position')
      .eq('leader_id', leaderProfile.user_id)
      .order('position', { ascending: true });

    const { leadsTracking, leadsNonTracking } = parseResponseLabels(leaderProfile.response_labels);
    const { stageTags, stageNonTracking } = parseStageLabels(leaderProfile.stage_labels);

    return {
      directLeaderId: leaderProfile.neverai_id || leaderNeveraiId,
      directLeaderName: leaderProfile.display_name || 'Leader',
      leadsTracking,
      leadsNonTracking,
      stageTags,
      stageNonTracking,
      levels: (levels || []).map(l => ({
        id: l.id,
        position: l.position,
        code: l.code || `L${l.position}`,
        label: l.label,
        isDefault: l.is_default
      })),
    };
  }, []);

  // Load tracking format for current user
  const loadTrackingFormat = useCallback(async () => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Parse user's OWN personal tags from their profile
      const { leadsNonTracking: ownLeadsPersonal } = parseResponseLabels(profile.response_labels);
      const { stageNonTracking: ownStagePersonal } = parseStageLabels(profile.stage_labels);

      // If user creates their own format (is root leader / no leader)
      if (!profile.use_leader_stages || !profile.leaders_id_of_my_leader) {
        // User is their own root leader - use their own tracking tags
        const { data: levels } = await supabase
          .from('leader_levels')
          .select('id, label, code, is_default, position')
          .eq('leader_id', user.id)
          .order('position', { ascending: true });

        const { leadsTracking } = parseResponseLabels(profile.response_labels);
        const { stageTags } = parseStageLabels(profile.stage_labels);

        setTrackingFormat({
          leadsTrackingTags: leadsTracking,
          leadsNonTrackingTags: ownLeadsPersonal,
          stageTags,
          stageNonTrackingTags: ownStagePersonal,
          // For root leader, all personal tags are their own
          leaderLeadsPersonalTags: [],
          leaderStagePersonalTags: [],
          ownLeadsPersonalTags: ownLeadsPersonal,
          ownStagePersonalTags: ownStagePersonal,
          levels: (levels || []).map(l => ({
            id: l.id,
            position: l.position,
            code: l.code || `L${l.position}`,
            label: l.label,
            isDefault: l.is_default
          })),
          directLeaderName: null,
          directLeaderId: null,
          isUsingLeaderFormat: false,
          isRootLeader: true,
          // Legacy aliases
          rootLeaderName: profile.display_name || 'You',
          rootLeaderId: profile.neverai_id,
        });
      } else {
        // User uses leader's format - fetch DIRECT leader only (no chain)
        const leaderData = await fetchDirectLeaderFormat(profile.leaders_id_of_my_leader);
        
        if (leaderData) {
          // Personal tags are NEVER inherited - only user's own
          setTrackingFormat({
            // TRACKING tags come from DIRECT leader
            leadsTrackingTags: leaderData.leadsTracking,
            stageTags: leaderData.stageTags,
            levels: leaderData.levels,
            // Only user's own personal tags (no leader's personal tags)
            leadsNonTrackingTags: ownLeadsPersonal,
            stageNonTrackingTags: ownStagePersonal,
            // Leader's personal tags NOT inherited - always empty for members
            leaderLeadsPersonalTags: [],
            leaderStagePersonalTags: [],
            ownLeadsPersonalTags: ownLeadsPersonal,
            ownStagePersonalTags: ownStagePersonal,
            // Metadata
            directLeaderName: leaderData.directLeaderName,
            directLeaderId: leaderData.directLeaderId,
            isUsingLeaderFormat: true,
            isRootLeader: false,
            // Legacy aliases
            rootLeaderName: leaderData.directLeaderName,
            rootLeaderId: leaderData.directLeaderId,
          });
        } else {
          // Fallback to user's own tags if leader not found
          const { leadsTracking } = parseResponseLabels(profile.response_labels);
          const { stageTags } = parseStageLabels(profile.stage_labels);
          
          setTrackingFormat({
            leadsTrackingTags: leadsTracking,
            leadsNonTrackingTags: ownLeadsPersonal,
            stageTags,
            stageNonTrackingTags: ownStagePersonal,
            leaderLeadsPersonalTags: [],
            leaderStagePersonalTags: [],
            ownLeadsPersonalTags: ownLeadsPersonal,
            ownStagePersonalTags: ownStagePersonal,
            levels: [],
            directLeaderName: null,
            directLeaderId: null,
            isUsingLeaderFormat: true, // Still marked as using leader format (just not found)
            isRootLeader: false,
            rootLeaderName: null,
            rootLeaderId: null,
          });
        }
      }
    } catch (error) {
      console.error('Error loading tracking format:', error);
    } finally {
      setLoading(false);
    }
  }, [user, profile, fetchDirectLeaderFormat]);

  useEffect(() => {
    if (!profileLoading) {
      loadTrackingFormat();
    }
  }, [profileLoading, loadTrackingFormat]);

  // Real-time subscription for instant tag refresh when leader updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`tags-refresh-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newToken = (payload.new as any)?.tags_refresh_token;
          // If token changed, refetch the format
          if (newToken && newToken !== lastRefreshTokenRef.current) {
            lastRefreshTokenRef.current = newToken;
            console.log('Tags refresh token changed, refetching format...');
            loadTrackingFormat();
            toast.success('Tracking tags updated by leader');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadTrackingFormat]);

  // Reload format (no cache since we removed caching for real-time updates)
  const refreshFormat = useCallback(() => {
    loadTrackingFormat();
  }, [loadTrackingFormat]);

  // Function for leaders to trigger refresh for all team members
  const triggerTeamRefresh = useCallback(async () => {
    if (!user?.id || !profile?.neverai_id) return false;

    const refreshToken = Date.now().toString();
    
    // Update all team members who follow this leader
    const { error } = await supabase
      .from('profiles')
      .update({ tags_refresh_token: refreshToken } as any)
      .eq('leaders_id_of_my_leader', profile.neverai_id);

    if (error) {
      console.error('Error triggering team refresh:', error);
      return false;
    }

    return true;
  }, [user?.id, profile?.neverai_id]);

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
    triggerTeamRefresh,
    
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
    
    // Separate personal tags (for UI display)
    leaderLeadsPersonalTags: trackingFormat?.leaderLeadsPersonalTags || [],
    leaderStagePersonalTags: trackingFormat?.leaderStagePersonalTags || [],
    ownLeadsPersonalTags: trackingFormat?.ownLeadsPersonalTags || [],
    ownStagePersonalTags: trackingFormat?.ownStagePersonalTags || [],
    
    // Metadata
    isRootLeader: trackingFormat?.isRootLeader || false,
    isUsingLeaderFormat: trackingFormat?.isUsingLeaderFormat || false,
    directLeaderName: trackingFormat?.directLeaderName || null,
    directLeaderId: trackingFormat?.directLeaderId || null,
    // Legacy aliases
    rootLeaderName: trackingFormat?.rootLeaderName || null,
    
    // Legacy aliases for backward compatibility
    trackingTagNames,
    nonTrackingTags,
    finalTargetTag,
    isFinalTarget,
    isTrackingTag,
  };
}