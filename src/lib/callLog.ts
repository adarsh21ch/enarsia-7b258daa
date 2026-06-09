// Lightweight call-history logger.
// Records every outbound call the user makes from inside the app
// into activity_logs (activity_type = 'call_made') so the
// Follow-up → Activity tab can show an iPhone-Recents-style timeline.

import { supabase } from '@/integrations/supabase/client';

interface LogCallOpts {
  prospectId?: string | null;
  name: string;
  phone: string;
}

export async function logCallMade({ prospectId, name, phone }: LogCallOpts) {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId || !phone) return;

    await supabase.from('activity_logs').insert({
      user_id: userId,
      prospect_id: prospectId || null,
      activity_type: 'call_made',
      description: name || 'Call',
      new_value: phone,
    });
  } catch (err) {
    // Non-blocking: never let logging break the call action
    console.error('logCallMade failed:', err);
  }
}
