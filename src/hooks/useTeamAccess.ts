import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Available tabs for permissions
export const AVAILABLE_TABS = ['calling', 'follow_up', 'activity', 'todo', 'track'] as const;
export type TabPermission = typeof AVAILABLE_TABS[number];

interface TeamMember {
  id: string;
  user_id: string;
  display_name: string | null;
  nevorid: string | null;
  email: string | null;
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
  owner_email?: string;
  allowed_tabs: TabPermission[] | null; // null means all tabs
}

interface PendingRequest {
  id: string;
  owner_user_id: string;
  owner_display_name: string | null;
  owner_nevorid: string | null;
  owner_email: string | null;
  created_at: string;
  allowed_tabs: TabPermission[] | null;
}

export function useTeamAccess() {
  const { user } = useAuth();
  const [myNevorId, setMyNevorId] = useState<string | null>(null);
  const [myDisplayName, setMyDisplayName] = useState<string | null>(null);
  const [myEmail, setMyEmail] = useState<string | null>(null);
  const [myLeaderCodeSeq, setMyLeaderCodeSeq] = useState<number | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<SharedAccess[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyProfile = useCallback(async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('neverai_id, display_name, leader_code_seq, email')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setMyNevorId(data.neverai_id);
      setMyDisplayName(data.display_name);
      setMyLeaderCodeSeq(data.leader_code_seq);
      setMyEmail(data.email);
    }
  }, [user]);

  // Fetch people I'm sharing my data WITH (I am owner, they are viewer) - ACTIVE only
  const fetchTeamMembers = useCallback(async () => {
    if (!user) return;
    
    const { data: accessRecords } = await supabase
      .from('team_access')
      .select('id, shared_with_user_id, status, allowed_tabs')
      .eq('owner_user_id', user.id)
      .eq('status', 'active');
    
    if (accessRecords && accessRecords.length > 0) {
      const userIds = accessRecords.map(r => r.shared_with_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, neverai_id, email')
        .in('user_id', userIds);
      
      if (profiles) {
        setTeamMembers(profiles.map(p => {
          const record = accessRecords.find(r => r.shared_with_user_id === p.user_id);
          return {
            id: record?.id || '',
            user_id: p.user_id,
            display_name: p.display_name,
            nevorid: p.neverai_id,
            email: p.email,
            status: record?.status || 'active',
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
        .select('user_id, display_name, neverai_id, email')
        .in('user_id', ownerIds);
      
      if (profiles) {
        setSharedWithMe(accessRecords.map(r => ({
          ...r,
          shared_with_user_id: user.id,
          owner_display_name: profiles.find(p => p.user_id === r.owner_user_id)?.display_name || 'Unknown',
          owner_nevorid: profiles.find(p => p.user_id === r.owner_user_id)?.neverai_id || '',
          owner_email: profiles.find(p => p.user_id === r.owner_user_id)?.email || '',
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
        .select('user_id, display_name, neverai_id, email')
        .in('user_id', ownerIds);
      
      if (profiles) {
        setPendingRequests(accessRecords.map(r => ({
          id: r.id,
          owner_user_id: r.owner_user_id,
          owner_display_name: profiles.find(p => p.user_id === r.owner_user_id)?.display_name || 'Unknown',
          owner_nevorid: profiles.find(p => p.user_id === r.owner_user_id)?.neverai_id || null,
          owner_email: profiles.find(p => p.user_id === r.owner_user_id)?.email || null,
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

  // Share with upline by email (PRIMARY method)
  const shareWithUpline = async (uplineEmail: string, allowedTabs?: TabPermission[] | null) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    // Look up upline by email
    const { data: foundUser, error: lookupError } = await supabase
      .rpc('get_user_by_email', { target_email: uplineEmail.trim().toLowerCase() });
    
    if (lookupError || !foundUser || foundUser.length === 0) {
      return { success: false, error: 'No user found with this email address' };
    }

    const uplineUserId = foundUser[0].user_id;
    const uplineName = foundUser[0].display_name || uplineEmail;
    
    if (uplineUserId === user.id) {
      return { success: false, error: 'Cannot share with yourself' };
    }

    // Check if already exists
    const { data: existing } = await supabase
      .from('team_access')
      .select('id, status')
      .eq('owner_user_id', user.id)
      .eq('shared_with_user_id', uplineUserId)
      .maybeSingle();
    
    if (existing) {
      if (existing.status === 'active') {
        return { success: false, error: 'Already sharing with this upline' };
      }
      // If pending or revoked, update to active
      const { error } = await supabase
        .from('team_access')
        .update({ status: 'active', allowed_tabs: allowedTabs === undefined ? null : allowedTabs })
        .eq('id', existing.id);
      
      if (error) return { success: false, error: 'Failed to connect with upline' };
      
      await sendConnectionNotification(uplineUserId);
      await fetchTeamMembers();
      toast.success(`Connected with ${uplineName}`);
      return { success: true };
    }

    // Create new share
    const { error } = await supabase
      .from('team_access')
      .insert({
        owner_user_id: user.id,
        shared_with_user_id: uplineUserId,
        status: 'active',
        allowed_tabs: allowedTabs === undefined ? null : allowedTabs
      });

    if (error) return { success: false, error: 'Failed to connect with upline' };

    await sendConnectionNotification(uplineUserId);
    await fetchTeamMembers();
    toast.success(`Connected with ${uplineName}`);
    return { success: true };
  };

  // Send notification to upline when someone connects
  const sendConnectionNotification = async (uplineUserId: string) => {
    try {
      const memberName = myDisplayName || 'A team member';
      const memberEmail = myEmail || '';
      
      await supabase
        .from('inbox_messages')
        .insert({
          sender_user_id: user!.id,
          recipient_user_id: uplineUserId,
          title: 'New Team Connection',
          body: `${memberName} (${memberEmail}) has connected with you and is now sharing their Follow Up list.`,
          message_type: 'team_connection',
          deep_link_route: '/listup'
        });
    } catch (err) {
      console.error('Failed to send connection notification:', err);
    }
  };

  // Legacy function - kept for backward compatibility
  const shareWithLeader = async (leaderNeveraiId: string, allowedTabs?: TabPermission[] | null) => {
    // Redirect to email-based lookup
    console.warn('shareWithLeader is deprecated, use shareWithUpline instead');
    return { success: false, error: 'Please use email address instead of Leader ID' };
  };

  // Upline accepts a pending share request
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
    toast.success('Share request accepted. You can now view their Follow Up list.');
    return true;
  };

  // Upline rejects/ignores a pending share request
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

  // Member stops sharing with an upline
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
    toast.success('Stopped sharing your Follow Up list');
    return true;
  };

  // Upline removes a member from their team view
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
    myEmail,
    myLeaderCodeSeq,
    teamMembers,
    sharedWithMe,
    pendingRequests,
    loading,
    shareWithLeader,
    shareWithUpline,
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
