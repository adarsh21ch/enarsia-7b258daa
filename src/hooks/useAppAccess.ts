/**
 * Hook to record and track app access for NevorAI
 * This enables app-specific user counting for admin dashboards
 */
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const APP_ID = 'neverai';

export function useAppAccess() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Record app access on mount (when user loads the app)
    const recordAccess = async () => {
      try {
        await supabase.rpc('record_app_access', { p_app: APP_ID });
      } catch (error) {
        // Silently fail - this is analytics, not critical
        console.debug('Failed to record app access:', error);
      }
    };

    recordAccess();
  }, [user]);
}
