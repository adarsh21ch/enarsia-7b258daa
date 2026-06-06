import { supabase } from '@/integrations/supabase/client';

export type AcademyUploadPurpose = 'academy-video' | 'academy-thumbnail';

export interface AcademyUploadResult {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string;
  contentType: string;
}

/**
 * Uploads a file to Cloudflare R2 via a presigned PUT URL minted by the
 * `academy-upload-url` edge function. Admin-only.
 */
export async function uploadAcademyFile(opts: {
  file: File;
  purpose: AcademyUploadPurpose;
  onProgress?: (pct: number) => void;
}): Promise<AcademyUploadResult> {
  const { file, purpose, onProgress } = opts;

  const { data, error } = await supabase.functions.invoke('academy-upload-url', {
    body: {
      file_name: file.name,
      file_size: file.size,
      content_type: file.type,
      purpose,
    },
  });

  if (error || !data?.upload_url) {
    throw new Error(error?.message || 'Failed to get upload URL');
  }

  // Use XHR for progress
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', data.upload_url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`R2 upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });

  return {
    uploadUrl: data.upload_url,
    objectKey: data.object_key,
    publicUrl: data.public_url,
    contentType: data.content_type,
  };
}

/**
 * Attempt to read a video's duration in seconds from a local File before upload.
 * Returns 0 if it cannot be determined.
 */
export function getVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const d = Math.round(video.duration || 0);
        URL.revokeObjectURL(url);
        resolve(Number.isFinite(d) ? d : 0);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
      video.src = url;
    } catch {
      resolve(0);
    }
  });
}
