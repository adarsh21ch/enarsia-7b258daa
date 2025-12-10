import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Available tabs for permissions
export const AVAILABLE_TABS = ['calling', 'follow_up', 'activity', 'todo'] as const;
export type TabPermission = typeof AVAILABLE_TABS[number];

interface TeamMember {
  id: string;
  user_id: string;
  display_name: string | null;
  nevorid: string | null;
  status: string;
  allowed_tabs: TabPermission[] | null; // null means all tabs
}

interface SharedAccess {
  id: string;
  owner_user_id: string;
  shared_with_user_id: string;
  created_at: string;
  status: string;
  owner_display_name?: string;
  owner_nevorid?: string;
  allowed_tabs: TabPermission[] | null; // null means all tabs
}

interface PendingRequest {
  id: string;
  owner_user_id: string;
  owner_display_name: string | null;
  owner_nevorid: string | null;
  created_at: string;
  allowed_tabs: TabPermission[] | null;
}

export function useTeamAccess() {
  const { user } = useAuth();
  const [myNevorId, setMyNevorId] = useState<string | null>(null);
  const [myDisplayName, setMyDisplayName] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<SharedAccess[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyProfile = useCallback(async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('neverai_id, display_name')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setMyNevorId(data.neverai_id);
      setMyDisplayName(data.display_name);
    }
  }, [user]);

  // Fetch people I'm sharing my data WITH (I am owner, they are viewer)
  const fetchTeamMembers = useCallback(async () => {
    if (!user) return;
    
    const { data: accessRecords } = await supabase
      .from('team_access')
      .select('id, shared_with_user_id, status, allowed_tabs')
      .eq('owner_user_id', user.id)
      .in('status', ['pending', 'active']);
    
    if (accessRecords && accessRecords.length > 0) {
      const userIds = accessRecords.map(r => r.shared_with_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, neverai_id')
        .in('user_id', userIds);
      
      if (profiles) {
        setTeamMembers(profiles.map(p => {
          const record = accessRecords.find(r => r.shared_with_user_id === p.user_id);
          return {
            id: record?.id || '',
            user_id: p.user_id,
            display_name: p.display_name,
            nevorid: p.neverai_id,
            status: record?.status || 'pending',
            allowed_tabs: record?.allowed_tabs as TabPermission[] | null
          };
        }));
      }
    } else {
      setTeamMembers([]);
    }
  }, [user]);

  // Fetch people who are sharing their data with me (they are owner, I am viewer) - ACTIVE only
  const fetchSharedWithMe = useCallback(async () => {
    if (!user) return;
    
    const { data: accessRecords } = await supabase
      .from('team_access')
      .select('id, owner_user_id, created_at, status, allowed_tabs')
      .eq('shared_with_user_id', user.id)
      .eq('status', 'active');
    
    if (accessRecords && accessRecords.length > 0) {
      const ownerIds = accessRecords.map(r => r.owner_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, neverai_id')
        .in('user_id', ownerIds);
      
      if (profiles) {
        setSharedWithMe(accessRecords.map(r => ({
          ...r,
          shared_with_user_id: user.id,
          owner_display_name: profiles.find(p => p.user_id === r.owner_user_id)?.display_name || 'Unknown',
          owner_nevorid: profiles.find(p => p.user_id === r.owner_user_id)?.neverai_id || '',
          allowed_tabs: r.allowed_tabs as TabPermission[] | null
        })));
      }
    } else {
      setSharedWithMe([]);
    }
  }, [user]);

  // Fetch pending requests where someone wants to share with me (I need to accept)
  const fetchPendingRequests = useCallback(async () => {
    if (!user) return;
    
    const { data: accessRecords } = await supabase
      .from('team_access')
      .select('id, owner_user_id, created_at, allowed_tabs')
      .eq('shared_with_user_id', user.id)
      .eq('status', 'pending');
    
    if (accessRecords && accessRecords.length > 0) {
      const ownerIds = accessRecords.map(r => r.owner_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, neverai_id')
        .in('user_id', ownerIds);
      
      if (profiles) {
        setPendingRequests(accessRecords.map(r => ({
          id: r.id,
          owner_user_id: r.owner_user_id,
          owner_display_name: profiles.find(p => p.user_id === r.owner_user_id)?.display_name || 'Unknown',
          owner_nevorid: profiles.find(p => p.user_id === r.owner_user_id)?.neverai_id || null,
          created_at: r.created_at,
          allowed_tabs: r.allowed_tabs as TabPermission[] | null
        })));
      }
    } else {
      setPendingRequests([]);
    }
  }, [user]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchMyProfile(), 
      fetchTeamMembers(), 
      fetchSharedWithMe(),
      fetchPendingRequests()
    ]);
    setLoading(false);
  }, [fetchMyProfile, fetchTeamMembers, fetchSharedWithMe, fetchPendingRequests]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Member initiates sharing with a leader by entering leader's NevorID
  const shareWithLeader = async (leaderNevorId: string, allowedTabs?: TabPermission[] | null) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    // Look up leader by NevorID
    const { data: foundUser, error: lookupError } = await supabase
      .rpc('get_user_by_neverai_id', { target_neverai_id: leaderNevorId });
    
    if (lookupError || !foundUser || foundUser.length === 0) {
      return { success: false, error: 'NevorID not found' };
    }

    const leaderUserId = foundUser[0].user_id;
    const leaderName = foundUser[0].display_name || 'Leader';
    
    if (leaderUserId === user.id) {
      return { success: false, error: 'Cannot share with yourself' };
    }

    // Check if already exists
    const { data: existing } = await supabase
      .from('team_access')
      .select('id, status')
      .eq('owner_user_id', user.id)
      .eq('shared_with_user_id', leaderUserId)
      .maybeSingle();
    
    if (existing) {
      if (existing.status === 'active') {
        return { success: false, error: 'Already sharing with this leader' };
      }
      if (existing.status === 'pending') {
        return { success: false, error: 'Share request already pending' };
      }
      // If revoked, update back to pending with new tab permissions
      if (existing.status === 'revoked') {
        const { error } = await supabase
          .from('team_access')
          .update({ 
            status: 'pending',
            allowed_tabs: allowedTabs === undefined ? null : allowedTabs
          })
          .eq('id', existing.id);
        
        if (error) {
          return { success: false, error: 'Failed to send share request' };
        }
        
        await fetchTeamMembers();
        toast.success(`Share request sent to ${leaderName}`);
        return { success: true };
      }
    }

    // Create new share request with allowed_tabs (null means all tabs)
    const { error } = await supabase
      .from('team_access')
      .insert({
        owner_user_id: user.id,
        shared_with_user_id: leaderUserId,
        status: 'pending',
        allowed_tabs: allowedTabs === undefined ? null : allowedTabs
      });

    if (error) {
      return { success: false, error: 'Failed to send share request' };
    }

    await fetchTeamMembers();
    toast.success(`Share request sent to ${leaderName}. They must accept before they can view your data.`);
    return { success: true };
  };

  // Leader accepts a pending share request
  const acceptShareRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('team_access')
      .update({ status: 'active' })
      .eq('id', requestId);

    if (error) {
      toast.error('Failed to accept request');
      return false;
    }

    await Promise.all([fetchSharedWithMe(), fetchPendingRequests()]);
    toast.success('Share request accepted. You can now view their data.');
    return true;
  };

  // Leader rejects/ignores a pending share request
  const rejectShareRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('team_access')
      .update({ status: 'revoked' })
      .eq('id', requestId);

    if (error) {
      toast.error('Failed to reject request');
      return false;
    }

    await fetchPendingRequests();
    toast.success('Share request declined');
    return true;
  };

  // Member stops sharing with a leader
  const stopSharingWithLeader = async (accessId: string) => {
    const { error } = await supabase
      .from('team_access')
      .update({ status: 'revoked' })
      .eq('id', accessId);

    if (error) {
      toast.error('Failed to stop sharing');
      return false;
    }

    await fetchTeamMembers();
    toast.success('Stopped sharing your data');
    return true;
  };

  // Leader removes a member from their team view
  const removeFromTeam = async (accessId: string) => {
    const { error } = await supabase
      .from('team_access')
      .update({ status: 'revoked' })
      .eq('id', accessId);

    if (error) {
      toast.error('Failed to remove from team');
      return false;
    }

    await fetchSharedWithMe();
    toast.success('Removed from your team view');
    return true;
  };

  // Legacy function for backward compatibility
  const addTeamMember = async (nevorId: string) => {
    return shareWithLeader(nevorId);
  };

  const removeTeamMember = async (accessId: string) => {
    return stopSharingWithLeader(accessId);
  };

  // Update tab permissions for a team member (owner can control what viewer sees)
  const updateTabPermissions = async (accessId: string, allowedTabs: TabPermission[] | null) => {
    const { error } = await supabase
      .from('team_access')
      .update({ allowed_tabs: allowedTabs })
      .eq('id', accessId);

    if (error) {
      toast.error('Failed to update permissions');
      return false;
    }

    await fetchTeamMembers();
    toast.success('Permissions updated');
    return true;
  };

  return {
    myNevorId,
    myDisplayName,
    teamMembers,
    sharedWithMe,
    pendingRequests,
    loading,
    shareWithLeader,
    acceptShareRequest,
    rejectShareRequest,
    stopSharingWithLeader,
    removeFromTeam,
    addTeamMember,
    removeTeamMember,
    updateTabPermissions,
    refetch
  };
}
