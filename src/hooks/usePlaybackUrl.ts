import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PlaybackUrlResponse } from '@/types/video-assets';

interface CachedUrl {
  url: string;
  expiresAt: Date;
}

export function usePlaybackUrl() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef<Map<string, CachedUrl>>(new Map());

  const getPlaybackUrl = useCallback(async (
    assetId: string, 
    leadToken?: string
  ): Promise<string | null> => {
    // Check cache first
    const cached = cache.current.get(assetId);
    if (cached && cached.expiresAt > new Date()) {
      // Return cached URL if not expired (with 5 min buffer)
      const buffer = 5 * 60 * 1000; // 5 minutes
      if (cached.expiresAt.getTime() - buffer > Date.now()) {
        return cached.url;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke<PlaybackUrlResponse>(
        'r2-get-playback-url',
        {
          body: {
            asset_id: assetId,
            lead_token: leadToken,
          },
        }
      );

      if (invokeError || !data) {
        console.error('Failed to get playback URL:', invokeError);
        setError('Failed to get video playback URL');
        return null;
      }

      // Cache the URL
      cache.current.set(assetId, {
        url: data.playback_url,
        expiresAt: new Date(data.expires_at),
      });

      return data.playback_url;
    } catch (err) {
      console.error('Playback URL error:', err);
      setError('Failed to load video');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearCache = useCallback((assetId?: string) => {
    if (assetId) {
      cache.current.delete(assetId);
    } else {
      cache.current.clear();
    }
  }, []);

  return {
    getPlaybackUrl,
    clearCache,
    isLoading,
    error,
  };
}
