import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface FunnelRow {
  id?: string;
  funnel_number: number;
  day_1: number;
  day_2: number;
  minimum_billing: number;
  level_up: number;
  two_cc: number;
}

export function useFunnelTracking() {
  const [rows, setRows] = useState<FunnelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('funnel_tracking')
      .select('*')
      .eq('user_id', user.id)
      .order('funnel_number', { ascending: true });

    if (error) {
      toast({ title: 'Error fetching funnel data', variant: 'destructive' });
    } else {
      // Initialize with 3 rows if empty
      if (!data || data.length === 0) {
        const initialRows: FunnelRow[] = [1, 2, 3].map(num => ({
          funnel_number: num,
          day_1: 0,
          day_2: 0,
          minimum_billing: 0,
          level_up: 0,
          two_cc: 0,
        }));
        setRows(initialRows);
      } else {
        setRows(data.map(row => ({
          id: row.id,
          funnel_number: row.funnel_number,
          day_1: row.day_1 || 0,
          day_2: row.day_2 || 0,
          minimum_billing: row.minimum_billing || 0,
          level_up: row.level_up || 0,
          two_cc: row.two_cc || 0,
        })));
      }
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateCell = async (funnelNumber: number, field: keyof FunnelRow, value: number) => {
    if (!user) return;

    const rowIndex = rows.findIndex(r => r.funnel_number === funnelNumber);
    const existingRow = rows[rowIndex];

    // Update local state immediately
    setRows(prev => prev.map(r => 
      r.funnel_number === funnelNumber ? { ...r, [field]: value } : r
    ));

    if (existingRow?.id) {
      // Update existing row
      const { error } = await supabase
        .from('funnel_tracking')
        .update({ [field]: value })
        .eq('id', existingRow.id);

      if (error) {
        toast({ title: 'Error saving', variant: 'destructive' });
        fetchData(); // Revert on error
      }
    } else {
      // Insert new row
      const newRow = {
        user_id: user.id,
        funnel_number: funnelNumber,
        day_1: field === 'day_1' ? value : 0,
        day_2: field === 'day_2' ? value : 0,
        minimum_billing: field === 'minimum_billing' ? value : 0,
        level_up: field === 'level_up' ? value : 0,
        two_cc: field === 'two_cc' ? value : 0,
      };

      const { data, error } = await supabase
        .from('funnel_tracking')
        .insert(newRow)
        .select()
        .single();

      if (error) {
        toast({ title: 'Error saving', variant: 'destructive' });
      } else if (data) {
        setRows(prev => prev.map(r => 
          r.funnel_number === funnelNumber ? { ...r, id: data.id } : r
        ));
      }
    }
  };

  const addRow = () => {
    const nextNumber = rows.length > 0 ? Math.max(...rows.map(r => r.funnel_number)) + 1 : 1;
    setRows(prev => [...prev, {
      funnel_number: nextNumber,
      day_1: 0,
      day_2: 0,
      minimum_billing: 0,
      level_up: 0,
      two_cc: 0,
    }]);
  };

  const totals = {
    day_1: rows.reduce((sum, r) => sum + r.day_1, 0),
    day_2: rows.reduce((sum, r) => sum + r.day_2, 0),
    minimum_billing: rows.reduce((sum, r) => sum + r.minimum_billing, 0),
    level_up: rows.reduce((sum, r) => sum + r.level_up, 0),
    two_cc: rows.reduce((sum, r) => sum + r.two_cc, 0),
  };

  return { rows, loading, updateCell, addRow, totals, refetch: fetchData };
}
