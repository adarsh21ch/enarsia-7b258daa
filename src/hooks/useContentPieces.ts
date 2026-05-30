import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/** A scripted content piece moving through the pipeline. Mirrors content_pieces. */
export interface ContentPiece {
  id: string;
  user_id: string;
  idea_id: string | null;
  script: string | null;
  caption: string | null;
  hashtags: string[];
  platform: string;
  stage: 'idea' | 'scripting' | 'filming' | 'editing' | 'scheduled' | 'posted';
  scheduled_at: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
}

const db = supabase as unknown as { from: (t: string) => any };

export function useContentPieces() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['content_pieces', user?.id];

  const { data: pieces = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<ContentPiece[]> => {
      if (!user) return [];
      const { data, error } = await db
        .from('content_pieces')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ContentPiece[];
    },
    enabled: !!user?.id,
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: {
      id?: string;
      idea_id?: string | null;
      script?: string;
      caption?: string;
      hashtags?: string[];
      platform?: string;
      stage?: ContentPiece['stage'];
    }) => {
      if (!user) throw new Error('Not authenticated');
      const payload: Record<string, unknown> = {
        idea_id: input.idea_id ?? null,
        script: input.script ?? null,
        caption: input.caption ?? null,
        hashtags: input.hashtags ?? [],
        platform: input.platform ?? 'reels',
        stage: input.stage ?? 'scripting',
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
      queryClient.invalidateQueries({ queryKey });
      toast.success('Saved to Calendar');
    },
    onError: () => toast.error('Could not save piece'),
  });

  return {
    pieces,
    isLoading,
    savePiece: upsertMutation.mutateAsync,
    saving: upsertMutation.isPending,
  };
}
