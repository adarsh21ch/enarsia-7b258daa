/**
 * Central display-name mapping for subscription tiers.
 *
 * Internal DB values (`basic`, `pro`, `premium`) stay unchanged.
 * This file controls ONLY what users see in the UI.
 */

import { Crown, Gem } from 'lucide-react';

export type InternalTier = 'basic' | 'pro' | 'premium';

/** User-facing tier names */
export const TIER_DISPLAY_NAME: Record<InternalTier, string> = {
  basic: 'Free',
  pro: 'Basic',
  premium: 'Pro',
};

/** Icons per tier (basic/Free has none) */
export const TIER_ICON: Record<InternalTier, typeof Crown | typeof Gem | null> = {
  basic: null,
  pro: Crown,
  premium: Gem,
};

/** Semantic colour tokens per tier */
export const TIER_COLOR: Record<InternalTier, string> = {
  basic: 'muted',
  pro: 'primary',
  premium: 'amber',
};

/** Admin panel emoji labels */
export const TIER_ADMIN_LABEL: Record<InternalTier, string> = {
  basic: '🆓 Free',
  pro: '⭐ Basic',
  premium: '💎 Pro',
};

/**
 * Given an internal tier, return the display name.
 * Falls back to the raw tier string if unknown.
 */
export function getTierDisplayName(tier: string): string {
  return TIER_DISPLAY_NAME[tier as InternalTier] ?? tier;
}
