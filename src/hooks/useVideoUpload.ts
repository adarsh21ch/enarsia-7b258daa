import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { UploadProgress, UploadUrlResponse, ConfirmUploadResponse } from '@/types/video-assets';
import { toast } from 'sonner';

interface UseVideoUploadOptions {
  onSuccess?: (assetId: string) => void;
  onError?: (error: Error) => void;
}

export function useVideoUpload(options?: UseVideoUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [currentAssetId, setCurrentAssetId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const uploadVideo = useCallback(async (file: File, customTitle?: string) => {
    setIsUploading(true);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });
    
    try {
      // Validate file type
      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only MP4, WebM, and MOV are allowed.');
      }

      // Validate file size (500MB max)
      const maxSize = 500 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('File too large. Maximum size is 500MB.');
      }

      // Step 1: Get presigned upload URL
      const { data: urlData, error: urlError } = await supabase.functions.invoke<UploadUrlResponse>(
        'r2-get-upload-url',
        {
          body: {
            file_name: file.name,
            file_size: file.size,
            content_type: file.type,
          },
        }
      );

      if (urlError || !urlData) {
        console.error('Failed to get upload URL:', urlError);
        throw new Error('Failed to get upload URL');
      }

      setCurrentAssetId(urlData.asset_id);

      // Step 2: Upload directly to R2
      const xhr = new XMLHttpRequest();
      
      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress({
              loaded: e.loaded,
              total: e.total,
              percentage: Math.round((e.loaded / e.total) * 100),
            });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.onabort = () => reject(new Error('Upload cancelled'));

        xhr.open('PUT', urlData.upload_url);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      // Step 3: Get video duration (optional)
      let duration: number | undefined;
      try {
        duration = await getVideoDuration(file);
      } catch (e) {
        console.warn('Could not determine video duration:', e);
      }

      // Step 4: Confirm upload
      const { data: confirmData, error: confirmError } = await supabase.functions.invoke<ConfirmUploadResponse>(
        'r2-confirm-upload',
        {
          body: {
            asset_id: urlData.asset_id,
            title: customTitle || file.name.replace(/\.[^/.]+$/, ''),
            duration_seconds: duration,
          },
        }
      );

      if (confirmError || !confirmData?.success) {
        console.error('Failed to confirm upload:', confirmError);
        throw new Error('Upload confirmation failed');
      }

      // Refresh assets list
      queryClient.invalidateQueries({ queryKey: ['video-assets'] });
      
      toast.success('Video uploaded successfully!');
      options?.onSuccess?.(urlData.asset_id);
      
      return urlData.asset_id;
    } catch (error) {
      console.error('Upload error:', error);
      const err = error instanceof Error ? error : new Error('Upload failed');
      toast.error(err.message);
      options?.onError?.(err);
      throw err;
    } finally {
      setIsUploading(false);
      setProgress(null);
      setCurrentAssetId(null);
    }
  }, [queryClient, options]);

  const cancelUpload = useCallback(() => {
    // Could implement XHR abort here if needed
    setIsUploading(false);
    setProgress(null);
    setCurrentAssetId(null);
  }, []);

  return {
    uploadVideo,
    cancelUpload,
    isUploading,
    progress,
    currentAssetId,
  };
}

// Helper to get video duration
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(Math.round(video.duration));
    };
    
    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('Could not load video metadata'));
    };
    
    video.src = URL.createObjectURL(file);
  });
}
