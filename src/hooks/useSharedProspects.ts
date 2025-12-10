import { useState, useEffect, useCallback } from 'react';
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
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch list of users who have shared their data with me (ACTIVE only)
  const fetchSharedOwners = useCallback(async () => {
    if (!user) return;
    
    const { data: accessRecords } = await supabase
      .from('team_access')
      .select('owner_user_id')
      .eq('shared_with_user_id', user.id)
      .eq('status', 'active');
    
    if (accessRecords && accessRecords.length > 0) {
      const ownerIds = accessRecords.map(r => r.owner_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, neverai_id')
        .in('user_id', ownerIds);
      
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
  }, [user]);

  // Fetch prospects belonging to the selected owner
  const fetchSharedProspects = useCallback(async () => {
    if (!selectedOwnerId) {
      setProspects([]);
      return;
    }
    
    setLoading(true);
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .eq('user_id', selectedOwnerId)
      .order('date_added', { ascending: false });
    
    if (error) {
      console.error('Error fetching shared prospects:', error);
      setProspects([]);
    } else if (data) {
      // Attempt to decrypt phone numbers
      const decrypted = await Promise.all(data.map(async (p) => {
        try {
          if (p.phone && p.phone.includes(':')) {
            const result = await decryptFields({ phone: p.phone });
            return { ...p, phone: result?.phone || p.phone };
          }
        } catch {
          // Keep original if decryption fails
        }
        return p;
      }));
      setProspects(decrypted as Prospect[]);
    }
    setLoading(false);
  }, [selectedOwnerId, decryptFields]);

  // Set up real-time subscription for the selected owner's prospects
  useEffect(() => {
    if (!selectedOwnerId) return;

    const channel = supabase
      .channel(`shared-prospects-${selectedOwnerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prospects',
          filter: `user_id=eq.${selectedOwnerId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newProspect = payload.new as Prospect;
            // Decrypt if needed
            if (newProspect.phone && newProspect.phone.includes(':')) {
              try {
                const result = await decryptFields({ phone: newProspect.phone });
                newProspect.phone = result?.phone || newProspect.phone;
              } catch {
                // Keep original
              }
            }
            setProspects(prev => [newProspect, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedProspect = payload.new as Prospect;
            if (updatedProspect.phone && updatedProspect.phone.includes(':')) {
              try {
                const result = await decryptFields({ phone: updatedProspect.phone });
                updatedProspect.phone = result?.phone || updatedProspect.phone;
              } catch {
                // Keep original
              }
            }
            setProspects(prev => 
              prev.map(p => p.id === updatedProspect.id ? updatedProspect : p)
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedProspect = payload.old as Prospect;
            setProspects(prev => prev.filter(p => p.id !== deletedProspect.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedOwnerId, decryptFields]);

  useEffect(() => {
    fetchSharedOwners();
  }, [fetchSharedOwners]);

  useEffect(() => {
    fetchSharedProspects();
  }, [fetchSharedProspects]);

  return {
    sharedOwners,
    selectedOwnerId,
    setSelectedOwnerId,
    prospects,
    loading,
    refetchOwners: fetchSharedOwners,
    refetchProspects: fetchSharedProspects
  };
}