import { useEffect, useRef } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Hook to process pending upline email from share links.
 * Should be used in a component that renders after user is authenticated.
 */
export function useLeaderSetup() {
  const { user } = useAuth();
  const { profile, loading, updateUplineByEmail, updateProfile } = useProfile();
  const processedRef = useRef(false);

  useEffect(() => {
    // Only process once, when profile is loaded
    if (!user || loading || !profile || processedRef.current) return;

    const pendingUplineEmail = sessionStorage.getItem('pending_upline_email');
    if (!pendingUplineEmail) return;

    // Don't set if user already has an upline
    if (profile.upline_email || profile.leaders_id_of_my_leader) {
      sessionStorage.removeItem('pending_upline_email');
      return;
    }

    // Don't set if trying to set self as upline
    if (pendingUplineEmail.toLowerCase() === profile.email?.toLowerCase()) {
      sessionStorage.removeItem('pending_upline_email');
      return;
    }

    processedRef.current = true;

    // Process the pending upline email
    const processUpline = async () => {
      const result = await updateUplineByEmail(pendingUplineEmail);
      sessionStorage.removeItem('pending_upline_email');
      
      if (result.success) {
        // Also mark leader prompt as completed since they connected via share link
        await updateProfile({ leader_prompt_completed: true });
        toast.success(`Connected to upline: ${pendingUplineEmail}`);
      }
    };

    processUpline();
  }, [user, loading, profile, updateUplineByEmail, updateProfile]);
}
