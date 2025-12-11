import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Prospect } from '@/types/prospect';
import { useEncryption } from '@/hooks/useEncryption';

interface SharedOwner {
  user_id: string;
  display_name: string;
  nevorid: string | null;
}

const CACHE_KEY = 'team_prospects_cache';
const OWNERS_CACHE_KEY = 'team_owners_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Session storage helpers
const getSessionCache = <T>(key: string): { data: T; timestamp: number } | null => {
  try {
    const cached = sessionStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        return parsed;
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
};

const setSessionCache = <T>(key: string, data: T) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Ignore storage errors
  }
};

export function useSharedProspects() {
  const { user } = useAuth();
  const { decryptFields } = useEncryption();
  const [sharedOwners, setSharedOwners] = useState<SharedOwner[]>(() => {
    // Initialize from cache if available
    const cached = getSessionCache<SharedOwner[]>(OWNERS_CACHE_KEY);
    return cached?.data || [];
  });
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  // Cache for each owner's prospects to avoid re-fetching
  const prospectsCache = useRef<Record<string, Prospect[]>>(
    getSessionCache<Record<string, Prospect[]>>(CACHE_KEY)?.data || {}
  );
  const fetchingRef = useRef<Set<string>>(new Set());
  // Track current fetch request to cancel outdated ones
  const currentFetchId = useRef<number>(0);

  // Helper to decrypt a single prospect's phone
  const decryptProspect = useCallback(async (p: Prospect): Promise<Prospect> => {
    try {
      if (p.phone && p.phone.includes(':')) {
        const result = await decryptFields({ phone: p.phone });
        return { ...p, phone: result?.phone || p.phone };
      }
    } catch {
      // Keep original if decryption fails
    }
    return p;
  }, [decryptFields]);

  // Fetch list of users who have shared their data with me (ACTIVE only)
  const fetchSharedOwners = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: accessRecords, error } = await supabase
        .from('team_access')
        .select('owner_user_id')
        .eq('shared_with_user_id', user.id)
        .eq('status', 'active');
      
      if (error) {
        console.error('Error fetching team access:', error);
        return;
      }
      
      if (accessRecords && accessRecords.length > 0) {
        const ownerIds = accessRecords.map(r => r.owner_user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, neverai_id')
          .in('user_id', ownerIds);
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          return;
        }
        
        if (profiles) {
          const owners = profiles.map(p => ({
            user_id: p.user_id,
            display_name: p.display_name || 'Unknown',
            nevorid: p.neverai_id
          }));
          setSharedOwners(owners);
          // Cache to session storage
          setSessionCache(OWNERS_CACHE_KEY, owners);
        }
      } else {
        setSharedOwners([]);
        setSessionCache(OWNERS_CACHE_KEY, []);
      }
    } catch (err) {
      console.error('Error in fetchSharedOwners:', err);
    }
  }, [user]);

  // Fetch prospects for a single owner (with caching)
  const fetchOwnerProspects = useCallback(async (ownerId: string): Promise<Prospect[]> => {
    // Return from cache if available
    if (prospectsCache.current[ownerId]) {
      return prospectsCache.current[ownerId];
    }
    
    // Prevent duplicate fetches
    if (fetchingRef.current.has(ownerId)) {
      // Wait for existing fetch to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      return prospectsCache.current[ownerId] || [];
    }
    
    fetchingRef.current.add(ownerId);
    
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('user_id', ownerId)
        .order('date_added', { ascending: false })
        .limit(50); // Limit initial load for performance
      
      if (error) {
        console.error('Error fetching shared prospects:', error);
        fetchingRef.current.delete(ownerId);
        return [];
      }
      
      if (data) {
        // Decrypt phone numbers in parallel with error handling
        const decrypted = await Promise.all(
          data.map(p => decryptProspect(p as unknown as Prospect))
        );
        prospectsCache.current[ownerId] = decrypted;
        // Save cache to session storage
        setSessionCache(CACHE_KEY, prospectsCache.current);
        fetchingRef.current.delete(ownerId);
        return decrypted;
      }
    } catch (err) {
      console.error('Error in fetchOwnerProspects:', err);
    }
    
    fetchingRef.current.delete(ownerId);
    return [];
  }, [decryptProspect]);

  // Update combined prospects when selection changes - with cancellation support
  const updateCombinedProspects = useCallback(async () => {
    // Increment fetch ID to track this request
    const fetchId = ++currentFetchId.current;
    
    if (selectedOwnerIds.length === 0) {
      setProspects([]);
      setLoading(false);
      return;
    }
    
    // Check if all data is cached - if so, show instantly without loading
    const allCached = selectedOwnerIds.every(id => prospectsCache.current[id]);
    
    if (allCached) {
      // Instantly show cached data - no loading state needed
      const cachedProspects = selectedOwnerIds.flatMap(id => prospectsCache.current[id] || []);
      cachedProspects.sort((a, b) => 
        new Date(b.date_added).getTime() - new Date(a.date_added).getTime()
      );
      setProspects(cachedProspects);
      return;
    }
    
    // Only show loading if we need to fetch new data
    setLoading(true);
    
    try {
      // Fetch all selected owners' prospects in parallel
      const allProspects = await Promise.all(
        selectedOwnerIds.map(ownerId => fetchOwnerProspects(ownerId))
      );
      
      // Check if this fetch is still the latest one
      if (fetchId !== currentFetchId.current) {
        // A newer fetch was started, discard this result
        return;
      }
      
      // Combine all prospects
      const combined = allProspects.flat();
      
      // Sort by date_added descending
      combined.sort((a, b) => 
        new Date(b.date_added).getTime() - new Date(a.date_added).getTime()
      );
      
      setProspects(combined);
    } catch (err) {
      console.error('Error updating combined prospects:', err);
      // Only update if this is still the current fetch
      if (fetchId === currentFetchId.current) {
        setProspects([]);
      }
    } finally {
      // Only update loading state if this is still the current fetch
      if (fetchId === currentFetchId.current) {
        setLoading(false);
      }
    }
  }, [selectedOwnerIds, fetchOwnerProspects]);

  // Set up real-time subscriptions for all selected owners
  useEffect(() => {
    if (selectedOwnerIds.length === 0) return;

    const channels = selectedOwnerIds.map(ownerId => {
      return supabase
        .channel(`shared-prospects-${ownerId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'prospects',
            filter: `user_id=eq.${ownerId}`
          },
          async (payload) => {
            // Invalidate cache for this owner
            delete prospectsCache.current[ownerId];
            
            // Refetch this owner's prospects and update combined
            const updatedProspects = await fetchOwnerProspects(ownerId);
            prospectsCache.current[ownerId] = updatedProspects;
            
            // Rebuild combined list
            const allProspects = await Promise.all(
              selectedOwnerIds.map(id => {
                if (prospectsCache.current[id]) {
                  return Promise.resolve(prospectsCache.current[id]);
                }
                return fetchOwnerProspects(id);
              })
            );
            
            const combined = allProspects.flat();
            combined.sort((a, b) => 
              new Date(b.date_added).getTime() - new Date(a.date_added).getTime()
            );
            setProspects(combined);
          }
        )
        .subscribe();
    });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [selectedOwnerIds, fetchOwnerProspects]);

  // Initial fetch of shared owners
  useEffect(() => {
    if (user && !initialLoadDone) {
      fetchSharedOwners().then(() => setInitialLoadDone(true));
    }
  }, [user, fetchSharedOwners, initialLoadDone]);

  // Update prospects when selection changes - use selectedOwnerIds as dependency directly
  useEffect(() => {
    // Only update if we have selections or need to clear
    if (selectedOwnerIds.length === 0) {
      setProspects([]);
      setLoading(false);
      return;
    }
    
    updateCombinedProspects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOwnerIds]);

  // Toggle a single owner selection - debounced to prevent rapid switches
  const toggleOwnerSelection = useCallback((ownerId: string) => {
    setSelectedOwnerIds(prev => {
      if (prev.includes(ownerId)) {
        return prev.filter(id => id !== ownerId);
      } else {
        return [...prev, ownerId];
      }
    });
  }, []);

  // Select all owners
  const selectAllOwners = useCallback(() => {
    setSelectedOwnerIds(sharedOwners.map(o => o.user_id));
  }, [sharedOwners]);

  // Clear all selections - also clear prospects immediately to prevent stale data
  const clearSelection = useCallback(() => {
    currentFetchId.current++; // Cancel any in-flight fetches
    setSelectedOwnerIds([]);
    setProspects([]);
    setLoading(false);
  }, []);

  // Legacy single-select API for backward compatibility
  const setSelectedOwnerId = useCallback((ownerId: string | null) => {
    currentFetchId.current++; // Cancel any in-flight fetches
    if (ownerId) {
      setSelectedOwnerIds([ownerId]);
    } else {
      setSelectedOwnerIds([]);
      setProspects([]);
    }
  }, []);

  // Get first selected owner ID (for backward compatibility)
  const selectedOwnerId = selectedOwnerIds.length === 1 ? selectedOwnerIds[0] : null;

  return {
    sharedOwners,
    selectedOwnerIds,
    selectedOwnerId, // backward compatibility
    setSelectedOwnerId, // backward compatibility
    setSelectedOwnerIds,
    toggleOwnerSelection,
    selectAllOwners,
    clearSelection,
    prospects,
    loading,
    refetchOwners: fetchSharedOwners,
    refetchProspects: updateCombinedProspects
  };
}
