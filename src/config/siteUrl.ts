/**
 * Single source of truth for the published app URL used in auth email redirects.
 * IMPORTANT: keep this value in sync with your published domain.
 */
export const PUBLISHED_APP_URL = "https://app.nevorai.com";

export function getPublishedAppUrl(): string {
  return PUBLISHED_APP_URL;
}

export function getPasswordRecoveryRedirectUrl(): string {
  return `${PUBLISHED_APP_URL}/reset-password`;
}
