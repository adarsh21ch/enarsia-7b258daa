import type { AppMode, ModeId } from './types';
import { networkMarketingMode } from './networkMarketing';
import { contentCreatorMode } from './contentCreator';
import { founderMode } from './founder';

export * from './types';

/**
 * Base profession everyone has. Signup defaults here; it is never an "add-on"
 * and is always present in a user's enabled professions.
 */
export const DEFAULT_MODE_ID: ModeId = 'network_marketing';
export const BASE_MODE_ID: ModeId = 'network_marketing';

/** Registry of all modes, keyed by id. */
export const MODES: Record<ModeId, AppMode> = {
  network_marketing: networkMarketingMode,
  content_creator: contentCreatorMode,
  founder: founderMode,
};

/** Resolve a mode by id, falling back to the default for unknown/empty values. */
export function getMode(id: string | null | undefined): AppMode {
  if (id && id in MODES) return MODES[id as ModeId];
  return MODES[DEFAULT_MODE_ID];
}

/** Modes that are live (built enough to use). */
export function getEnabledModes(): AppMode[] {
  return Object.values(MODES).filter((m) => m.enabled);
}

/**
 * Professions a user can ADD on top of their base (Network Marketing). These
 * are the live, non-base modes — e.g. Content Creator. Founder stays out until
 * it's built (`enabled: false`).
 */
export function getAddonModes(): AppMode[] {
  return Object.values(MODES).filter((m) => m.enabled && m.id !== BASE_MODE_ID);
}

/** Normalise a user's stored profession list to valid, base-inclusive ids. */
export function normalizeEnabledModes(raw: unknown): ModeId[] {
  const ids = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  const valid = ids.filter((id): id is ModeId => id in MODES);
  if (!valid.includes(BASE_MODE_ID)) valid.unshift(BASE_MODE_ID);
  return Array.from(new Set(valid));
}
