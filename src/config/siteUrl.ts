/**
 * Single source of truth for the published app URL used in auth email redirects.
 * IMPORTANT: keep this value in sync with your published domain.
 */
export const PUBLISHED_APP_URL = "https://enarsia.nevorai.com";

/**
 * Main Nevorai website URL for TrackUp Dashboard and form share links.
 */
export const NEVORAI_WEBSITE_URL = "https://nevorai.com";

export function getPublishedAppUrl(): string {
  return PUBLISHED_APP_URL;
}

export function getPasswordRecoveryRedirectUrl(): string {
  return `${PUBLISHED_APP_URL}/reset-password`;
}

/**
 * Generate a shareable form URL for nevorai.com
 */
export function getFormShareUrl(token: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/functions/v1/og-share?type=form&token=${encodeURIComponent(token)}`;
  }
  return `${NEVORAI_WEBSITE_URL}/f/${token}`;
}
