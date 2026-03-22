import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

// =============================================
// TYPES
// =============================================

export type SubscriptionTier = 'basic' | 'pro' | 'premium';

export interface SubscriptionPlan {
  id: string;
  plan_key: string;
  plan_name: string;
  display_name?: string | null;
  description: string | null;
  price_inr: number;
  duration_days: number;
  payment_link: string | null;
  billing_type: 'one_time' | 'recurring';
  razorpay_plan_id: string | null;
  tier: SubscriptionTier;
  features: string[];
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  badge_text: string | null;
}

export interface Offer {
  id: string;
  offer_name: string;
  discount_type: 'percent' | 'flat';
  discount_value: number;
  applicable_plan_ids: string[];
  start_date: string;
  end_date: string;
  is_active: boolean;
  max_uses_per_user: number | null;
  promo_code: string | null;
  offer_payment_link: string | null;
}

export interface FeatureFlag {
  feature_name: string;
  description: string | null;
  free_access: boolean;
  pro_access: boolean;
  trial_access: boolean;
  is_enabled: boolean;
  free_limit: number | null;
  pro_limit: number | null;
  trial_limit: number | null;
  category: string;
  /** New tier-based fields */
  required_tier: SubscriptionTier;
  module: 'application' | 'trackup' | 'funnels';
}

export interface TieredLimit {
  module: string;
  basic_value: number | null;
  pro_value: number | null;
  premium_value: number | null;
  is_enabled: boolean;
  description: string | null;
}

export interface AppConfig {
  plans: SubscriptionPlan[];
  offers: Offer[];
  limits: Record<string, number>;
  limits_enabled: Record<string, boolean>;
  limits_tiered: Record<string, TieredLimit>;
  features: Record<string, FeatureFlag>;
}

/** Tier hierarchy helper: returns numeric rank for comparison */
export const TIER_RANK: Record<SubscriptionTier, number> = {
  basic: 0,
  pro: 1,
  premium: 2,
};

/** Check if userTier meets or exceeds requiredTier */
export function meetsRequiredTier(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

// =============================================
// SAFE DEFAULTS - Used when config fetch fails
// =============================================

export const SAFE_DEFAULTS: AppConfig = {
  plans: [
    {
      id: 'default-pro-6-months',
      plan_key: 'pro_6_months',
      plan_name: 'Basic 6-Month',
      description: '6 Months Access – Best Value',
      price_inr: 299,
      duration_days: 180,
      payment_link: 'https://rzp.io/rzp/CPQRHdp',
      billing_type: 'one_time' as const,
      razorpay_plan_id: null,
      tier: 'pro' as SubscriptionTier,
      features: [
        'Unlimited prospects',
        'Auto-sync from teammates',
        'View team member tracking',
        'Team actions & dashboards',
        'Switch tracking source',
      ],
      is_active: true,
      is_default: true,
      sort_order: 1,
      badge_text: 'Best Value',
    },
    {
      id: 'default-monthly',
      plan_key: 'monthly',
      plan_name: 'Basic Monthly',
      description: '1 Month Access',
      price_inr: 99,
      duration_days: 30,
      payment_link: 'https://rzp.io/rzp/HhAdokE',
      billing_type: 'one_time' as const,
      razorpay_plan_id: null,
      tier: 'pro' as SubscriptionTier,
      features: [
        'Unlimited prospects',
        'Manual personal tracking',
        'Manual team tracking (self-entered)',
        'Auto-calculated totals',
      ],
      is_active: true,
      is_default: false,
      sort_order: 2,
      badge_text: null,
    },
  ],
  offers: [],
  limits: {
    // Trial Period (disabled by default)
    free_trial_days: 0,
    trial_only_mode: 0,
    // Lead Limits
    free_total_leads: 200,
    free_daily_upload: 50,
    pro_daily_upload: 500,
    // Warning Thresholds
    warning_threshold_1: 100,
    warning_threshold_2: 150,
    warning_threshold_3: 190,
    // Hard Limits
    hard_limit: 200,
  },
  limits_enabled: {
    free_trial_days: false,
    trial_only_mode: false,
    free_total_leads: true,
    free_daily_upload: true,
    pro_daily_upload: true,
    warning_threshold_1: true,
    warning_threshold_2: true,
    warning_threshold_3: true,
    hard_limit: true,
  },
  limits_tiered: {},
  features: {
    insights: { feature_name: 'View Insights', description: null, free_access: true, pro_access: true, trial_access: true, is_enabled: true, free_limit: null, pro_limit: null, trial_limit: null, category: 'analytics', required_tier: 'basic', module: 'application' },
    export: { feature_name: 'Export Data', description: null, free_access: true, pro_access: true, trial_access: true, is_enabled: true, free_limit: null, pro_limit: null, trial_limit: null, category: 'export', required_tier: 'basic', module: 'application' },
    ai_tips: { feature_name: 'AI Tips', description: null, free_access: true, pro_access: true, trial_access: true, is_enabled: true, free_limit: null, pro_limit: null, trial_limit: null, category: 'analytics', required_tier: 'basic', module: 'application' },
    team_sync: { feature_name: 'Team Sync', description: null, free_access: false, pro_access: true, trial_access: true, is_enabled: true, free_limit: null, pro_limit: null, trial_limit: null, category: 'team', required_tier: 'pro', module: 'application' },
    team_view: { feature_name: 'Team View', description: null, free_access: false, pro_access: true, trial_access: true, is_enabled: true, free_limit: null, pro_limit: null, trial_limit: null, category: 'team', required_tier: 'pro', module: 'application' },
  },
};

// =============================================
// FETCH FUNCTION
// =============================================

async function fetchAppConfig(): Promise<AppConfig> {
  const { data, error } = await supabase.rpc('get_app_config');
  
  if (error) {
    console.error('Error fetching app config:', error);
    return SAFE_DEFAULTS;
  }
  
  // Parse and validate the response - cast through unknown first for safety
  const config = (data as unknown) as {
    plans: SubscriptionPlan[] | null;
    offers: Offer[] | null;
    limits: Record<string, number> | null;
    limits_tiered: Record<string, TieredLimit> | null;
    features: Record<string, FeatureFlag> | null;
  } | null;
  
  if (!config) return SAFE_DEFAULTS;
  
  return {
    plans: config.plans && config.plans.length > 0 ? config.plans : SAFE_DEFAULTS.plans,
    offers: config.offers || [],
    limits: { ...SAFE_DEFAULTS.limits, ...(config.limits || {}) },
    limits_enabled: { ...SAFE_DEFAULTS.limits_enabled, ...((config as any).limits_enabled || {}) },
    limits_tiered: { ...SAFE_DEFAULTS.limits_tiered, ...(config.limits_tiered || {}) },
    features: { ...SAFE_DEFAULTS.features, ...(config.features || {}) },
  };
}

// =============================================
// MAIN HOOK
// =============================================

export function useAdminConfig() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-config'],
    queryFn: fetchAppConfig,
    staleTime: 30 * 1000, // 30 seconds - ensures fresh data on navigation
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: 'always', // Always refetch when component mounts for fresh data
  });

  const config = useMemo<AppConfig>(() => data || SAFE_DEFAULTS, [data]);

  // Helper to get a specific limit with fallback
  const getLimit = (key: string, fallback: number = 0): number => {
    return config.limits[key] ?? SAFE_DEFAULTS.limits[key] ?? fallback;
  };

  // Get active plans sorted by sort_order
  const activePlans = useMemo(() => {
    return config.plans
      .filter(p => p.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [config.plans]);

  // Get default plan
  const defaultPlan = useMemo(() => {
    return activePlans.find(p => p.is_default) || activePlans[0];
  }, [activePlans]);

  // Get active offers that apply to a specific plan
  const getOffersForPlan = (planId: string): Offer[] => {
    return config.offers.filter(o => 
      o.is_active && o.applicable_plan_ids.includes(planId)
    );
  };

  return {
    config,
    loading: isLoading,
    error,
    refetch,
    getLimit,
    activePlans,
    defaultPlan,
    getOffersForPlan,
  };
}

// =============================================
// ADMIN-ONLY HOOKS FOR CRUD OPERATIONS
// =============================================

export function useAdminPlans() {
  const queryClient = useQueryClient();
  
  const { data: plans, isLoading, refetch } = useQuery({
    queryKey: ['admin-plans-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_subscription_plans')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });

  const invalidateAllCaches = () => {
    // Invalidate both admin and user-facing config caches
    queryClient.invalidateQueries({ queryKey: ['admin-plans-all'] });
    queryClient.invalidateQueries({ queryKey: ['admin-config'] });
  };

  const createPlan = async (plan: Partial<SubscriptionPlan>) => {
    const { data, error } = await supabase
      .from('admin_subscription_plans')
      .insert([plan as any])
      .select()
      .single();
    if (error) throw error;
    invalidateAllCaches();
    return data;
  };

  const updatePlan = async (id: string, updates: Partial<SubscriptionPlan>) => {
    const { data, error } = await supabase
      .from('admin_subscription_plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    invalidateAllCaches();
    return data;
  };

  const reorderPlans = async (reorderedPlans: Array<Pick<SubscriptionPlan, 'id' | 'sort_order'>>) => {
    const results = await Promise.all(
      reorderedPlans.map((plan) =>
        supabase
          .from('admin_subscription_plans')
          .update({ sort_order: plan.sort_order })
          .eq('id', plan.id)
      )
    );

    const failedResult = results.find((result) => result.error);
    if (failedResult?.error) throw failedResult.error;

    invalidateAllCaches();
  };

  const deletePlan = async (id: string) => {
    const { error } = await supabase
      .from('admin_subscription_plans')
      .delete()
      .eq('id', id);
    if (error) throw error;
    invalidateAllCaches();
  };

  return { plans: plans || [], loading: isLoading, createPlan, updatePlan, reorderPlans, deletePlan, refetch };
}

export function useAdminOffers() {
  const queryClient = useQueryClient();
  
  const { data: offers, isLoading, refetch } = useQuery({
    queryKey: ['admin-offers-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_offers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Offer[];
    },
  });

  const invalidateAllCaches = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-offers-all'] });
    queryClient.invalidateQueries({ queryKey: ['admin-config'] });
  };

  const createOffer = async (offer: Partial<Offer>) => {
    const { data, error } = await supabase
      .from('admin_offers')
      .insert([offer as any])
      .select()
      .single();
    if (error) throw error;
    invalidateAllCaches();
    return data;
  };

  const updateOffer = async (id: string, updates: Partial<Offer>) => {
    const { data, error } = await supabase
      .from('admin_offers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    invalidateAllCaches();
    return data;
  };

  const deleteOffer = async (id: string) => {
    const { error } = await supabase
      .from('admin_offers')
      .delete()
      .eq('id', id);
    if (error) throw error;
    invalidateAllCaches();
  };

  return { offers: offers || [], loading: isLoading, createOffer, updateOffer, deleteOffer, refetch };
}

export function useAdminUsageLimits() {
  const queryClient = useQueryClient();
  
  const { data: limits, isLoading, refetch } = useQuery({
    queryKey: ['admin-usage-limits-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_usage_limits')
        .select('*')
        .order('config_key');
      if (error) throw error;
      return data;
    },
  });

  const invalidateAllCaches = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-usage-limits-all'] });
    queryClient.invalidateQueries({ queryKey: ['admin-config'] });
  };

  const updateLimit = async (id: string, updates: {
    config_value?: number;
    is_enabled?: boolean;
    module?: string;
    basic_value?: number | null;
    pro_value?: number | null;
    premium_value?: number | null;
  }) => {
    // Keep config_value synced with basic_value for backward compat
    const payload: any = { ...updates };
    if (updates.basic_value !== undefined && updates.config_value === undefined) {
      payload.config_value = updates.basic_value ?? 0;
    }
    const { error } = await supabase
      .from('admin_usage_limits')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
    invalidateAllCaches();
  };

  const createLimit = async (config_key: string, config_value: number, description: string) => {
    const { error } = await supabase
      .from('admin_usage_limits')
      .insert({ config_key, config_value, description, basic_value: config_value });
    if (error) throw error;
    invalidateAllCaches();
  };

  return { limits: limits || [], loading: isLoading, updateLimit, createLimit, refetch };
}

export function useAdminFeatureFlags() {
  const queryClient = useQueryClient();
  
  const { data: flags, isLoading, refetch } = useQuery({
    queryKey: ['admin-feature-flags-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_feature_flags')
        .select('*')
        .order('feature_key');
      if (error) throw error;
      return data;
    },
  });

  const invalidateAllCaches = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-feature-flags-all'] });
    queryClient.invalidateQueries({ queryKey: ['admin-config'] });
  };

  const updateFlag = async (id: string, updates: Partial<{
    free_access: boolean;
    pro_access: boolean;
    trial_access: boolean;
    is_enabled: boolean;
    free_limit: number | null;
    pro_limit: number | null;
    trial_limit: number | null;
    category: string;
    required_tier: string;
    module: string;
  }>) => {
    const { error } = await supabase
      .from('admin_feature_flags')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
    invalidateAllCaches();
  };

  const createFlag = async (flag: {
    feature_key: string;
    feature_name: string;
    description?: string;
    category?: string;
    free_access?: boolean;
    pro_access?: boolean;
    trial_access?: boolean;
    free_limit?: number | null;
    pro_limit?: number | null;
    trial_limit?: number | null;
    required_tier?: string;
    module?: string;
  }) => {
    const { error } = await supabase
      .from('admin_feature_flags')
      .insert(flag);
    if (error) throw error;
    invalidateAllCaches();
  };

  return { flags: flags || [], loading: isLoading, updateFlag, createFlag, refetch };
}

export function useAdminUserOverrides() {
  const { data: overrides, isLoading, refetch } = useQuery({
    queryKey: ['admin-user-overrides-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_user_overrides')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createOrUpdateOverride = async (userId: string, updates: {
    force_pro_access?: boolean;
    custom_daily_limit?: number | null;
    custom_total_limit?: number | null;
    custom_expiry_date?: string | null;
    notes?: string;
  }) => {
    const { error } = await supabase
      .from('admin_user_overrides')
      .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' });
    if (error) throw error;
    refetch();
  };

  const deleteOverride = async (userId: string) => {
    const { error } = await supabase
      .from('admin_user_overrides')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
    refetch();
  };

  return { overrides: overrides || [], loading: isLoading, createOrUpdateOverride, deleteOverride, refetch };
}
