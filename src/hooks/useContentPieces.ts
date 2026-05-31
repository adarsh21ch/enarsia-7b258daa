import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ContentPiece {
  id: string;
  user_id: string;
  idea_id: string | null;
  account_id: string | null;
  title: string | null;
  script: string | null;
  hook_text: string | null;
  body_text: string | null;
  cta_text: string | null;
  hook_audio_url: string | null;
  body_audio_url: string | null;
  cta_audio_url: string | null;
  caption: string | null;
  hashtags: string[];
  platform: string;
  stage: 'idea' | 'scripting' | 'filming' | 'editing' | 'scheduled' | 'posted';
  scheduled_at: string | null;
  posted_at: string | null;
  posted_date: string | null;
  created_at: string;
  updated_at: string;
}

const db = supabase as unknown as { from: (t: string) => any };

export function useContentPieces(accountId?: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['content_pieces', user?.id, accountId ?? 'all'];

  const { data: pieces = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<ContentPiece[]> => {
      if (!user) return [];
      let q = db.from('content_pieces').select('*').eq('user_id', user.id);
      if (accountId) q = q.eq('account_id', accountId);
      const { data, error } = await q.order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ContentPiece[];
    },
    enabled: !!user?.id,
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: {
      id?: string;
      idea_id?: string | null;
      account_id?: string | null;
      title?: string | null;
      script?: string;
      hook_text?: string | null;
      body_text?: string | null;
      cta_text?: string | null;
      hook_audio_url?: string | null;
      body_audio_url?: string | null;
      cta_audio_url?: string | null;
      caption?: string;
      hashtags?: string[];
      platform?: string;
      stage?: ContentPiece['stage'];
      posted_date?: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const payload: Record<string, unknown> = {
        idea_id: input.idea_id ?? null,
        account_id: input.account_id ?? null,
        title: input.title ?? null,
        script: input.script ?? null,
        hook_text: input.hook_text ?? null,
        body_text: input.body_text ?? null,
        cta_text: input.cta_text ?? null,
        hook_audio_url: input.hook_audio_url ?? null,
        body_audio_url: input.body_audio_url ?? null,
        cta_audio_url: input.cta_audio_url ?? null,
        caption: input.caption ?? null,
        hashtags: input.hashtags ?? [],
        platform: input.platform ?? 'reels',
        stage: input.stage ?? 'scripting',
        posted_date: input.posted_date ?? null,
      };
      if (input.id) {
        const { data, error } = await db
          .from('content_pieces')
          .update(payload)
          .eq('id', input.id)
          .eq('user_id', user.id)
          .select()
          .single();
        if (error) throw error;
        return data as ContentPiece;
      }
      const { data, error } = await db
        .from('content_pieces')
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as ContentPiece;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content_pieces', user?.id] });
    },
    onError: (e: any) => toast.error(e?.message || 'Could not save piece'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await db.from('content_pieces').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['content_pieces', user?.id] }),
  });

  return {
    pieces,
    isLoading,
    savePiece: upsertMutation.mutateAsync,
    saving: upsertMutation.isPending,
    deletePiece: deleteMutation.mutateAsync,
  };
}
