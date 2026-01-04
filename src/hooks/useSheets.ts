import { useState, useEffect, useCallback, useRef } from 'react';
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
  
  // Lock to prevent concurrent sheet creation
  const creatingSheetRef = useRef(false);

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

  // Get or create today's date sheet - only when adding/importing leads
  const getOrCreateTodaySheet = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    
    // Prevent concurrent creation
    if (creatingSheetRef.current) {
      // Wait a bit and check again
      await new Promise(resolve => setTimeout(resolve, 500));
      // Check if sheet was created
      const todayName = getTodaySheetName();
      const { data: existingSheet } = await supabase
        .from('sheets')
        .select('*')
        .eq('user_id', user.id)
        .eq('name', todayName)
        .maybeSingle();
      
      if (existingSheet) {
        setTodaySheetId(existingSheet.id);
        return existingSheet.id;
      }
      return null;
    }

    const todayName = getTodaySheetName();
    
    // Always check database first (most reliable)
    const { data: dbSheet } = await supabase
      .from('sheets')
      .select('*')
      .eq('user_id', user.id)
      .eq('name', todayName)
      .maybeSingle();

    if (dbSheet) {
      setTodaySheetId(dbSheet.id);
      // Add to local state if not present
      setSheets(prev => {
        if (prev.find(s => s.id === dbSheet.id)) return prev;
        return [dbSheet as Sheet, ...prev];
      });
      return dbSheet.id;
    }

    // Sheet doesn't exist - create it with lock
    creatingSheetRef.current = true;
    
    try {
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
    } finally {
      creatingSheetRef.current = false;
    }
  }, [user]);

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
