import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Runs once on first login to seed the user's account with 50 demo leads,
 * default tags, daily tasks and follow-up activity. Server-side RPC is
 * idempotent (guarded by profiles.demo_data_created), so calling it twice
 * is safe; we additionally guard with a session flag.
 */
export function useDemoSeed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!user || attemptedRef.current) return;

    let cancelled = false;
    (async () => {
      try {
        // Pre-check profile so we avoid pointless RPC calls.
        const { data: profile } = await supabase
          .from('profiles')
          .select('demo_data_created')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cancelled) return;
        if (!profile || profile.demo_data_created) {
          attemptedRef.current = true;
          return;
        }

        attemptedRef.current = true;
        const { data, error } = await supabase.rpc('seed_demo_data_for_user', {
          p_user_id: user.id,
        });

        if (error) {
          console.warn('[demo-seed] RPC failed:', error.message);
          return;
        }

        const result = data as { success?: boolean; seeded?: number; skipped?: boolean } | null;
        if (result?.success && result.seeded && result.seeded > 0) {
          // Refresh anything that depends on prospects / activity / tasks / profile
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['profile', user.id] }),
            queryClient.invalidateQueries({ queryKey: ['prospects'] }),
            queryClient.invalidateQueries({ queryKey: ['sheets'] }),
            queryClient.invalidateQueries({ queryKey: ['activity_logs'] }),
            queryClient.invalidateQueries({ queryKey: ['user_daily_tasks'] }),
            queryClient.invalidateQueries({ queryKey: ['todos'] }),
            queryClient.invalidateQueries({ queryKey: ['custom_options'] }),
            queryClient.invalidateQueries({ queryKey: ['tracking'] }),
          ]);
        }
      } catch (e) {
        console.warn('[demo-seed] unexpected:', e);
      }
    })();

    return () => { cancelled = true; };
  }, [user, queryClient]);
}
