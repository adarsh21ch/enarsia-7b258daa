// Lightweight prospect-action logger.
// Records every outbound action the user takes on a prospect
// (call, WhatsApp, SMS, tag/stage change) into activity_logs so the
// Follow-up → Activity tab can show an iPhone-Recents-style timeline.

import { supabase } from '@/integrations/supabase/client';

interface BaseOpts {
  prospectId?: string | null;
  name: string;
  phone?: string | null;
}

async function insertLog(payload: {
  prospect_id: string | null;
  activity_type: string;
  description: string;
  new_value?: string | null;
  old_value?: string | null;
}) {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return;

    await supabase.from('activity_logs').insert({
      user_id: userId,
      prospect_id: payload.prospect_id,
      activity_type: payload.activity_type,
      description: payload.description,
      new_value: payload.new_value ?? null,
      old_value: payload.old_value ?? null,
    });
  } catch (err) {
    // Non-blocking: never let logging break the user action
    console.error(`activity log (${payload.activity_type}) failed:`, err);
  }
}

export async function logCallMade({ prospectId, name, phone }: BaseOpts) {
  if (!phone) return;
  await insertLog({
    prospect_id: prospectId || null,
    activity_type: 'call_made',
    description: name || 'Call',
    new_value: phone,
  });
}

export async function logWhatsAppSent({ prospectId, name, phone }: BaseOpts) {
  if (!phone) return;
  await insertLog({
    prospect_id: prospectId || null,
    activity_type: 'whatsapp_sent',
    description: name || 'WhatsApp',
    new_value: phone,
  });
}

export async function logSmsSent({ prospectId, name, phone }: BaseOpts) {
  if (!phone) return;
  await insertLog({
    prospect_id: prospectId || null,
    activity_type: 'sms_sent',
    description: name || 'Text',
    new_value: phone,
  });
}

export async function logTagChange(opts: {
  prospectId: string;
  name: string;
  field: 'response' | 'stage';
  oldValue: string | null;
  newValue: string | null;
}) {
  // Skip no-op changes
  if ((opts.oldValue || '') === (opts.newValue || '')) return;
  const activityType = opts.field === 'response' ? 'response_tag_set' : 'stage_tag_set';
  await insertLog({
    prospect_id: opts.prospectId,
    activity_type: activityType,
    description: opts.name || (opts.field === 'response' ? 'Response tag' : 'Stage'),
    new_value: opts.newValue || null,
    old_value: opts.oldValue || null,
  });
}
