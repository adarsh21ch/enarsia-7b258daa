export interface VideoAsset {
  id: string;
  owner_user_id: string;
  title: string;
  description?: string;
  r2_object_key: string;
  thumbnail_key?: string;
  duration_seconds?: number;
  file_size_bytes: number;
  mime_type: string;
  status: 'processing' | 'ready' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadUrlResponse {
  upload_url: string;
  object_key: string;
  asset_id: string;
}

export interface ConfirmUploadResponse {
  success: boolean;
  asset: VideoAsset;
}

export interface PlaybackUrlResponse {
  playback_url: string;
  expires_at: string;
  asset: {
    id: string;
    title: string;
    duration_seconds?: number;
    mime_type: string;
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
