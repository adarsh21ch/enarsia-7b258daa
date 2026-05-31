import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/** Content Creator mode — a "topic" (formerly idea) in the vault. */
export interface ContentIdea {
  id: string;
  user_id: string;
  title: string;
  hook: string | null;
  hook_type: string | null;
  source: 'self' | 'ai' | 'competitor';
  status: 'spark' | 'developing' | 'scripted' | 'done';
  niche_tag: string | null;
  category_id: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  context_note: string | null;
  audio_url: string | null;
  account_id: string | null;
  created_at: string;
  updated_at: string;
}

export const IDEA_STATUSES: ContentIdea['status'][] = ['spark', 'developing', 'scripted', 'done'];

const db = supabase as unknown as { from: (t: string) => any };

export function useContentIdeas(accountId?: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['content_ideas', user?.id, accountId ?? 'all'];

  const { data: ideas = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<ContentIdea[]> => {
      if (!user) return [];
      let q = db.from('content_ideas').select('*').eq('user_id', user.id);
      if (accountId) q = q.eq('account_id', accountId);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ContentIdea[];
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (input: {
      title: string;
      hook?: string;
      hook_type?: string;
      niche_tag?: string;
      source?: ContentIdea['source'];
      category_id?: string | null;
      instagram_url?: string | null;
      youtube_url?: string | null;
      context_note?: string | null;
      account_id?: string | null;
    }) => {
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
          category_id: input.category_id || null,
          instagram_url: input.instagram_url?.trim() || null,
          youtube_url: input.youtube_url?.trim() || null,
          context_note: input.context_note?.trim() || null,
          account_id: input.account_id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ContentIdea;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content_ideas', user?.id] });
      toast.success('Topic saved');
    },
    onError: () => toast.error('Could not save topic'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ContentIdea> }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await db.from('content_ideas').update(updates).eq('id', id).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['content_ideas', user?.id] }),
    onError: () => toast.error('Could not update topic'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await db.from('content_ideas').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content_ideas', user?.id] });
      toast.success('Topic deleted');
    },
    onError: () => toast.error('Could not delete topic'),
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
