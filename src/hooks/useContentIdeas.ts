import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/** Content Creator mode — an idea/post in the vault. Mirrors content_ideas. */
export interface ContentIdea {
  id: string;
  user_id: string;
  title: string;
  hook: string | null;
  hook_type: string | null;
  source: 'self' | 'ai' | 'competitor';
  status: 'spark' | 'developing' | 'scripted' | 'done';
  niche_tag: string | null;
  created_at: string;
  updated_at: string;
}

export const IDEA_STATUSES: ContentIdea['status'][] = ['spark', 'developing', 'scripted', 'done'];

// New tables aren't in the generated Supabase types yet; access loosely.
const db = supabase as unknown as {
  from: (t: string) => any;
};

export function useContentIdeas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['content_ideas', user?.id];

  const { data: ideas = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<ContentIdea[]> => {
      if (!user) return [];
      const { data, error } = await db
        .from('content_ideas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ContentIdea[];
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (input: { title: string; hook?: string; hook_type?: string; niche_tag?: string; source?: ContentIdea['source'] }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await db
        .from('content_ideas')
        .insert({
          user_id: user.id,
          title: input.title.trim(),
          hook: input.hook?.trim() || null,
          hook_type: input.hook_type || null,
          niche_tag: input.niche_tag || null,
          source: input.source || 'self',
        })
        .select()
        .single();
      if (error) throw error;
      return data as ContentIdea;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Idea captured');
    },
    onError: () => toast.error('Could not save idea'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<ContentIdea, 'title' | 'hook' | 'hook_type' | 'status' | 'niche_tag'>> }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await db.from('content_ideas').update(updates).eq('id', id).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error('Could not update idea'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await db.from('content_ideas').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Idea deleted');
    },
    onError: () => toast.error('Could not delete idea'),
  });

  return {
    ideas,
    isLoading,
    createIdea: createMutation.mutateAsync,
    creating: createMutation.isPending,
    updateIdea: updateMutation.mutateAsync,
    deleteIdea: deleteMutation.mutateAsync,
  };
}
