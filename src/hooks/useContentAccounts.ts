import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ContentAccount {
  id: string;
  user_id: string;
  platform: string;
  name: string;
  username: string | null;
  url: string | null;
  created_at: string;
}

const db = supabase as unknown as { from: (t: string) => any };

export function useContentAccounts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ['content_accounts', user?.id];

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async (): Promise<ContentAccount[]> => {
      if (!user) return [];
      const { data, error } = await db
        .from('content_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as ContentAccount[];
    },
    enabled: !!user?.id,
  });

  const create = useMutation({
    mutationFn: async (input: { platform: string; name: string; username?: string; url?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await db
        .from('content_accounts')
        .insert({
          user_id: user.id,
          platform: input.platform,
          name: input.name.trim(),
          username: input.username?.trim() || null,
          url: input.url?.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ContentAccount;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success('Account added');
    },
    onError: (e: any) => toast.error(e?.message || 'Could not add account'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await db.from('content_accounts').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success('Account removed');
    },
  });

  return { accounts, isLoading, createAccount: create.mutateAsync, creating: create.isPending, deleteAccount: remove.mutateAsync };
}
