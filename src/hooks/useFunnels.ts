import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Funnel, CreateFunnelInput, UpdateFunnelInput } from '@/types/funnels';
import { toast } from 'sonner';

export function useFunnels() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['funnels', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('funnels')
        .select(`
          *,
          video_asset:video_assets(*),
          leads_count:funnel_leads(count)
        `)
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((funnel: any) => ({
        ...funnel,
        leads_count: funnel.leads_count?.[0]?.count || 0,
        video_asset: funnel.video_asset || null,
      })) as Funnel[];
    },
    enabled: !!user?.id,
  });
}

export function useFunnel(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['funnel', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('funnels')
        .select(`
          *,
          video_asset:video_assets(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        ...data,
        video_asset: data.video_asset || null,
      } as Funnel;
    },
    enabled: !!id && !!user?.id,
  });
}

export function useCreateFunnel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateFunnelInput) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('funnels')
        .insert({
          owner_user_id: user.id,
          title: input.title,
          slug: input.slug,
          description: input.description || null,
          video_asset_id: input.video_asset_id || null,
          video_url: '', // Legacy field, required by schema but deprecated
          thumbnail_url: input.thumbnail_url || null,
          allow_speed_control: input.allow_speed_control ?? false,
          allow_forward_seek: input.allow_forward_seek ?? false,
          lock_cta_until_complete: input.lock_cta_until_complete ?? true,
          price: input.price ?? 0,
          payment_type: input.payment_type || 'free',
          upi_id: input.upi_id || null,
          cta_button_text: input.cta_button_text || 'Get Access Now',
          cta_redirect_url: input.cta_redirect_url || null,
          success_message: input.success_message || null,
          whatsapp_auto_message_enabled: input.whatsapp_auto_message_enabled ?? false,
          whatsapp_auto_message: input.whatsapp_auto_message || null,
          is_published: input.is_published ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Funnel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      toast.success('Funnel created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create funnel');
    },
  });
}

export function useUpdateFunnel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateFunnelInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('funnels')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Funnel;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      queryClient.invalidateQueries({ queryKey: ['funnel', data.id] });
      toast.success('Funnel updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update funnel');
    },
  });
}

export function useDeleteFunnel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('funnels')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      toast.success('Funnel deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete funnel');
    },
  });
}

export function usePublishFunnel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const { data, error } = await supabase
        .from('funnels')
        .update({
          is_published: publish,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Funnel;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      queryClient.invalidateQueries({ queryKey: ['funnel', data.id] });
      toast.success(data.is_published ? 'Funnel published!' : 'Funnel unpublished');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update publish status');
    },
  });
}

// Hook to check if a slug is available
export function useCheckSlug() {
  return useMutation({
    mutationFn: async (slug: string) => {
      const { data, error } = await supabase
        .from('funnels')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return !data; // Return true if slug is available
    },
  });
}
