import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Prospect, Sheet } from '@/types/prospect';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DataContextType {
  // Prospects
  prospects: Prospect[];
  prospectsLoading: boolean;
  addProspect: (prospect: Partial<Prospect>) => Promise<Prospect | null>;
  updateProspect: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
  deleteProspect: (id: string) => Promise<boolean>;
  importProspects: (prospects: Partial<Prospect>[]) => Promise<{ imported: number; skipped: number }>;
  refetchProspects: () => Promise<void>;
  // Sheets
  sheets: Sheet[];
  sheetsLoading: boolean;
  selectedSheetId: string | null;
  setSelectedSheetId: (id: string | null) => void;
  addSheet: (name: string) => Promise<Sheet | null>;
  updateSheet: (id: string, name: string) => Promise<Sheet | null>;
  deleteSheet: (id: string) => Promise<boolean>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  // Prospects state
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [prospectsLoading, setProspectsLoading] = useState(true);
  const prospectsHasFetched = useRef(false);
  
  // Sheets state
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [sheetsLoading, setSheetsLoading] = useState(true);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const sheetsHasFetched = useRef(false);

  // Fetch prospects once per session
  const fetchProspects = useCallback(async () => {
    if (!user) {
      setProspectsLoading(false);
      return;
    }
    
    setProspectsLoading(true);
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('user_id', user.id)
        .order('date_added', { ascending: false });

      if (error) {
        toast.error('Failed to fetch prospects');
        setProspects([]);
      } else {
        setProspects((data || []) as Prospect[]);
      }
    } catch (err) {
      console.error('Error fetching prospects:', err);
      setProspects([]);
    } finally {
      setProspectsLoading(false);
    }
  }, [user]);

  // Fetch sheets once per session
  const fetchSheets = useCallback(async () => {
    if (!user) {
      setSheetsLoading(false);
      return;
    }
    
    setSheetsLoading(true);
    try {
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
    } finally {
      setSheetsLoading(false);
    }
  }, [user]);

  // Initial fetch - only once per user session
  useEffect(() => {
    if (user && !prospectsHasFetched.current) {
      prospectsHasFetched.current = true;
      fetchProspects();
    } else if (!user) {
      prospectsHasFetched.current = false;
      setProspects([]);
      setProspectsLoading(false);
    }
  }, [user, fetchProspects]);

  useEffect(() => {
    if (user && !sheetsHasFetched.current) {
      sheetsHasFetched.current = true;
      fetchSheets();
    } else if (!user) {
      sheetsHasFetched.current = false;
      setSheets([]);
      setSheetsLoading(false);
    }
  }, [user, fetchSheets]);

  // Prospect mutations - update local state immediately
  const addProspect = async (prospect: Partial<Prospect>) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('prospects')
      .insert({
        name: prospect.name!,
        phone: prospect.phone!,
        age_or_dob: prospect.age_or_dob || null,
        city: prospect.city || null,
        state: prospect.state || null,
        gender: prospect.gender || null,
        user_id: user.id,
        sheet_id: prospect.sheet_id || null,
        batch_date: prospect.batch_date || new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add prospect');
      return null;
    }

    const newProspect = data as Prospect;
    setProspects(prev => [newProspect, ...prev]);
    toast.success('Prospect added');
    return newProspect;
  };

  const updateProspect = async (id: string, updates: Partial<Prospect>) => {
    // Optimistic update
    setProspects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));

    const { data, error } = await supabase
      .from('prospects')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast.error('Failed to update prospect');
      // Revert on error
      fetchProspects();
      return null;
    }

    const updatedProspect = data as Prospect;
    setProspects(prev => prev.map(p => p.id === id ? updatedProspect : p));
    return updatedProspect;
  };

  const deleteProspect = async (id: string) => {
    // Optimistic delete
    const previousProspects = prospects;
    setProspects(prev => prev.filter(p => p.id !== id));

    const { error } = await supabase
      .from('prospects')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete prospect');
      setProspects(previousProspects);
      return false;
    }

    toast.success('Prospect deleted');
    return true;
  };

  const importProspects = async (prospectsData: Partial<Prospect>[]) => {
    if (!user) return { imported: 0, skipped: 0 };

    const validProspects = prospectsData.filter(p => p.name && p.phone);
    const skipped = prospectsData.length - validProspects.length;

    if (validProspects.length === 0) {
      return { imported: 0, skipped };
    }

    const prospectsToInsert = validProspects.map(p => ({
      user_id: user.id,
      name: p.name!,
      phone: p.phone!,
      age_or_dob: p.age_or_dob || null,
      city: p.city || null,
      state: p.state || null,
      gender: p.gender || null,
      sheet_id: p.sheet_id || null,
      batch_date: p.batch_date || new Date().toISOString().split('T')[0],
    }));

    const { data, error } = await supabase
      .from('prospects')
      .insert(prospectsToInsert as any)
      .select();

    if (error) {
      toast.error('Failed to import prospects');
      return { imported: 0, skipped: prospectsData.length };
    }

    setProspects(prev => [...(data || []) as Prospect[], ...prev]);
    return { imported: data?.length || 0, skipped };
  };

  // Sheet mutations
  const addSheet = async (name: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('sheets')
      .insert({ name, user_id: user.id })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create sheet');
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
      return false;
    }

    setSheets(prev => prev.filter(s => s.id !== id));
    if (selectedSheetId === id) {
      setSelectedSheetId(null);
    }
    toast.success('Sheet deleted');
    return true;
  };

  return (
    <DataContext.Provider value={{
      prospects,
      prospectsLoading,
      addProspect,
      updateProspect,
      deleteProspect,
      importProspects,
      refetchProspects: fetchProspects,
      sheets,
      sheetsLoading,
      selectedSheetId,
      setSelectedSheetId,
      addSheet,
      updateSheet,
      deleteSheet,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
