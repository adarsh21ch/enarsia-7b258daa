import { VideoAsset } from './video-assets';

export interface Funnel {
  id: string;
  owner_user_id: string;
  title: string;
  slug: string;
  description?: string | null;
  video_asset_id?: string | null;
  video_url?: string | null; // Legacy, deprecated
  thumbnail_url?: string | null;
  allow_speed_control: boolean;
  allow_forward_seek: boolean;
  lock_cta_until_complete: boolean;
  price: number;
  payment_type: 'razorpay' | 'upi_manual' | 'free';
  upi_id?: string | null;
  cta_button_text: string;
  cta_redirect_url?: string | null;
  success_message?: string | null;
  whatsapp_auto_message_enabled: boolean;
  whatsapp_auto_message?: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  // Computed fields from joins
  leads_count?: number;
  video_asset?: VideoAsset | null;
}

export interface FunnelLead {
  id: string;
  funnel_id: string;
  owner_user_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  video_watch_percent: number | null;
  video_completed: boolean | null;
  payment_status_cache: 'pending' | 'paid' | 'failed' | null;
  source?: string | null;
  created_at: string;
  updated_at?: string | null;
  access_token?: string | null;
  max_watched_second?: number | null;
  last_watched_second?: number | null;
}

export interface FunnelLeadStats {
  totalLeads: number;
  completedVideo: number;
  completionRate: number;
  paidLeads: number;
  paymentConversionRate: number;
}

export interface FunnelPriceOption {
  id: string;
  funnel_id: string;
  label: string;
  amount: number;
  upi_id: string | null;
  qr_image_url: string | null;
  sort_order: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentProofSubmission {
  lead_id: string;
  funnel_id: string;
  price_option_id?: string;
  amount: number;
  screenshot_url: string;
  access_token?: string;
}

export interface CreateFunnelInput {
  title: string;
  slug: string;
  description?: string;
  video_asset_id?: string;
  thumbnail_url?: string;
  allow_speed_control?: boolean;
  allow_forward_seek?: boolean;
  lock_cta_until_complete?: boolean;
  price?: number;
  payment_type?: 'razorpay' | 'upi_manual' | 'free';
  upi_id?: string;
  cta_button_text?: string;
  cta_redirect_url?: string;
  success_message?: string;
  whatsapp_auto_message_enabled?: boolean;
  whatsapp_auto_message?: string;
  is_published?: boolean;
}

export interface UpdateFunnelInput extends Partial<CreateFunnelInput> {
  id: string;
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

export function getFunnelPublicUrl(slug: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/f/${slug}`;
}
