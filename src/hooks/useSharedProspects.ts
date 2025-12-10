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

export function useSharedProspects() {
  const { user } = useAuth();
  const { decryptFields } = useEncryption();
  const [sharedOwners, setSharedOwners] = useState<SharedOwner[]>([]);
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  // Cache for each owner's prospects to avoid re-fetching
  const prospectsCache = useRef<Record<string, Prospect[]>>({});
  const fetchingRef = useRef<Set<string>>(new Set());

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
          setSharedOwners(profiles.map(p => ({
            user_id: p.user_id,
            display_name: p.display_name || 'Unknown',
            nevorid: p.neverai_id
          })));
        }
      } else {
        setSharedOwners([]);
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
        .order('date_added', { ascending: false });
      
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
        fetchingRef.current.delete(ownerId);
        return decrypted;
      }
    } catch (err) {
      console.error('Error in fetchOwnerProspects:', err);
    }
    
    fetchingRef.current.delete(ownerId);
    return [];
  }, [decryptProspect]);

  // Update combined prospects when selection changes
  const updateCombinedProspects = useCallback(async () => {
    if (selectedOwnerIds.length === 0) {
      setProspects([]);
      return;
    }
    
    // Check if all data is cached - if so, show instantly without loading
    const allCached = selectedOwnerIds.every(id => prospectsCache.current[id]);
    
    if (allCached) {
      // Instantly show cached data
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
      
      // Combine all prospects
      const combined = allProspects.flat();
      
      // Sort by date_added descending
      combined.sort((a, b) => 
        new Date(b.date_added).getTime() - new Date(a.date_added).getTime()
      );
      
      setProspects(combined);
    } catch (err) {
      console.error('Error updating combined prospects:', err);
      setProspects([]);
    }
    
    setLoading(false);
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

  // Update prospects when selection changes
  useEffect(() => {
    updateCombinedProspects();
  }, [updateCombinedProspects]);

  // Toggle a single owner selection
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

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedOwnerIds([]);
    setProspects([]);
  }, []);

  // Legacy single-select API for backward compatibility
  const setSelectedOwnerId = useCallback((ownerId: string | null) => {
    if (ownerId) {
      setSelectedOwnerIds([ownerId]);
    } else {
      setSelectedOwnerIds([]);
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
