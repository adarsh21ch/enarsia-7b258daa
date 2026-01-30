import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VideoAsset } from '@/types/video-assets';
import { toast } from 'sonner';

export function useVideoAssets(statusFilter?: 'ready' | 'processing' | 'failed') {
  return useQuery({
    queryKey: ['video-assets', statusFilter],
    queryFn: async (): Promise<VideoAsset[]> => {
      let query = supabase
        .from('video_assets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching video assets:', error);
        throw error;
      }
      
      return (data || []) as VideoAsset[];
    },
  });
}

export function useVideoAsset(assetId: string | undefined) {
  return useQuery({
    queryKey: ['video-asset', assetId],
    queryFn: async (): Promise<VideoAsset | null> => {
      if (!assetId) return null;
      
      const { data, error } = await supabase
        .from('video_assets')
        .select('*')
        .eq('id', assetId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching video asset:', error);
        throw error;
      }
      
      return data as VideoAsset | null;
    },
    enabled: !!assetId,
  });
}

export function useUpdateVideoAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<VideoAsset> }) => {
      const { data, error } = await supabase
        .from('video_assets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as VideoAsset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-assets'] });
      toast.success('Video updated');
    },
    onError: (error) => {
      console.error('Error updating video asset:', error);
      toast.error('Failed to update video');
    },
  });
}

export function useDeleteVideoAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assetId: string) => {
      // First check if any funnels are using this asset
      const { data: funnels, error: funnelsError } = await supabase
        .from('funnels')
        .select('id, title')
        .eq('video_asset_id', assetId);
      
      if (funnelsError) throw funnelsError;
      
      if (funnels && funnels.length > 0) {
        throw new Error(`This video is used by ${funnels.length} funnel(s). Remove it from funnels first.`);
      }
      
      // Delete the asset record (R2 cleanup would need a separate process)
      const { error } = await supabase
        .from('video_assets')
        .delete()
        .eq('id', assetId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-assets'] });
      toast.success('Video deleted');
    },
    onError: (error) => {
      console.error('Error deleting video asset:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete video');
    },
  });
}
