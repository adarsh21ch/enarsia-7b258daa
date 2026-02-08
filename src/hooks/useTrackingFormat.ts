import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  directLeaderUserId: string | null;  // UUID of direct leader (for snapshot writes)
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

const TRACKING_FORMAT_CACHE_KEY = 'nevorai-tracking-format';

function getCachedTrackingFormat(userId: string): TrackingFormat | null {
  try {
    const raw = localStorage.getItem(`${TRACKING_FORMAT_CACHE_KEY}-${userId}`);
    if (!raw) return null;
    return JSON.parse(raw) as TrackingFormat;
  } catch { return null; }
}

function setCachedTrackingFormat(userId: string, format: TrackingFormat) {
  try {
    localStorage.setItem(`${TRACKING_FORMAT_CACHE_KEY}-${userId}`, JSON.stringify(format));
  } catch { /* quota exceeded - ignore */ }
}

export function clearTrackingFormatCache() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(k => { if (k.startsWith(TRACKING_FORMAT_CACHE_KEY)) localStorage.removeItem(k); });
  } catch { /* ignore */ }
}

export function useTrackingFormat() {
  const { user } = useAuth();
  // Initialize from cache for instant display
  const [trackingFormat, setTrackingFormat] = useState<TrackingFormat | null>(() => {
    if (!user?.id) return null;
    return getCachedTrackingFormat(user.id);
  });
  const [loading, setLoading] = useState(() => {
    // If we have cached data, don't show loading state
    if (user?.id && getCachedTrackingFormat(user.id)) return false;
    return true;
  });
  const lastRefreshTokenRef = useRef<string | null>(null);

  // Fetch a leader's profile meta (name/id). Used for displaying the *direct* leader.
  // IMPORTANT: profiles table is protected by RLS, so we must use SECURITY DEFINER RPCs.
  const fetchLeaderMeta = useCallback(async (leaderNeveraiId: string): Promise<{
    leaderUserId: string;
    leaderId: string;
    leaderName: string;
  } | null> => {
    const { data, error } = await supabase.rpc('get_user_by_neverai_id', {
      target_neverai_id: leaderNeveraiId,
    });

    if (error || !data || data.length === 0) {
      console.error('Error fetching leader meta:', error);
      return null;
    }

    const leader = data[0] as any;
    return {
      leaderUserId: leader.user_id,
      leaderId: leader.neverai_id || leaderNeveraiId,
      leaderName: leader.display_name || 'Leader',
    };
  }, []);

  // Fetch ROOT leader's tracking format (this is the tracking format owner for the whole tree)
  // IMPORTANT: profiles table is protected by RLS, so we must use SECURITY DEFINER RPCs.
  const fetchLeaderFormat = useCallback(async (leaderNeveraiId: string): Promise<{
    leaderUserId: string;
    leaderId: string;
    leaderName: string;
    leadsTracking: TrackingTag[];
    stageTags: StageTag[];
    levels: TeamLevel[];
  } | null> => {
    // 1) Resolve leader profile (user_id + display_name) via RPC
    const { data: leaderUsers, error: leaderUserError } = await supabase.rpc('get_user_by_neverai_id', {
      target_neverai_id: leaderNeveraiId,
    });

    if (leaderUserError || !leaderUsers || leaderUsers.length === 0) {
      console.error('Error resolving leader user by ID:', leaderUserError);
      return null;
    }

    const leaderUser = leaderUsers[0] as any;

    // 2) Fetch leader tracking tags + stage tags via RPC
    const { data: config, error: configError } = await supabase.rpc('get_leader_stage_config', {
      target_leader_id: leaderNeveraiId,
    });

    if (configError || !config || (config as any).found === false) {
      console.error('Error fetching leader stage config:', configError);
      // Still return leader identity so UI can show “Connected to …” even if tags are empty
      // Use display_name or email prefix (never full email, never "Unnamed")
      const errorCleanName = leaderUser.display_name && leaderUser.display_name.trim() && leaderUser.display_name.toLowerCase() !== 'unnamed'
        ? leaderUser.display_name
        : (leaderUser.email ? leaderUser.email.split('@')[0].charAt(0).toUpperCase() + leaderUser.email.split('@')[0].slice(1) : 'Leader');
      return {
        leaderUserId: leaderUser.user_id,
        leaderId: leaderUser.neverai_id || leaderNeveraiId,
        leaderName: errorCleanName,
        leadsTracking: [],
        stageTags: [],
        levels: [],
      };
    }

    const cfg: any = config;
    const { leadsTracking } = parseResponseLabels(cfg.response_labels);
    const { stageTags } = parseStageLabels(cfg.stage_labels);

    // 3) Levels: may be restricted by RLS depending on your chosen access model.
    // We keep it best-effort; tags inheritance is the critical path.
    const { data: levels } = await supabase
      .from('leader_levels')
      .select('id, label, code, is_default, position')
      .eq('leader_id', leaderUser.user_id)
      .order('position', { ascending: true });

    // Use display_name or email prefix (never full email, never "Unnamed")
    const cleanLeaderName = leaderUser.display_name && leaderUser.display_name.trim() && leaderUser.display_name.toLowerCase() !== 'unnamed'
      ? leaderUser.display_name
      : (leaderUser.email ? leaderUser.email.split('@')[0].charAt(0).toUpperCase() + leaderUser.email.split('@')[0].slice(1) : 'Leader');
    return {
      leaderUserId: leaderUser.user_id,
      leaderId: leaderUser.neverai_id || leaderNeveraiId,
      leaderName: cleanLeaderName,
      leadsTracking,
      stageTags,
      levels: (levels || []).map((l: any) => ({
        id: l.id,
        position: l.position,
        code: l.code || `L${l.position}`,
        label: l.label,
        isDefault: l.is_default,
      })),
    };
  }, []);

  // Load tracking format for current user - always fetches fresh data from DB
  const loadTrackingFormat = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // ALWAYS fetch fresh profile data directly from the database
      // This ensures we get the latest tags even after save
      const { data: freshProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError || !freshProfile) {
        console.error('Error fetching fresh profile:', profileError);
        setLoading(false);
        return;
      }

      // Parse user's OWN personal tags from fresh profile data
      const { leadsNonTracking: ownLeadsPersonal } = parseResponseLabels(freshProfile.response_labels);
      const { stageNonTracking: ownStagePersonal } = parseStageLabels(freshProfile.stage_labels);

      // If user creates their own format (is root leader / no upline)
      if (!freshProfile.use_leader_stages || !freshProfile.upline_email) {
        // User is their own root leader - use their own tracking tags
        const { data: levels } = await supabase
          .from('leader_levels')
          .select('id, label, code, is_default, position')
          .eq('leader_id', user.id)
          .order('position', { ascending: true });

        const { leadsTracking } = parseResponseLabels(freshProfile.response_labels);
        const { stageTags } = parseStageLabels(freshProfile.stage_labels);

        const format: TrackingFormat = {
          leadsTrackingTags: leadsTracking,
          leadsNonTrackingTags: ownLeadsPersonal,
          stageTags,
          stageNonTrackingTags: ownStagePersonal,
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
          directLeaderUserId: null,
          isUsingLeaderFormat: false,
          isRootLeader: true,
          rootLeaderName: freshProfile.display_name || 'You',
          rootLeaderId: freshProfile.neverai_id,
        };
        setTrackingFormat(format);
        setCachedTrackingFormat(user.id, format);
      } else {
        // User uses upline's format - fetch using email-based lookup
        // For now, we still need the legacy neverai_id fields for the RPC calls
        // TODO: Update RPCs to support email-based lookup
        const directLeaderNeveraiId = freshProfile.leaders_id_of_my_leader;
        const rootLeaderNeveraiId = freshProfile.root_leader_id || directLeaderNeveraiId;

        const [directLeaderMeta, rootLeaderData] = await Promise.all([
          directLeaderNeveraiId ? fetchLeaderMeta(directLeaderNeveraiId) : Promise.resolve(null),
          rootLeaderNeveraiId ? fetchLeaderFormat(rootLeaderNeveraiId) : Promise.resolve(null),
        ]);

        if (rootLeaderData) {
          const format: TrackingFormat = {
            leadsTrackingTags: rootLeaderData.leadsTracking,
            stageTags: rootLeaderData.stageTags,
            levels: rootLeaderData.levels,
            leadsNonTrackingTags: ownLeadsPersonal,
            stageNonTrackingTags: ownStagePersonal,
            leaderLeadsPersonalTags: [],
            leaderStagePersonalTags: [],
            ownLeadsPersonalTags: ownLeadsPersonal,
            ownStagePersonalTags: ownStagePersonal,
            directLeaderName: directLeaderMeta?.leaderName || 'Leader',
            directLeaderId: directLeaderMeta?.leaderId || directLeaderNeveraiId,
            directLeaderUserId: directLeaderMeta?.leaderUserId || null,
            isUsingLeaderFormat: true,
            isRootLeader: false,
            rootLeaderName: rootLeaderData.leaderName,
            rootLeaderId: rootLeaderData.leaderId,
          };
          setTrackingFormat(format);
          setCachedTrackingFormat(user.id, format);
        } else {
          // If the root leader cannot be resolved, do NOT fall back to the user's old tracking tags
          // (keeps behavior aligned with "use leader format")
          const format: TrackingFormat = {
            leadsTrackingTags: [],
            stageTags: [],
            levels: [],
            leadsNonTrackingTags: ownLeadsPersonal,
            stageNonTrackingTags: ownStagePersonal,
            leaderLeadsPersonalTags: [],
            leaderStagePersonalTags: [],
            ownLeadsPersonalTags: ownLeadsPersonal,
            ownStagePersonalTags: ownStagePersonal,
            directLeaderName: directLeaderMeta?.leaderName || null,
            directLeaderId: directLeaderMeta?.leaderId || directLeaderNeveraiId,
            directLeaderUserId: directLeaderMeta?.leaderUserId || null,
            isUsingLeaderFormat: true,
            isRootLeader: false,
            rootLeaderName: null,
            rootLeaderId: rootLeaderNeveraiId,
          };
          setTrackingFormat(format);
          setCachedTrackingFormat(user.id, format);
        }
      }
    } catch (error) {
      console.error('Error loading tracking format:', error);
    } finally {
      setLoading(false);
    }
  }, [user, fetchLeaderMeta, fetchLeaderFormat]);

  useEffect(() => {
    if (user) {
      loadTrackingFormat();
    }
  }, [user, loadTrackingFormat]);

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

  // Real-time subscription to ROOT leader's profile changes (backup sync method)
  useEffect(() => {
    const rootLeaderId = trackingFormat?.rootLeaderId;
    if (!user?.id || !rootLeaderId) return;

    const channel = supabase
      .channel(`root-leader-tags-${rootLeaderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        async (payload) => {
          const newNeveraiId = (payload.new as any)?.neverai_id;
          if (newNeveraiId?.toUpperCase() !== rootLeaderId?.toUpperCase()) return;

          const oldLabels = JSON.stringify((payload.old as any)?.response_labels);
          const newLabels = JSON.stringify((payload.new as any)?.response_labels);
          const oldStageLabels = JSON.stringify((payload.old as any)?.stage_labels);
          const newStageLabels = JSON.stringify((payload.new as any)?.stage_labels);

          if (oldLabels !== newLabels || oldStageLabels !== newStageLabels) {
            console.log('Root leader tags changed, refetching format...');
            loadTrackingFormat();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, trackingFormat?.rootLeaderId, loadTrackingFormat]);

  // Reload format (no cache since we removed caching for real-time updates)
  const refreshFormat = useCallback(() => {
    loadTrackingFormat();
  }, [loadTrackingFormat]);

  // Optimistic updates so dropdowns update instantly (no need to reopen/refresh)
  const setOwnLeadsPersonalTags = useCallback((tags: string[]) => {
    setTrackingFormat((prev) =>
      prev
        ? {
            ...prev,
            leadsNonTrackingTags: tags,
            ownLeadsPersonalTags: tags,
          }
        : prev
    );
  }, []);

  const setOwnStagePersonalTags = useCallback((tags: string[]) => {
    setTrackingFormat((prev) =>
      prev
        ? {
            ...prev,
            stageNonTrackingTags: tags,
            ownStagePersonalTags: tags,
          }
        : prev
    );
  }, []);

  // Function for leaders to trigger refresh for all team members
  const triggerTeamRefresh = useCallback(async () => {
    if (!user?.id) return false;

    // Fetch current user's neverai_id fresh from database
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('neverai_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!currentProfile?.neverai_id) return false;

    const refreshToken = Date.now().toString();

    // Update all team members in this leader's tree (and direct followers)
    // Use ilike for case-insensitive matching
    const { error } = await supabase
      .from('profiles')
      .update({ tags_refresh_token: refreshToken } as any)
      .or(`leaders_id_of_my_leader.ilike.${currentProfile.neverai_id},root_leader_id.ilike.${currentProfile.neverai_id}`);

    if (error) {
      console.error('Error triggering team refresh:', error);
      return false;
    }

    return true;
  }, [user?.id]);

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
    loading,
    refreshFormat,
    triggerTeamRefresh,

    // Optimistic personal-tag updaters
    setOwnLeadsPersonalTags,
    setOwnStagePersonalTags,
    
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
    directLeaderUserId: trackingFormat?.directLeaderUserId || null,
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