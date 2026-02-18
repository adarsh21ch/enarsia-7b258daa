import { useAdminConfig, FeatureFlag, meetsRequiredTier, SubscriptionTier } from './useAdminConfig';
import { useSubscription } from './useSubscription';
import { useFreeTrial } from './useFreeTrial';
import { useMemo } from 'react';

export type AccessReason = 
  | 'allowed'
  | 'feature_not_found'
  | 'feature_disabled'
  | 'plan_restriction'
  | 'trial_active'
  | 'trial_expired';

export interface FeatureAccessResult {
  canAccess: boolean;
  limit: number | null;
  feature: FeatureFlag | null;
  isLoading: boolean;
  reason: AccessReason;
}

/**
 * Central hook to check if the current user has access to a specific feature.
 * Uses tier-based check (required_tier) with fallback to legacy boolean logic.
 */
export function useFeatureAccess(featureKey: string): FeatureAccessResult {
  const { config, loading: configLoading } = useAdminConfig();
  const { isPaid, userTier, loading: subLoading } = useSubscription();
  const { isTrialActive, loading: trialLoading } = useFreeTrial();

  const isLoading = configLoading || subLoading || trialLoading;

  return useMemo(() => {
    const feature = config.features[featureKey] ?? null;

    if (!feature) {
      return { canAccess: true, limit: null, feature: null, isLoading, reason: 'feature_not_found' as AccessReason };
    }

    if (!feature.is_enabled) {
      return { canAccess: false, limit: null, feature, isLoading, reason: 'feature_disabled' as AccessReason };
    }

    // NEW: Tier-based access check (primary path)
    // Determine effective tier: trial users get pro-level access
    const effectiveTier: SubscriptionTier = isTrialActive && userTier === 'basic' ? 'pro' : userTier;
    const hasAccess = meetsRequiredTier(effectiveTier, feature.required_tier);

    // Determine limit based on effective tier
    let limit: number | null = null;
    const tieredLimit = config.limits_tiered[featureKey];
    if (tieredLimit) {
      if (effectiveTier === 'premium') limit = tieredLimit.premium_value;
      else if (effectiveTier === 'pro') limit = tieredLimit.pro_value;
      else limit = tieredLimit.basic_value;
    } else {
      // Fallback to legacy limits
      if (isTrialActive) limit = feature.trial_limit;
      else if (isPaid) limit = feature.pro_limit;
      else limit = feature.free_limit;
    }

    const reason: AccessReason = hasAccess
      ? (isTrialActive ? 'trial_active' : 'allowed')
      : 'plan_restriction';

    return { canAccess: hasAccess, limit, feature, isLoading, reason };
  }, [config.features, config.limits_tiered, featureKey, isPaid, userTier, isTrialActive, isLoading]);
}

/**
 * Hook to check multiple features at once.
 * Uses tier-based logic with fallback to legacy booleans.
 */
export function useMultipleFeatureAccess(featureKeys: string[]) {
  const { config, loading: configLoading } = useAdminConfig();
  const { userTier, loading: subLoading } = useSubscription();
  const { isTrialActive, loading: trialLoading } = useFreeTrial();

  const isLoading = configLoading || subLoading || trialLoading;

  return useMemo(() => {
    const accessMap: Record<string, { canAccess: boolean; limit: number | null }> = {};
    const effectiveTier: SubscriptionTier = isTrialActive && userTier === 'basic' ? 'pro' : userTier;

    for (const key of featureKeys) {
      const feature = config.features[key];
      if (!feature || !feature.is_enabled) {
        accessMap[key] = { canAccess: !feature, limit: null };
        continue;
      }

      const hasAccess = meetsRequiredTier(effectiveTier, feature.required_tier);

      let limit: number | null = null;
      const tieredLimit = config.limits_tiered[key];
      if (tieredLimit) {
        if (effectiveTier === 'premium') limit = tieredLimit.premium_value;
        else if (effectiveTier === 'pro') limit = tieredLimit.pro_value;
        else limit = tieredLimit.basic_value;
      }

      accessMap[key] = { canAccess: hasAccess, limit };
    }

    const allAllowed = featureKeys.every(key => accessMap[key]?.canAccess);
    const anyAllowed = featureKeys.some(key => accessMap[key]?.canAccess);

    return { accessMap, allAllowed, anyAllowed, isLoading };
  }, [config.features, config.limits_tiered, featureKeys, userTier, isTrialActive, isLoading]);
}
