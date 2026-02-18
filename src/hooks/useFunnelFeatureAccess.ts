import { useAdminConfig, FeatureFlag, meetsRequiredTier, SubscriptionTier } from './useAdminConfig';
import { useFunnelSubscription } from './useFunnelSubscription';
import { useMemo } from 'react';

export interface FunnelFeatureAccessResult {
  canAccess: boolean;
  limit: number | null;
  feature: FeatureFlag | null;
  isLoading: boolean;
  isFunnelsPro: boolean;
  funnelTier: SubscriptionTier;
}

/**
 * Check if the current user can access a funnel-specific feature.
 * Uses tier-based check with fallback to legacy boolean logic.
 */
export function useFunnelFeatureAccess(featureKey: string): FunnelFeatureAccessResult {
  const { config, loading: configLoading } = useAdminConfig();
  const { isFunnelsPro, funnelTier, loading: subLoading } = useFunnelSubscription();

  const isLoading = configLoading || subLoading;

  return useMemo(() => {
    const feature = config.features[featureKey] ?? null;

    if (!feature) {
      return { canAccess: true, limit: null, feature: null, isLoading, isFunnelsPro, funnelTier };
    }

    if (!feature.is_enabled) {
      return { canAccess: false, limit: null, feature, isLoading, isFunnelsPro, funnelTier };
    }

    // Tier-based access check
    const hasAccess = meetsRequiredTier(funnelTier, feature.required_tier);

    // Determine limit
    let limit: number | null = null;
    const tieredLimit = config.limits_tiered[featureKey];
    if (tieredLimit) {
      if (funnelTier === 'premium') limit = tieredLimit.premium_value;
      else if (funnelTier === 'pro') limit = tieredLimit.pro_value;
      else limit = tieredLimit.basic_value;
    } else {
      // Legacy fallback
      limit = isFunnelsPro ? feature.pro_limit : feature.free_limit;
    }

    return { canAccess: hasAccess, limit, feature, isLoading, isFunnelsPro, funnelTier };
  }, [config.features, config.limits_tiered, featureKey, funnelTier, isFunnelsPro, isLoading]);
}
