import { useState, useEffect, useCallback, useRef } from 'react';
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
const COUNTS_CACHE_KEY = 'team_prospect_counts';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const PAGE_SIZE = 30; // Fetch 30 records at a time

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
    const cached = getSessionCache<SharedOwner[]>(OWNERS_CACHE_KEY);
    return cached?.data || [];
  });
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [prospectCounts, setProspectCounts] = useState<Record<string, number>>(() => {
    const cached = getSessionCache<Record<string, number>>(COUNTS_CACHE_KEY);
    return cached?.data || {};
  });
  
  // Cache for each owner's prospects
  const prospectsCache = useRef<Record<string, Prospect[]>>(
    getSessionCache<Record<string, Prospect[]>>(CACHE_KEY)?.data || {}
  );
  const fetchingRef = useRef<Set<string>>(new Set());
  const currentFetchId = useRef<number>(0);
  const fullyLoadedOwners = useRef<Set<string>>(new Set());

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

  // Fetch total count for an owner
  const fetchOwnerCount = useCallback(async (ownerId: string): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('prospects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ownerId);
      
      if (error) {
        console.error('Error fetching count:', error);
        return 0;
      }
      return count || 0;
    } catch {
      return 0;
    }
  }, []);

  // Fetch list of users who have shared their data with me
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
          setSessionCache(OWNERS_CACHE_KEY, owners);

          // Fetch counts for all owners in parallel
          const counts = await Promise.all(
            ownerIds.map(async (id) => {
              const count = await fetchOwnerCount(id);
              return { id, count };
            })
          );
          
          const countMap: Record<string, number> = {};
          counts.forEach(({ id, count }) => {
            countMap[id] = count;
          });
          setProspectCounts(countMap);
          setSessionCache(COUNTS_CACHE_KEY, countMap);
        }
      } else {
        setSharedOwners([]);
        setSessionCache(OWNERS_CACHE_KEY, []);
        setProspectCounts({});
        setSessionCache(COUNTS_CACHE_KEY, {});
      }
    } catch (err) {
      console.error('Error in fetchSharedOwners:', err);
    }
  }, [user, fetchOwnerCount]);

  // Fetch first page of prospects for instant display
  const fetchOwnerProspectsFirstPage = useCallback(async (ownerId: string): Promise<Prospect[]> => {
    if (prospectsCache.current[ownerId] && prospectsCache.current[ownerId].length > 0) {
      return prospectsCache.current[ownerId];
    }
    
    if (fetchingRef.current.has(ownerId)) {
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
        .range(0, PAGE_SIZE - 1);
      
      if (error) {
        console.error('Error fetching shared prospects:', error);
        fetchingRef.current.delete(ownerId);
        return [];
      }
      
      if (data) {
        const decrypted = await Promise.all(
          data.map(p => decryptProspect(p as unknown as Prospect))
        );
        prospectsCache.current[ownerId] = decrypted;
        setSessionCache(CACHE_KEY, prospectsCache.current);
        fetchingRef.current.delete(ownerId);
        return decrypted;
      }
    } catch (err) {
      console.error('Error in fetchOwnerProspectsFirstPage:', err);
    }
    
    fetchingRef.current.delete(ownerId);
    return [];
  }, [decryptProspect]);

  // Load remaining prospects for an owner (progressive loading)
  const loadRemainingProspects = useCallback(async (ownerId: string) => {
    if (fullyLoadedOwners.current.has(ownerId)) return;
    
    const totalCount = prospectCounts[ownerId] || 0;
    const currentCount = prospectsCache.current[ownerId]?.length || 0;
    
    if (currentCount >= totalCount) {
      fullyLoadedOwners.current.add(ownerId);
      return;
    }
    
    setLoadingMore(true);
    
    try {
      let offset = currentCount;
      const allNewProspects: Prospect[] = [];
      
      while (offset < totalCount) {
        const { data, error } = await supabase
          .from('prospects')
          .select('*')
          .eq('user_id', ownerId)
          .order('date_added', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);
        
        if (error) {
          console.error('Error loading more prospects:', error);
          break;
        }
        
        if (!data || data.length === 0) break;
        
        const decrypted = await Promise.all(
          data.map(p => decryptProspect(p as unknown as Prospect))
        );
        
        allNewProspects.push(...decrypted);
        offset += data.length;
        
        if (data.length < PAGE_SIZE) break;
      }
      
      if (allNewProspects.length > 0) {
        const existing = prospectsCache.current[ownerId] || [];
        prospectsCache.current[ownerId] = [...existing, ...allNewProspects];
        setSessionCache(CACHE_KEY, prospectsCache.current);
        
        if (selectedOwnerIds.includes(ownerId)) {
          const allProspects = selectedOwnerIds.flatMap(id => prospectsCache.current[id] || []);
          allProspects.sort((a, b) => 
            new Date(b.date_added).getTime() - new Date(a.date_added).getTime()
          );
          setProspects(allProspects);
        }
      }
      
      fullyLoadedOwners.current.add(ownerId);
    } catch (err) {
      console.error('Error in loadRemainingProspects:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [prospectCounts, selectedOwnerIds, decryptProspect]);

  // Update combined prospects when selection changes
  const updateCombinedProspects = useCallback(async () => {
    const fetchId = ++currentFetchId.current;
    
    if (selectedOwnerIds.length === 0) {
      setProspects([]);
      setLoading(false);
      return;
    }
    
    // INSTANT: Check if we have ANY cached data for selected owners
    const hasCachedData = selectedOwnerIds.some(id => 
      prospectsCache.current[id] && prospectsCache.current[id].length > 0
    );
    
    if (hasCachedData) {
      // Show cached data IMMEDIATELY
      const cachedProspects = selectedOwnerIds.flatMap(id => prospectsCache.current[id] || []);
      cachedProspects.sort((a, b) => 
        new Date(b.date_added).getTime() - new Date(a.date_added).getTime()
      );
      setProspects(cachedProspects);
      setInitialLoading(false);
    } else {
      setLoading(true);
      setInitialLoading(true);
    }
    
    try {
      const ownersToFetch = selectedOwnerIds.filter(id => 
        !prospectsCache.current[id] || prospectsCache.current[id].length === 0
      );
      
      if (ownersToFetch.length > 0) {
        await Promise.all(
          ownersToFetch.map(ownerId => fetchOwnerProspectsFirstPage(ownerId))
        );
        
        if (fetchId !== currentFetchId.current) return;
        
        const allProspects = selectedOwnerIds.flatMap(id => prospectsCache.current[id] || []);
        allProspects.sort((a, b) => 
          new Date(b.date_added).getTime() - new Date(a.date_added).getTime()
        );
        setProspects(allProspects);
      }
      
      // Start progressive loading in background
      selectedOwnerIds.forEach(ownerId => {
        if (!fullyLoadedOwners.current.has(ownerId)) {
          loadRemainingProspects(ownerId);
        }
      });
      
    } catch (err) {
      console.error('Error updating combined prospects:', err);
      if (fetchId === currentFetchId.current) {
        setProspects([]);
      }
    } finally {
      if (fetchId === currentFetchId.current) {
        setLoading(false);
        setInitialLoading(false);
      }
    }
  }, [selectedOwnerIds, fetchOwnerProspectsFirstPage, loadRemainingProspects]);

  // Real-time subscriptions
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
          async () => {
            delete prospectsCache.current[ownerId];
            fullyLoadedOwners.current.delete(ownerId);
            
            const count = await fetchOwnerCount(ownerId);
            setProspectCounts(prev => ({ ...prev, [ownerId]: count }));
            
            const updatedProspects = await fetchOwnerProspectsFirstPage(ownerId);
            prospectsCache.current[ownerId] = updatedProspects;
            
            const allProspects = selectedOwnerIds.flatMap(id => prospectsCache.current[id] || []);
            allProspects.sort((a, b) => 
              new Date(b.date_added).getTime() - new Date(a.date_added).getTime()
            );
            setProspects(allProspects);
            
            loadRemainingProspects(ownerId);
          }
        )
        .subscribe();
    });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [selectedOwnerIds, fetchOwnerProspectsFirstPage, fetchOwnerCount, loadRemainingProspects]);

  // Initial fetch
  useEffect(() => {
    if (user && !initialLoadDone) {
      fetchSharedOwners().then(() => setInitialLoadDone(true));
    }
  }, [user, fetchSharedOwners, initialLoadDone]);

  // Update prospects when selection changes
  useEffect(() => {
    if (selectedOwnerIds.length === 0) {
      setProspects([]);
      setLoading(false);
      return;
    }
    
    updateCombinedProspects();
  }, [selectedOwnerIds, updateCombinedProspects]);

  const toggleOwnerSelection = useCallback((ownerId: string) => {
    setSelectedOwnerIds(prev => {
      if (prev.includes(ownerId)) {
        return prev.filter(id => id !== ownerId);
      } else {
        return [...prev, ownerId];
      }
    });
  }, []);

  const selectAllOwners = useCallback(() => {
    setSelectedOwnerIds(sharedOwners.map(o => o.user_id));
  }, [sharedOwners]);

  const clearSelection = useCallback(() => {
    currentFetchId.current++;
    setSelectedOwnerIds([]);
    setProspects([]);
    setLoading(false);
  }, []);

  const setSelectedOwnerId = useCallback((ownerId: string | null) => {
    currentFetchId.current++;
    if (ownerId) {
      setSelectedOwnerIds([ownerId]);
    } else {
      setSelectedOwnerIds([]);
      setProspects([]);
    }
  }, []);

  const selectedOwnerId = selectedOwnerIds.length === 1 ? selectedOwnerIds[0] : null;

  return {
    sharedOwners,
    selectedOwnerIds,
    selectedOwnerId,
    setSelectedOwnerId,
    setSelectedOwnerIds,
    toggleOwnerSelection,
    selectAllOwners,
    clearSelection,
    prospects,
    loading,
    initialLoading,
    loadingMore,
    prospectCounts,
    refetchOwners: fetchSharedOwners,
    refetchProspects: updateCombinedProspects
  };
}
