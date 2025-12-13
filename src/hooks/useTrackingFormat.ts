import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

export interface TrackingTag {
  name: string;
  isFilter: boolean;
  isFinalTarget: boolean;
}

export interface TrackingFormat {
  trackingTags: TrackingTag[];  // Max 3, for analytics
  nonTrackingTags: string[];    // Unlimited, display only
  levels: { id: string; label: string; code?: string; isDefault: boolean }[];
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
    const maxIterations = 10; // Prevent infinite loops

    while (iterations < maxIterations) {
      iterations++;
      
      // Get leader's profile
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
        // This is the root leader - get their full format
        const { data: levels } = await supabase
          .from('leader_levels')
          .select('id, label, code, is_default')
          .eq('leader_id', leaderProfile.user_id)
          .order('position', { ascending: true });

        // Parse tracking tags from response_labels (first 3 are tracking, rest are non-tracking)
        const responseLabels = (leaderProfile.response_labels as string[]) || [];
        const trackingTags: TrackingTag[] = responseLabels.slice(0, 3).map((name, idx) => ({
          name,
          isFilter: true, // All tracking tags are filter tags by default
          isFinalTarget: idx === 2 // Last tracking tag is final target by default
        }));
        const nonTrackingTags = responseLabels.slice(3);

        const format: TrackingFormat = {
          trackingTags,
          nonTrackingTags,
          levels: (levels || []).map(l => ({
            id: l.id,
            label: l.label,
            code: l.code || undefined,
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

      // Otherwise, walk up to this leader's leader
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
          .select('id, label, code, is_default')
          .eq('leader_id', user.id)
          .order('position', { ascending: true });

        // Parse tracking tags from response_labels
        const responseLabels = profile.response_labels || [];
        const trackingTags: TrackingTag[] = responseLabels.slice(0, 3).map((name, idx) => ({
          name,
          isFilter: true,
          isFinalTarget: idx === responseLabels.slice(0, 3).length - 1 // Last one is final
        }));
        const nonTrackingTags = responseLabels.slice(3);

        setTrackingFormat({
          trackingTags,
          nonTrackingTags,
          levels: (levels || []).map(l => ({
            id: l.id,
            label: l.label,
            code: l.code || undefined,
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
            trackingTags: [],
            nonTrackingTags: [],
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

  // Get tracking tag names only (for dropdowns)
  const trackingTagNames = useMemo(() => 
    trackingFormat?.trackingTags.map(t => t.name) || [],
    [trackingFormat]
  );

  // Get the final target tag name
  const finalTargetTag = useMemo(() => 
    trackingFormat?.trackingTags.find(t => t.isFinalTarget)?.name || null,
    [trackingFormat]
  );

  // Check if a tag is the final target
  const isFinalTarget = useCallback((tagName: string) => {
    return trackingFormat?.trackingTags.find(t => t.name === tagName)?.isFinalTarget || false;
  }, [trackingFormat]);

  // Check if a tag is a tracking tag (not non-tracking)
  const isTrackingTag = useCallback((tagName: string) => {
    return trackingFormat?.trackingTags.some(t => t.name === tagName) || false;
  }, [trackingFormat]);

  return {
    trackingFormat,
    loading: loading || profileLoading,
    refreshFormat,
    trackingTagNames,
    nonTrackingTags: trackingFormat?.nonTrackingTags || [],
    finalTargetTag,
    isFinalTarget,
    isTrackingTag,
    levels: trackingFormat?.levels || [],
    isRootLeader: trackingFormat?.isRootLeader || false,
    isUsingLeaderFormat: trackingFormat?.isUsingLeaderFormat || false,
    rootLeaderName: trackingFormat?.rootLeaderName || null,
  };
}
