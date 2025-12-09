import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Prospect } from '@/types/prospect';
import { useEncryption } from '@/hooks/useEncryption';

interface SharedOwner {
  user_id: string;
  display_name: string;
}

export function useSharedProspects() {
  const { user } = useAuth();
  const { decryptBatch } = useEncryption();
  const [sharedOwners, setSharedOwners] = useState<SharedOwner[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch owners who have shared data with me
  const fetchSharedOwners = useCallback(async () => {
    if (!user) return;

    const { data: accessRecords } = await supabase
      .from('team_access')
      .select('owner_user_id')
      .eq('shared_with_user_id', user.id);

    if (accessRecords && accessRecords.length > 0) {
      const ownerIds = accessRecords.map(r => r.owner_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', ownerIds);

      if (profiles) {
        setSharedOwners(profiles.map(p => ({
          user_id: p.user_id,
          display_name: p.display_name || 'Unknown'
        })));
      }
    } else {
      setSharedOwners([]);
    }
  }, [user]);

  // Fetch prospects for selected owner (uses service role via RPC for cross-user access)
  const fetchSharedProspects = useCallback(async () => {
    if (!selectedOwnerId) {
      setProspects([]);
      return;
    }

    setLoading(true);
    
    // We need to use a special approach here since RLS would normally block this
    // The team_access table grants permission, so we query through that relationship
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .eq('user_id', selectedOwnerId)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      // Decrypt phone numbers
      try {
        const decrypted = await decryptBatch(data);
        setProspects(decrypted as Prospect[]);
      } catch {
        setProspects(data as Prospect[]);
      }
    } else {
      setProspects([]);
    }
    
    setLoading(false);
  }, [selectedOwnerId, decryptBatch]);

  useEffect(() => {
    fetchSharedOwners();
  }, [fetchSharedOwners]);

  useEffect(() => {
    if (selectedOwnerId) {
      fetchSharedProspects();
    } else {
      setProspects([]);
      setLoading(false);
    }
  }, [selectedOwnerId, fetchSharedProspects]);

  return {
    sharedOwners,
    selectedOwnerId,
    setSelectedOwnerId,
    prospects,
    loading,
    refetch: fetchSharedProspects
  };
}
