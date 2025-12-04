import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, getDaysInMonth, parse } from 'date-fns';

export interface DailyLeadRow {
  id?: string;
  day_number: number;
  leads: number;
  calls: number;
  videos: number;
  enrolls: number;
}

export function useDailyLeads() {
  const [monthYear, setMonthYear] = useState(() => format(new Date(), 'yyyy-MM'));
  const [rows, setRows] = useState<DailyLeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const daysInMonth = getDaysInMonth(parse(monthYear, 'yyyy-MM', new Date()));

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('daily_leads')
      .select('*')
      .eq('user_id', user.id)
      .eq('month_year', monthYear)
      .order('day_number', { ascending: true });

    if (error) {
      toast({ title: 'Error fetching leads data', variant: 'destructive' });
      setRows([]);
    } else {
      // Create full month with fetched data
      const dataMap = new Map(data?.map(d => [d.day_number, d]) || []);
      const fullMonth: DailyLeadRow[] = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const existing = dataMap.get(day);
        fullMonth.push({
          id: existing?.id,
          day_number: day,
          leads: existing?.leads || 0,
          calls: existing?.calls || 0,
          videos: existing?.videos || 0,
          enrolls: existing?.enrolls || 0,
        });
      }
      setRows(fullMonth);
    }
    setLoading(false);
  }, [user, monthYear, daysInMonth, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateCell = async (dayNumber: number, field: keyof DailyLeadRow, value: number) => {
    if (!user) return;

    const rowIndex = rows.findIndex(r => r.day_number === dayNumber);
    const existingRow = rows[rowIndex];

    // Update local state immediately
    setRows(prev => prev.map(r => 
      r.day_number === dayNumber ? { ...r, [field]: value } : r
    ));

    if (existingRow?.id) {
      // Update existing row
      const { error } = await supabase
        .from('daily_leads')
        .update({ [field]: value })
        .eq('id', existingRow.id);

      if (error) {
        toast({ title: 'Error saving', variant: 'destructive' });
        fetchData();
      }
    } else {
      // Insert new row
      const newRow = {
        user_id: user.id,
        month_year: monthYear,
        day_number: dayNumber,
        leads: field === 'leads' ? value : 0,
        calls: field === 'calls' ? value : 0,
        videos: field === 'videos' ? value : 0,
        enrolls: field === 'enrolls' ? value : 0,
      };

      const { data, error } = await supabase
        .from('daily_leads')
        .insert(newRow)
        .select()
        .single();

      if (error) {
        toast({ title: 'Error saving', variant: 'destructive' });
      } else if (data) {
        setRows(prev => prev.map(r => 
          r.day_number === dayNumber ? { ...r, id: data.id } : r
        ));
      }
    }
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const current = parse(monthYear, 'yyyy-MM', new Date());
    if (direction === 'prev') {
      current.setMonth(current.getMonth() - 1);
    } else {
      current.setMonth(current.getMonth() + 1);
    }
    setMonthYear(format(current, 'yyyy-MM'));
  };

  const totals = {
    leads: rows.reduce((sum, r) => sum + r.leads, 0),
    calls: rows.reduce((sum, r) => sum + r.calls, 0),
    videos: rows.reduce((sum, r) => sum + r.videos, 0),
    enrolls: rows.reduce((sum, r) => sum + r.enrolls, 0),
  };

  const currentDate = new Date();
  const selectedDate = parse(monthYear, 'yyyy-MM', new Date());
  const isCurrentMonth = format(currentDate, 'yyyy-MM') === monthYear;
  const daysRemaining = isCurrentMonth ? daysInMonth - currentDate.getDate() : 0;

  return { 
    rows, 
    loading, 
    updateCell, 
    totals, 
    monthYear,
    changeMonth,
    daysInMonth,
    daysRemaining,
    refetch: fetchData 
  };
}
