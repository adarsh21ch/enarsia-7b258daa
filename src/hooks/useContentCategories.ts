import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ContentCategory {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

const db = supabase as unknown as { from: (t: string) => any };
const DEFAULTS = ['Evergreen', 'Trending'];

export function useContentCategories() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ['content_categories', user?.id];

  const { data: categories = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async (): Promise<ContentCategory[]> => {
      if (!user) return [];
      const { data, error } = await db
        .from('content_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as ContentCategory[];
    },
    enabled: !!user?.id,
  });

  // Seed defaults on first load
  useEffect(() => {
    if (!user || isLoading) return;
    if (categories.length === 0) {
      (async () => {
        const rows = DEFAULTS.map((name) => ({ user_id: user.id, name }));
        const { error } = await db.from('content_categories').insert(rows);
        if (!error) qc.invalidateQueries({ queryKey: key });
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isLoading, categories.length]);

  const create = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await db
        .from('content_categories')
        .insert({ user_id: user.id, name: name.trim() })
        .select()
        .single();
      if (error) throw error;
      return data as ContentCategory;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success('Category added');
    },
    onError: () => toast.error('Could not add category'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await db.from('content_categories').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { categories, isLoading, createCategory: create.mutateAsync, deleteCategory: remove.mutateAsync };
}
