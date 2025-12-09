import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  user_id: string;
  display_name: string | null;
  neverai_id: string | null;
}

interface SharedAccess {
  id: string;
  owner_user_id: string;
  shared_with_user_id: string;
  created_at: string;
  owner_display_name?: string;
}

export function useTeamAccess() {
  const { user } = useAuth();
  const [myNeveraiId, setMyNeveraiId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<SharedAccess[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyProfile = useCallback(async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('neverai_id')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setMyNeveraiId(data.neverai_id);
    }
  }, [user]);

  const fetchTeamMembers = useCallback(async () => {
    if (!user) return;
    
    // Get users I've shared my data with
    const { data: accessRecords } = await supabase
      .from('team_access')
      .select('id, shared_with_user_id')
      .eq('owner_user_id', user.id);
    
    if (accessRecords && accessRecords.length > 0) {
      const userIds = accessRecords.map(r => r.shared_with_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, neverai_id')
        .in('user_id', userIds);
      
      if (profiles) {
        setTeamMembers(profiles.map(p => ({
          id: accessRecords.find(r => r.shared_with_user_id === p.user_id)?.id || '',
          user_id: p.user_id,
          display_name: p.display_name,
          neverai_id: p.neverai_id
        })));
      }
    } else {
      setTeamMembers([]);
    }
  }, [user]);

  const fetchSharedWithMe = useCallback(async () => {
    if (!user) return;
    
    // Get users who have shared their data with me
    const { data: accessRecords } = await supabase
      .from('team_access')
      .select('id, owner_user_id, created_at')
      .eq('shared_with_user_id', user.id);
    
    if (accessRecords && accessRecords.length > 0) {
      const ownerIds = accessRecords.map(r => r.owner_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', ownerIds);
      
      if (profiles) {
        setSharedWithMe(accessRecords.map(r => ({
          ...r,
          shared_with_user_id: user.id,
          owner_display_name: profiles.find(p => p.user_id === r.owner_user_id)?.display_name || 'Unknown'
        })));
      }
    } else {
      setSharedWithMe([]);
    }
  }, [user]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMyProfile(), fetchTeamMembers(), fetchSharedWithMe()]);
    setLoading(false);
  }, [fetchMyProfile, fetchTeamMembers, fetchSharedWithMe]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addTeamMember = async (neveraiId: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    // Look up user by NeverAI ID
    const { data: foundUser, error: lookupError } = await supabase
      .rpc('get_user_by_neverai_id', { target_neverai_id: neveraiId });
    
    if (lookupError || !foundUser || foundUser.length === 0) {
      return { success: false, error: 'User not found with this NeverAI ID' };
    }

    const targetUserId = foundUser[0].user_id;
    
    if (targetUserId === user.id) {
      return { success: false, error: 'Cannot add yourself' };
    }

    // Check if already added
    const existing = teamMembers.find(m => m.user_id === targetUserId);
    if (existing) {
      return { success: false, error: 'This user already has access' };
    }

    const { error } = await supabase
      .from('team_access')
      .insert({
        owner_user_id: user.id,
        shared_with_user_id: targetUserId
      });

    if (error) {
      return { success: false, error: 'Failed to add team member' };
    }

    await fetchTeamMembers();
    toast.success('Team member added');
    return { success: true };
  };

  const removeTeamMember = async (accessId: string) => {
    const { error } = await supabase
      .from('team_access')
      .delete()
      .eq('id', accessId);

    if (error) {
      toast.error('Failed to remove team member');
      return false;
    }

    await fetchTeamMembers();
    toast.success('Team member removed');
    return true;
  };

  return {
    myNeveraiId,
    teamMembers,
    sharedWithMe,
    loading,
    addTeamMember,
    removeTeamMember,
    refetch
  };
}
