import { useAdminConfig, FeatureFlag } from './useAdminConfig';
import { useFunnelSubscription } from './useFunnelSubscription';
import { useMemo } from 'react';

export interface FunnelFeatureAccessResult {
  canAccess: boolean;
  limit: number | null;
  feature: FeatureFlag | null;
  isLoading: boolean;
  isFunnelsPro: boolean;
}

/**
 * Check if the current user can access a funnel-specific feature.
 * Uses the user's FUNNEL subscription (not app subscription) to determine access.
 * Feature flags are from admin_feature_flags with category "funnels".
 */
export function useFunnelFeatureAccess(featureKey: string): FunnelFeatureAccessResult {
  const { config, loading: configLoading } = useAdminConfig();
  const { isFunnelsPro, loading: subLoading } = useFunnelSubscription();

  const isLoading = configLoading || subLoading;

  return useMemo(() => {
    const feature = config.features[featureKey] ?? null;

    // If feature doesn't exist in config, default to allowing access
    if (!feature) {
      return { canAccess: true, limit: null, feature: null, isLoading, isFunnelsPro };
    }

    // Check if feature is globally disabled
    if (!feature.is_enabled) {
      return { canAccess: false, limit: null, feature, isLoading, isFunnelsPro };
    }

    // Funnel Pro users get pro-tier access
    if (isFunnelsPro) {
      return {
        canAccess: feature.pro_access,
        limit: feature.pro_limit,
        feature,
        isLoading,
        isFunnelsPro,
      };
    }

    // Free users
    return {
      canAccess: feature.free_access,
      limit: feature.free_limit,
      feature,
      isLoading,
      isFunnelsPro,
    };
  }, [config.features, featureKey, isFunnelsPro, isLoading]);
}
