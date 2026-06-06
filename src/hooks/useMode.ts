import { useCallback, useEffect, useRef } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { getMode, MODES, DEFAULT_MODE_ID, normalizeEnabledModes, type AppMode, type ModeId } from '@/config/modes';

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

/** True if id maps to a mode that is currently enabled. */
function isModeAvailable(id: string | null | undefined): boolean {
  return !!(id && id in MODES && MODES[id as ModeId].enabled);
}

/**
 * Active Mode for the current user.
 *
 * Network Marketing is the permanent home. If a user's stored `profile.mode`
 * points to a disabled mode (e.g. Founder), fall back to Network Marketing and
 * write the cleanup back so they're never stranded.
 */
export function useMode(): {
  mode: AppMode;
  modeId: ModeId;
  t: (key: string) => string;
} {
  const { profile, updateProfile } = useProfile() as {
    profile: { mode?: string; enabled_modes?: unknown } | null | undefined;
    updateProfile: (patch: Record<string, unknown>) => Promise<unknown>;
  };

  const rawMode = profile?.mode ?? readCachedMode() ?? undefined;
  const resolvedId: ModeId = isModeAvailable(rawMode) ? (rawMode as ModeId) : DEFAULT_MODE_ID;
  const mode = getMode(resolvedId);

  const repairedRef = useRef(false);
  useEffect(() => {
    const dbMode = profile?.mode;
    if (dbMode && !isModeAvailable(dbMode) && !repairedRef.current) {
      repairedRef.current = true;
      const cleanedEnabled = normalizeEnabledModes(profile?.enabled_modes).filter((id) => isModeAvailable(id));
      writeCachedMode(DEFAULT_MODE_ID);
      Promise.resolve(updateProfile({ mode: DEFAULT_MODE_ID, enabled_modes: cleanedEnabled })).catch(() => {
        repairedRef.current = false;
      });
    } else if (dbMode && isModeAvailable(dbMode)) {
      writeCachedMode(dbMode);
    }
  }, [profile, updateProfile]);

  const t = useCallback(
    (key: string) => mode.terms[key] ?? key,
    [mode],
  );

  return { mode, modeId: mode.id, t };
}
