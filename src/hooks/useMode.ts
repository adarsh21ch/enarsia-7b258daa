import { useCallback, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { getMode, type AppMode, type ModeId } from '@/config/modes';

export const ACTIVE_MODE_STORAGE_KEY = 'enarsia_active_mode';

/** Eagerly read the last active mode from localStorage (safe in SSR/non-browser). */
function readCachedMode(): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(ACTIVE_MODE_STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

export function writeCachedMode(modeId: string) {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(ACTIVE_MODE_STORAGE_KEY, modeId);
  } catch {
    /* ignore */
  }
}

/**
 * Active Mode for the current user.
 *
 * Reads `profile.mode`. While the profile query is still loading, falls back
 * to a localStorage-cached mode so the bottom nav doesn't flash the default.
 * Mirrors `profile.mode` back to localStorage whenever it changes.
 */
export function useMode(): {
  mode: AppMode;
  modeId: ModeId;
  t: (key: string) => string;
} {
  const { profile } = useProfile();
  const rawMode = (profile as { mode?: string } | null | undefined)?.mode ?? readCachedMode() ?? undefined;
  const mode = getMode(rawMode);

  // Keep the cache in sync with the authoritative DB value.
  useEffect(() => {
    const dbMode = (profile as { mode?: string } | null | undefined)?.mode;
    if (dbMode) writeCachedMode(dbMode);
  }, [profile]);

  const t = useCallback(
    (key: string) => mode.terms[key] ?? key,
    [mode],
  );

  return { mode, modeId: mode.id, t };
}
