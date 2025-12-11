import { useEffect, useRef } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Hook to process pending leader ID from share links.
 * Should be used in a component that renders after user is authenticated.
 */
export function useLeaderSetup() {
  const { user } = useAuth();
  const { profile, loading, updateLeaderHierarchy } = useProfile();
  const processedRef = useRef(false);

  useEffect(() => {
    // Only process once, when profile is loaded
    if (!user || loading || !profile || processedRef.current) return;

    const pendingLeaderId = sessionStorage.getItem('pending_leader_id');
    if (!pendingLeaderId) return;

    // Don't set if user already has a leader
    if (profile.leaders_id_of_my_leader) {
      sessionStorage.removeItem('pending_leader_id');
      return;
    }

    // Don't set if trying to set self as leader
    if (pendingLeaderId.toUpperCase() === profile.neverai_id?.toUpperCase()) {
      sessionStorage.removeItem('pending_leader_id');
      return;
    }

    processedRef.current = true;

    // Process the pending leader ID
    const processLeader = async () => {
      const result = await updateLeaderHierarchy(pendingLeaderId);
      sessionStorage.removeItem('pending_leader_id');
      
      if (result.success) {
        toast.success(`Connected to leader: ${pendingLeaderId}`);
      }
    };

    processLeader();
  }, [user, loading, profile, updateLeaderHierarchy]);
}
