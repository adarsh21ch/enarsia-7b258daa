import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet } from '@/types/prospect';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { toIST } from '@/lib/dateUtils';

const getTodaySheetName = () => format(toIST(new Date()), 'd MMM');
const SELECTED_SHEET_KEY = 'trackup_selected_sheet_id';

export function useSheets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Initialize from localStorage
  const [selectedSheetId, setSelectedSheetIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SELECTED_SHEET_KEY);
    } catch {
      return null;
    }
  });
  const [todaySheetId, setTodaySheetId] = useState<string | null>(null);
  const creatingSheetRef = useRef(false);

  // Persist selected sheet to localStorage
  const setSelectedSheetId = useCallback((id: string | null) => {
    setSelectedSheetIdState(id);
    try {
      if (id) {
        localStorage.setItem(SELECTED_SHEET_KEY, id);
      } else {
        localStorage.removeItem(SELECTED_SHEET_KEY);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const queryKey = ['sheets', user?.id];

  const { data: sheets = [], isLoading: loading, refetch } = useQuery({
    queryKey,
    queryFn: async (): Promise<Sheet[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('sheets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sheets:', error);
        throw error;
      }

      return (data || []) as Sheet[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Get or create today's sheet
  const getOrCreateTodaySheet = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    
    if (creatingSheetRef.current) {
      await new Promise(resolve => setTimeout(resolve, 500));
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
    
    const { data: dbSheet } = await supabase
      .from('sheets')
      .select('*')
      .eq('user_id', user.id)
      .eq('name', todayName)
      .maybeSingle();

    if (dbSheet) {
      setTodaySheetId(dbSheet.id);
      queryClient.setQueryData<Sheet[]>(queryKey, (prev) => {
        if (!prev || prev.find(s => s.id === dbSheet.id)) return prev;
        return [dbSheet as Sheet, ...prev];
      });
      return dbSheet.id;
    }

    creatingSheetRef.current = true;
    
    try {
      const { data: newSheet, error } = await supabase
        .from('sheets')
        .insert({ name: todayName, user_id: user.id })
        .select()
        .single();

      if (error) {
        console.error('Error creating today sheet:', error);
        return null;
      }

      queryClient.setQueryData<Sheet[]>(queryKey, (prev) => 
        prev ? [newSheet as Sheet, ...prev] : [newSheet as Sheet]
      );
      setTodaySheetId(newSheet.id);
      return newSheet.id;
    } finally {
      creatingSheetRef.current = false;
    }
  }, [user, queryClient, queryKey]);

  // Add sheet mutation
  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('sheets')
        .insert({ name, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as Sheet;
    },
    onSuccess: (newSheet) => {
      queryClient.setQueryData<Sheet[]>(queryKey, (prev) => 
        prev ? [newSheet, ...prev] : [newSheet]
      );
      toast.success('Sheet created');
    },
    onError: () => {
      toast.error('Failed to create sheet');
    },
  });

  // Update sheet mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('sheets')
        .update({ name })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Sheet;
    },
    onSuccess: (updatedSheet) => {
      queryClient.setQueryData<Sheet[]>(queryKey, (prev) => 
        prev?.map(s => s.id === updatedSheet.id ? updatedSheet : s)
      );
    },
    onError: () => {
      toast.error('Failed to update sheet');
    },
  });

  // Delete sheet mutation — soft-deletes all prospects in that sheet, then deletes the sheet
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Soft-delete all prospects belonging to this sheet (set deleted_at instead of hard delete)
      const { error: prospectsError } = await supabase
        .from('prospects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('sheet_id', id)
        .eq('user_id', user!.id)
        .is('deleted_at', null);

      if (prospectsError) throw prospectsError;

      // Then delete the sheet itself
      const { error } = await supabase
        .from('sheets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Sheet[]>(queryKey, (prev) => 
        prev?.filter(s => s.id !== id)
      );
      if (selectedSheetId === id) {
        setSelectedSheetId(null);
      }
      // Also invalidate prospects cache so "All" view updates
      queryClient.invalidateQueries({ queryKey: ['prospects', user!.id] });
      queryClient.invalidateQueries({ queryKey: ['prospects-kpi', user!.id] });
      queryClient.invalidateQueries({ queryKey: ['deleted-prospects'] });
      toast.success('Sheet deleted — leads moved to Recently Deleted');
    },
    onError: () => {
      toast.error('Failed to delete sheet');
    },
  });

  const addSheet = useCallback(async (name: string) => {
    try {
      return await addMutation.mutateAsync(name);
    } catch {
      return null;
    }
  }, [addMutation]);

  const updateSheet = useCallback(async (id: string, name: string) => {
    try {
      return await updateMutation.mutateAsync({ id, name });
    } catch {
      return null;
    }
  }, [updateMutation]);

  const deleteSheet = useCallback(async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  }, [deleteMutation]);

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
    refetch,
  };
}
