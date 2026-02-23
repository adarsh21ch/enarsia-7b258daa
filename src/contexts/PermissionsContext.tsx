import React, { createContext, useContext, useMemo } from 'react';
import { useAdminConfig, FeatureFlag, meetsRequiredTier, SubscriptionTier } from '@/hooks/useAdminConfig';
import { useSubscription } from '@/hooks/useSubscription';
import { useFreeTrial } from '@/hooks/useFreeTrial';

interface FeaturePermission {
  canAccess: boolean;
  limit: number | null;
}

interface PermissionsContextValue {
  /** Check if a specific feature is accessible */
  checkFeature: (featureKey: string) => boolean;
  /** Get the numeric limit for a feature (null = unlimited) */
  getLimit: (featureKey: string) => number | null;
  /** Get full permission info for a feature */
  getPermission: (featureKey: string) => FeaturePermission;
  /** All computed permissions */
  permissions: Record<string, FeaturePermission>;
  /** User's current tier */
  userTier: SubscriptionTier;
  /** Whether user is on a paid plan */
  isPaid: boolean;
  /** Whether user is Pro or higher */
  isPro: boolean;
  /** Whether user is Pro tier */
  isPremium: boolean;
  /** Whether trial is active */
  isTrialActive: boolean;
  /** Loading state */
  isLoading: boolean;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { config, loading: configLoading } = useAdminConfig();
  const { userTier, isPaid, isPro, isPremium, loading: subLoading } = useSubscription();
  const { isTrialActive, loading: trialLoading } = useFreeTrial();

  const isLoading = configLoading || subLoading || trialLoading;

  // Effective tier: trial users get pro-level access
  const effectiveTier: SubscriptionTier = isTrialActive && userTier === 'basic' ? 'pro' : userTier;

  // Compute all permissions once from the config
  const permissions = useMemo(() => {
    const map: Record<string, FeaturePermission> = {};

    for (const [key, feature] of Object.entries(config.features)) {
      if (!feature.is_enabled) {
        map[key] = { canAccess: false, limit: null };
        continue;
      }

      // Tier-based access check
      const canAccess = meetsRequiredTier(effectiveTier, feature.required_tier);

      // Determine limit from tiered limits or legacy
      let limit: number | null = null;
      const tieredLimit = config.limits_tiered[key];
      if (tieredLimit) {
        if (effectiveTier === 'premium') limit = tieredLimit.premium_value;
        else if (effectiveTier === 'pro') limit = tieredLimit.pro_value;
        else limit = tieredLimit.basic_value;
      } else {
        // Legacy fallback
        if (isTrialActive) limit = feature.trial_limit;
        else if (isPaid) limit = feature.pro_limit;
        else limit = feature.free_limit;
      }

      map[key] = { canAccess, limit };
    }

    return map;
  }, [config.features, config.limits_tiered, effectiveTier, isPaid, isTrialActive]);

  const checkFeature = (featureKey: string): boolean => {
    return permissions[featureKey]?.canAccess ?? true;
  };

  const getLimit = (featureKey: string): number | null => {
    return permissions[featureKey]?.limit ?? null;
  };

  const getPermission = (featureKey: string): FeaturePermission => {
    return permissions[featureKey] ?? { canAccess: true, limit: null };
  };

  const value = useMemo(() => ({
    checkFeature,
    getLimit,
    getPermission,
    permissions,
    userTier,
    isPaid,
    isPro,
    isPremium,
    isTrialActive,
    isLoading,
  }), [permissions, userTier, isPaid, isPro, isPremium, isTrialActive, isLoading]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

/**
 * Access the global permissions context.
 * Must be used within <PermissionsProvider>.
 */
export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error('usePermissions must be used within <PermissionsProvider>');
  }
  return ctx;
}
