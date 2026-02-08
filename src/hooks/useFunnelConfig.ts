import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FunnelConfig {
  id?: string;
  funnel_name: string;
  funnel_length: number;
  day_1_start: string;
  user_id?: string;
}

const FUNNEL_CONFIG_CACHE_KEY = 'nevorai-funnel-config';

function getCachedFunnelConfig(userId: string): { config: FunnelConfig | null; leaderConfig: FunnelConfig | null } | null {
  try {
    const raw = localStorage.getItem(`${FUNNEL_CONFIG_CACHE_KEY}-${userId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function setCachedFunnelConfig(userId: string, config: FunnelConfig | null, leaderConfig: FunnelConfig | null) {
  try {
    localStorage.setItem(`${FUNNEL_CONFIG_CACHE_KEY}-${userId}`, JSON.stringify({ config, leaderConfig }));
  } catch { /* quota exceeded */ }
}

export function clearFunnelConfigCache() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(k => { if (k.startsWith(FUNNEL_CONFIG_CACHE_KEY)) localStorage.removeItem(k); });
  } catch { /* ignore */ }
}

export function useFunnelConfig() {
  const { user } = useAuth();
  const cached = user?.id ? getCachedFunnelConfig(user.id) : null;
  const [config, setConfig] = useState<FunnelConfig | null>(cached?.config ?? null);
  const [leaderConfig, setLeaderConfig] = useState<FunnelConfig | null>(cached?.leaderConfig ?? null);
  const [leaderName, setLeaderName] = useState<string | null>(null);
  const [leaderUserId, setLeaderUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cached);
  const [useLeaderConfig, setUseLeaderConfig] = useState(false);
  const subscriptionRef = useRef<any>(null);

  const fetchConfig = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('funnel_configs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching funnel config:', error);
    } else if (data) {
      setConfig({
        id: data.id,
        funnel_name: data.funnel_name,
        funnel_length: data.funnel_length,
        day_1_start: data.day_1_start,
        user_id: data.user_id,
      });
    } else {
      setConfig(null);
    }
    setLoading(false);
  }, [user]);

  // Fetch user profile to check upline connection and use_leader_stages
  const checkLeaderConnection = useCallback(async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('upline_email, leaders_id_of_my_leader, root_leader_id, use_leader_stages')
      .eq('user_id', user.id)
      .maybeSingle();
    
    // Use root_leader_id first, fallback to direct leader (still using legacy IDs for RPC)
    const configLeaderId = profile?.root_leader_id || profile?.leaders_id_of_my_leader;
    
    if (configLeaderId && profile?.use_leader_stages && profile?.upline_email) {
      setUseLeaderConfig(true);
      await fetchLeaderConfigInternal(configLeaderId);
    } else {
      setUseLeaderConfig(false);
      setLeaderConfig(null);
      setLeaderName(null);
      setLeaderUserId(null);
    }
  }, [user]);

  // Internal function to fetch leader's funnel config
  const fetchLeaderConfigInternal = async (leaderNeveraiId: string) => {
    if (!leaderNeveraiId) return null;
    
    // Get the leader's profile using RPC (bypasses RLS)
    const { data: leaderData, error: rpcError } = await supabase
      .rpc('get_user_by_neverai_id', { target_neverai_id: leaderNeveraiId });
    
    if (rpcError || !leaderData || leaderData.length === 0) {
      console.error('Error fetching leader profile:', rpcError);
      return null;
    }
    
    const leaderUserId = leaderData[0].user_id;
    const leaderDisplayName = leaderData[0].display_name;
    
    setLeaderName(leaderDisplayName);
    setLeaderUserId(leaderUserId);
    
    // Fetch their funnel config
    const { data, error } = await supabase
      .from('funnel_configs')
      .select('*')
      .eq('user_id', leaderUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching leader funnel config:', error);
      return null;
    }
    
    if (data) {
      const leaderFunnelConfig: FunnelConfig = {
        id: data.id,
        funnel_name: data.funnel_name,
        funnel_length: data.funnel_length,
        day_1_start: data.day_1_start,
        user_id: data.user_id,
      };
      setLeaderConfig(leaderFunnelConfig);
      return leaderFunnelConfig;
    }
    
    setLeaderConfig(null);
    return null;
  };

  // Public function to fetch leader config (for manual calls)
  const fetchLeaderConfig = useCallback(async (leaderNeveraiId: string): Promise<FunnelConfig | null> => {
    return fetchLeaderConfigInternal(leaderNeveraiId);
  }, []);

  // Set up real-time subscription for leader's funnel config changes
  useEffect(() => {
    if (!leaderUserId || !useLeaderConfig) {
      // Clean up subscription if leader disconnected
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      return;
    }

    // Subscribe to leader's funnel_configs changes
    const channel = supabase
      .channel(`leader-funnel-config-${leaderUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'funnel_configs',
          filter: `user_id=eq.${leaderUserId}`,
        },
        (payload) => {
          console.log('Leader funnel config changed:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newData = payload.new as any;
            setLeaderConfig({
              id: newData.id,
              funnel_name: newData.funnel_name,
              funnel_length: newData.funnel_length,
              day_1_start: newData.day_1_start,
              user_id: newData.user_id,
            });
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      subscriptionRef.current = null;
    };
  }, [leaderUserId, useLeaderConfig]);

  // Persist to localStorage whenever config changes
  useEffect(() => {
    if (user?.id) {
      setCachedFunnelConfig(user.id, config, leaderConfig);
    }
  }, [user?.id, config, leaderConfig]);

  useEffect(() => {
    fetchConfig();
    checkLeaderConnection();
  }, [fetchConfig, checkLeaderConnection]);

  const saveConfig = async (newConfig: Omit<FunnelConfig, 'id'>) => {
    if (!user) return false;

    if (config?.id) {
      const { error } = await supabase
        .from('funnel_configs')
        .update({
          funnel_name: newConfig.funnel_name,
          funnel_length: newConfig.funnel_length,
          day_1_start: newConfig.day_1_start,
        })
        .eq('id', config.id);

      if (error) {
        console.error('Error updating funnel config:', error);
        return false;
      }
    } else {
      const { data, error } = await supabase
        .from('funnel_configs')
        .insert({
          user_id: user.id,
          funnel_name: newConfig.funnel_name,
          funnel_length: newConfig.funnel_length,
          day_1_start: newConfig.day_1_start,
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting funnel config:', error);
        return false;
      }
      if (data) {
        setConfig({
          id: data.id,
          funnel_name: data.funnel_name,
          funnel_length: data.funnel_length,
          day_1_start: data.day_1_start,
          user_id: data.user_id,
        });
      }
    }

    await fetchConfig();
    return true;
  };

  // Get the effective config (leader's if connected and using leader format, otherwise own)
  const getEffectiveConfig = useCallback((): FunnelConfig | null => {
    if (useLeaderConfig && leaderConfig) {
      return leaderConfig;
    }
    return config;
  }, [useLeaderConfig, leaderConfig, config]);

  // Get valid stages based on effective funnel length
  const getValidStages = (): string[] => {
    const effectiveConfig = getEffectiveConfig();
    const length = effectiveConfig?.funnel_length || 3;
    const baseStages: string[] = [];
    
    for (let i = 1; i <= length; i++) {
      baseStages.push(`Day ${i}`);
    }
    
    return baseStages;
  };

  return { 
    config, 
    leaderConfig,
    leaderName,
    leaderUserId,
    loading, 
    saveConfig, 
    refetch: fetchConfig,
    refetchLeaderConnection: checkLeaderConnection,
    fetchLeaderConfig,
    getValidStages,
    getEffectiveConfig,
    useLeaderConfig,
    // isReadOnly = true if connected to leader AND using their format, even if leader has no config yet
    isReadOnly: useLeaderConfig,
    hasLeaderConfig: !!leaderConfig,
  };
}
