import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet } from '@/types/prospect';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Format today's date as "DD MMM" (e.g., "20 Dec")
const getTodaySheetName = () => format(new Date(), 'd MMM');

export function useSheets() {
  const { user } = useAuth();
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [todaySheetId, setTodaySheetId] = useState<string | null>(null);

  const fetchSheets = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('sheets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sheets:', error);
    } else {
      setSheets(data as Sheet[]);
    }
    setLoading(false);
  }, [user]);

  // Get or create today's date sheet
  const getOrCreateTodaySheet = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    const todayName = getTodaySheetName();
    
    // Check if today's sheet already exists in current sheets
    const existingSheet = sheets.find(s => s.name === todayName);
    if (existingSheet) {
      setTodaySheetId(existingSheet.id);
      return existingSheet.id;
    }

    // Check database in case sheets aren't loaded yet
    const { data: dbSheet } = await supabase
      .from('sheets')
      .select('*')
      .eq('user_id', user.id)
      .eq('name', todayName)
      .single();

    if (dbSheet) {
      setTodaySheetId(dbSheet.id);
      // Add to local state if not present
      setSheets(prev => {
        if (prev.find(s => s.id === dbSheet.id)) return prev;
        return [dbSheet as Sheet, ...prev];
      });
      return dbSheet.id;
    }

    // Create new sheet for today
    const { data: newSheet, error } = await supabase
      .from('sheets')
      .insert({
        name: todayName,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating today sheet:', error);
      return null;
    }

    setSheets(prev => [newSheet as Sheet, ...prev]);
    setTodaySheetId(newSheet.id);
    return newSheet.id;
  }, [user, sheets]);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets]);

  const addSheet = async (name: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('sheets')
      .insert({
        name,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create sheet');
      console.error('Error creating sheet:', error);
      return null;
    }

    setSheets(prev => [data as Sheet, ...prev]);
    toast.success('Sheet created');
    return data as Sheet;
  };

  const updateSheet = async (id: string, name: string) => {
    const { data, error } = await supabase
      .from('sheets')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast.error('Failed to update sheet');
      console.error('Error updating sheet:', error);
      return null;
    }

    setSheets(prev => prev.map(s => s.id === id ? (data as Sheet) : s));
    return data as Sheet;
  };

  const deleteSheet = async (id: string) => {
    const { error } = await supabase
      .from('sheets')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete sheet');
      console.error('Error deleting sheet:', error);
      return false;
    }

    setSheets(prev => prev.filter(s => s.id !== id));
    if (selectedSheetId === id) {
      setSelectedSheetId(null);
    }
    toast.success('Sheet deleted');
    return true;
  };

  return {
    sheets,
    loading,
    selectedSheetId,
    setSelectedSheetId,
    todaySheetId,
    addSheet,
    updateSheet,
    deleteSheet,
    getOrCreateTodaySheet,
    refetch: fetchSheets,
  };
}
