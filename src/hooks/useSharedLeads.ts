import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Prospect } from '@/types/prospect';

export interface SharedLeadRecord {
  id: string;
  sender_id: string;
  receiver_id: string;
  lead_data: any[];
  status: string;
  created_at: string;
  imported_at: string | null;
  sender_name?: string;
}

export function useSharedLeads() {
  const { user } = useAuth();
  const [pendingShares, setPendingShares] = useState<SharedLeadRecord[]>([]);
  const [sentShares, setSentShares] = useState<SharedLeadRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShares = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    // Fetch received (pending) shares
    const { data: received } = await supabase
      .from('shared_leads')
      .select('*')
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false });

    // Fetch sent shares
    const { data: sent } = await supabase
      .from('shared_leads')
      .select('*')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false });

    // Resolve sender names for received shares
    if (received && received.length > 0) {
      const senderIds = [...new Set(received.map(r => r.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', senderIds);

      const nameMap: Record<string, string> = {};
      profiles?.forEach(p => { nameMap[p.user_id] = p.display_name || 'Unknown'; });

      setPendingShares(received.map(r => ({
        ...r,
        lead_data: Array.isArray(r.lead_data) ? r.lead_data : [],
        sender_name: nameMap[r.sender_id] || 'Unknown'
      })));
    } else {
      setPendingShares([]);
    }

    setSentShares((sent || []).map(s => ({
      ...s,
      lead_data: Array.isArray(s.lead_data) ? s.lead_data : []
    })));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchShares(); }, [fetchShares]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('shared_leads_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shared_leads',
        filter: `receiver_id=eq.${user.id}`
      }, () => { fetchShares(); })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shared_leads',
        filter: `sender_id=eq.${user.id}`
      }, () => { fetchShares(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchShares]);

  const pendingCount = pendingShares.filter(s => s.status === 'pending').length;

  const shareLeads = async (receiverIds: string[], leads: Prospect[], sheetName?: string) => {
    if (!user) return false;

    const leadSnapshots = leads.map(l => ({
      name: l.name,
      phone: l.phone,
      address: l.address || null,
      age_or_dob: l.age_or_dob || null,
      gender: l.gender || null,
      instagram: l.instagram || null,
      profession: l.profession || null,
      notes: l.notes || null,
      why_need: l.why_need || null,
      priority: l.priority || null,
      sheet_name: sheetName || null,
    }));

    const rows = receiverIds.map(receiverId => ({
      sender_id: user.id,
      receiver_id: receiverId,
      lead_data: leadSnapshots,
      status: 'pending'
    }));

    const { error } = await supabase
      .from('shared_leads')
      .insert(rows);

    if (error) {
      console.error('Error sharing leads:', error);
      return false;
    }
    return true;
  };

  const importSharedLeads = async (shareId: string) => {
    if (!user) return { imported: 0, skipped: 0 };

    const share = pendingShares.find(s => s.id === shareId);
    if (!share || !Array.isArray(share.lead_data)) return { imported: 0, skipped: 0 };

    // Get existing phones to detect duplicates
    const { data: existing } = await supabase
      .from('prospects')
      .select('phone')
      .eq('user_id', user.id);

    const existingPhones = new Set(
      (existing || []).map(e => e.phone?.replace(/\s+/g, '').toLowerCase())
    );

    const toImport: any[] = [];
    let skipped = 0;

    for (const lead of share.lead_data) {
      const normalizedPhone = lead.phone?.replace(/\s+/g, '').toLowerCase();
      if (normalizedPhone && existingPhones.has(normalizedPhone)) {
        skipped++;
        continue;
      }
      toImport.push({
        user_id: user.id,
        name: lead.name || 'Unknown',
        phone: lead.phone || '',
        address: lead.address || null,
        age_or_dob: lead.age_or_dob || null,
        gender: lead.gender || null,
        instagram: lead.instagram || null,
        profession: lead.profession || null,
        why_need: lead.why_need || null,
        priority: lead.priority || null,
        notes: lead.notes
          ? `${lead.notes}\nShared by ${share.sender_name || 'Team Member'}`
          : `Shared by ${share.sender_name || 'Team Member'}`,
      });
    }

    // Determine sheet for import - use original sheet name with * marker
    let targetSheetId: string | null = null;
    const originalSheetName = share.lead_data?.[0]?.sheet_name;
    if (originalSheetName) {
      const markedName = `${originalSheetName} *`;
      // Check if sheet already exists
      const { data: existingSheet } = await supabase
        .from('sheets')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', markedName)
        .maybeSingle();

      if (existingSheet) {
        targetSheetId = existingSheet.id;
      } else {
        // Create new sheet with * marker
        const { data: newSheet } = await supabase
          .from('sheets')
          .insert({ name: markedName, user_id: user.id })
          .select('id')
          .single();
        if (newSheet) targetSheetId = newSheet.id;
      }
    }

    // Add sheet_id to imports if we have a target sheet
    if (targetSheetId) {
      toImport.forEach(item => { item.sheet_id = targetSheetId; });
    }

    let imported = 0;
    if (toImport.length > 0) {
      const { error } = await supabase
        .from('prospects')
        .insert(toImport);

      if (!error) {
        imported = toImport.length;
      } else {
        console.error('Error importing shared leads:', error);
      }
    }

    // Mark as imported
    if (imported > 0 || skipped === share.lead_data.length) {
      await supabase
        .from('shared_leads')
        .update({ status: 'imported', imported_at: new Date().toISOString() })
        .eq('id', shareId);
    }

    await fetchShares();
    return { imported, skipped };
  };

  const deleteShare = async (shareId: string) => {
    const { error } = await supabase
      .from('shared_leads')
      .delete()
      .eq('id', shareId);

    if (error) {
      console.error('Error deleting shared lead:', error);
      return false;
    }
    await fetchShares();
    return true;
  };

  return {
    pendingShares,
    sentShares,
    pendingCount,
    loading,
    shareLeads,
    importSharedLeads,
    deleteShare,
    refetch: fetchShares
  };
}
