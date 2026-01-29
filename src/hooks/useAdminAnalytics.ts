import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DailySignup {
  date: string;
  count: number;
}

export interface SubscriptionBreakdown {
  plan: string;
  count: number;
  active_count: number;
}

export interface PaymentLog {
  id: string;
  created_at: string;
  user_email: string | null;
  user_display_name: string | null;
  amount: number | null;
  status: string | null;
  event_type: string;
  razorpay_payment_id: string | null;
}

export interface RevenueStats {
  totalRevenue: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  monthlyPlanRevenue: number;
  quarterlyPlanRevenue: number;
  monthlyPlanCount: number;
  quarterlyPlanCount: number;
}

export interface ProUser {
  user_id: string;
  display_name: string | null;
  email: string | null;
  neverai_id: string | null;
  plan: string;
  subscribed_at: string | null;
  expires_at: string | null;
  is_admin_override: boolean;
  is_expired: boolean;
  days_remaining: number | null;
  payment_amount: number | null;
}

export interface FreeUser {
  user_id: string;
  display_name: string | null;
  email: string | null;
  neverai_id: string | null;
  leads_count: number;
  last_active: string | null;
  created_at: string;
}

export interface ActiveUsageStats {
  leadsImportersToday: number;
  leadsImportersWeek: number;
  activeCallersToday: number;
  activeCallersWeek: number;
}

export interface ExpiringSubscription {
  user_id: string;
  display_name: string | null;
  email: string | null;
  neverai_id: string | null;
  plan: string;
  expires_at: string;
  days_remaining: number;
}

export interface RevenueTrend {
  date: string;
  revenue: number;
  payment_count: number;
}

export interface PowerUser {
  user_id: string;
  display_name: string | null;
  email: string | null;
  neverai_id: string | null;
  leads_this_week: number;
  total_leads: number;
  last_active: string | null;
}

export interface ConversionAnalytics {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  conversionRate: number;
  conversionsThisMonth: number;
  conversionsLastMonth: number;
}

export interface AdminAnalytics {
  dailySignups: DailySignup[];
  subscriptionBreakdown: SubscriptionBreakdown[];
  recentPayments: PaymentLog[];
  // Core metrics
  neveraiTotalUsers: number;
  neveraiTodayActive: number;
  neveraiWeekActive: number;
  activeProUsers: number;
  totalLeads: number;
  todayLeads: number;
  weekLeads: number;
  monthLeads: number;
  totalSignups: number;
  freeUsersCount: number;
  // Active usage stats
  activeUsage: ActiveUsageStats;
  // Revenue stats
  revenue: RevenueStats;
  // Conversion analytics
  conversion: ConversionAnalytics;
}

export function useAdminAnalytics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-analytics', user?.id],
    queryFn: async (): Promise<AdminAnalytics> => {
      const now = new Date();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch all data in parallel
      const [analyticsRes, profilesRes, subscriptionsRes, paymentsRes, totalSignupsRes, revenueRes, usageRes, conversionRes] = await Promise.all([
        // Get core metrics from single source of truth function
        supabase.rpc('admin_get_analytics'),
        
        // Get profiles for signup analysis (last 30 days)
        supabase
          .from('profiles')
          .select('created_at')
          .gte('created_at', monthAgo)
          .order('created_at', { ascending: true }),
        
        // Get subscription breakdown
        supabase
          .from('user_subscriptions')
          .select('plan, expires_at'),
        
        // Get recent payments with user info (deduplicated, from Jan 17, 2026)
        supabase.rpc('admin_get_recent_payments', { limit_count: 50 }),
        
        // Get total signups count
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true }),

        // Get revenue stats
        supabase.rpc('admin_get_revenue_stats'),

        // Get active usage stats
        supabase.rpc('admin_get_active_usage_stats'),

        // Get conversion analytics
        supabase.rpc('admin_get_conversion_analytics'),
      ]);

      // Extract core metrics from single source
      const metrics = analyticsRes.data?.[0] || {
        neverai_total_users: 0,
        neverai_today_active: 0,
        neverai_week_active: 0,
        active_pro_users: 0,
        total_leads: 0,
        today_leads: 0,
        week_leads: 0,
        month_leads: 0,
      };

      // Process daily signups for chart
      const signupsByDate: Record<string, number> = {};

      if (profilesRes.data) {
        profilesRes.data.forEach(profile => {
          const date = profile.created_at?.split('T')[0];
          if (date) {
            signupsByDate[date] = (signupsByDate[date] || 0) + 1;
          }
        });
      }

      // Create daily signups array for last 14 days
      const dailySignups: DailySignup[] = [];
      for (let i = 13; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        dailySignups.push({
          date: dateStr,
          count: signupsByDate[dateStr] || 0
        });
      }

      // Process subscription breakdown
      const breakdown: Record<string, { count: number; active_count: number }> = {
        free: { count: 0, active_count: 0 },
        mini: { count: 0, active_count: 0 },
        pro: { count: 0, active_count: 0 }
      };

      let freeUsersCount = 0;

      if (subscriptionsRes.data) {
        subscriptionsRes.data.forEach(sub => {
          const plan = sub.plan || 'free';
          if (!breakdown[plan]) {
            breakdown[plan] = { count: 0, active_count: 0 };
          }
          breakdown[plan].count++;
          
          const planStr = plan as string;
          if ((planStr === 'pro' || planStr === 'mini') && sub.expires_at && new Date(sub.expires_at) > now) {
            breakdown[plan].active_count++;
          } else if (planStr === 'free') {
            breakdown[plan].active_count++;
            freeUsersCount++;
          }
        });
      }

      // Calculate free users (total users minus paid users)
      const totalSignups = totalSignupsRes.count || 0;
      const paidUsersCount = (breakdown.pro?.count || 0) + (breakdown.mini?.count || 0);
      freeUsersCount = totalSignups - paidUsersCount;

      const subscriptionBreakdown: SubscriptionBreakdown[] = Object.entries(breakdown).map(
        ([plan, data]) => ({ plan, ...data })
      );

      // Recent payments
      const recentPayments: PaymentLog[] = (paymentsRes.data || []) as PaymentLog[];

      // Revenue stats
      const revenueData = (revenueRes.data?.[0] || {}) as Record<string, unknown>;
      const revenue: RevenueStats = {
        totalRevenue: Number(revenueData.total_revenue) || 0,
        thisMonthRevenue: Number(revenueData.this_month_revenue) || 0,
        lastMonthRevenue: Number(revenueData.last_month_revenue) || 0,
        totalPayments: Number(revenueData.total_payments) || 0,
        successfulPayments: Number(revenueData.successful_payments) || 0,
        failedPayments: Number(revenueData.failed_payments) || 0,
        monthlyPlanRevenue: Number(revenueData.monthly_plan_revenue) || 0,
        quarterlyPlanRevenue: Number(revenueData.quarterly_plan_revenue) || 0,
        monthlyPlanCount: Number(revenueData.monthly_plan_count) || 0,
        quarterlyPlanCount: Number(revenueData.quarterly_plan_count) || 0,
      };

      // Active usage stats
      const usageData = (usageRes.data?.[0] || {}) as Record<string, unknown>;
      const activeUsage: ActiveUsageStats = {
        leadsImportersToday: Number(usageData.leads_importers_today) || 0,
        leadsImportersWeek: Number(usageData.leads_importers_week) || 0,
        activeCallersToday: Number(usageData.active_callers_today) || 0,
        activeCallersWeek: Number(usageData.active_callers_week) || 0,
      };

      // Conversion analytics
      const conversionData = (conversionRes.data?.[0] || {}) as Record<string, unknown>;
      const conversion: ConversionAnalytics = {
        totalUsers: Number(conversionData.total_users) || 0,
        freeUsers: Number(conversionData.free_users) || 0,
        proUsers: Number(conversionData.pro_users) || 0,
        conversionRate: Number(conversionData.conversion_rate) || 0,
        conversionsThisMonth: Number(conversionData.conversions_this_month) || 0,
        conversionsLastMonth: Number(conversionData.conversions_last_month) || 0,
      };

      return {
        dailySignups,
        subscriptionBreakdown,
        recentPayments,
        neveraiTotalUsers: Number(metrics.neverai_total_users) || 0,
        neveraiTodayActive: Number(metrics.neverai_today_active) || 0,
        neveraiWeekActive: Number(metrics.neverai_week_active) || 0,
        activeProUsers: Number(metrics.active_pro_users) || 0,
        totalLeads: Number(metrics.total_leads) || 0,
        todayLeads: Number(metrics.today_leads) || 0,
        weekLeads: Number(metrics.week_leads) || 0,
        monthLeads: Number(metrics.month_leads) || 0,
        totalSignups,
        freeUsersCount,
        activeUsage,
        revenue,
        conversion,
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Hook for Pro Users list
export function useProUsers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-pro-users', user?.id],
    queryFn: async (): Promise<ProUser[]> => {
      console.log('[useProUsers] Fetching pro users...');
      const { data, error } = await supabase.rpc('admin_get_pro_users');
      
      if (error) {
        console.error('[useProUsers] Error:', error);
        throw error;
      }
      
      console.log('[useProUsers] Got data:', data?.length || 0, 'users');
      return (data || []) as ProUser[];
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds - shorter for real-time updates after admin actions
    refetchOnWindowFocus: true,
  });
}

// Hook for Free Users list with pagination
export function useFreeUsers(pageSize: number = 50, pageOffset: number = 0) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-free-users', user?.id, pageSize, pageOffset],
    queryFn: async (): Promise<{ users: FreeUser[]; totalCount: number }> => {
      const { data, error } = await supabase.rpc('admin_get_free_users_paginated', {
        page_size: pageSize,
        page_offset: pageOffset
      });
      if (error) throw error;
      
      const users = (data || []).map((u: any) => ({
        user_id: u.user_id,
        display_name: u.display_name,
        email: u.email,
        neverai_id: u.neverai_id,
        leads_count: u.leads_count,
        last_active: u.last_active,
        created_at: u.created_at,
      }));
      
      const totalCount = data?.[0]?.total_count || 0;
      
      return { users, totalCount };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

// Hook for Expiring Subscriptions
export function useExpiringSubscriptions(daysAhead: number = 7) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-expiring-subscriptions', user?.id, daysAhead],
    queryFn: async (): Promise<ExpiringSubscription[]> => {
      const { data, error } = await supabase.rpc('admin_get_expiring_subscriptions', { 
        days_ahead: daysAhead 
      });
      if (error) throw error;
      return (data || []) as ExpiringSubscription[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

// Hook for Revenue Trend
export function useRevenueTrend(daysBack: number = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-revenue-trend', user?.id, daysBack],
    queryFn: async (): Promise<RevenueTrend[]> => {
      const { data, error } = await supabase.rpc('admin_get_revenue_trend', { 
        days_back: daysBack 
      });
      if (error) throw error;
      return (data || []) as RevenueTrend[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

// Hook for Power Users
export function usePowerUsers(limit: number = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-power-users', user?.id, limit],
    queryFn: async (): Promise<PowerUser[]> => {
      const { data, error } = await supabase.rpc('admin_get_power_users', { 
        limit_count: limit 
      });
      if (error) throw error;
      return (data || []) as PowerUser[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

// ==========================================
// NEW ANALYTICS HOOKS
// ==========================================

export interface TrialAnalytics {
  activeTrials: number;
  expiredTrials: number;
  convertedToPro: number;
  conversionRate: number;
  avgDaysToConvert: number;
  trialsExpiringToday: number;
  day1Users: number;
  day2Users: number;
  day3Users: number;
  day4Users: number;
  day5Users: number;
  day6Users: number;
  day7Users: number;
}

export function useTrialAnalytics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-trial-analytics', user?.id],
    queryFn: async (): Promise<TrialAnalytics> => {
      const { data, error } = await supabase.rpc('admin_get_trial_analytics');
      if (error) throw error;
      const row = (data?.[0] || {}) as Record<string, unknown>;
      return {
        activeTrials: Number(row.active_trials) || 0,
        expiredTrials: Number(row.expired_trials) || 0,
        convertedToPro: Number(row.converted_to_pro) || 0,
        conversionRate: Number(row.trial_conversion_rate) || 0,
        avgDaysToConvert: Number(row.avg_days_to_convert) || 0,
        trialsExpiringToday: Number(row.trials_expiring_today) || 0,
        day1Users: Number(row.day_1_users) || 0,
        day2Users: Number(row.day_2_users) || 0,
        day3Users: Number(row.day_3_users) || 0,
        day4Users: Number(row.day_4_users) || 0,
        day5Users: Number(row.day_5_users) || 0,
        day6Users: Number(row.day_6_users) || 0,
        day7Users: Number(row.day_7_users) || 0,
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

export interface RetentionAnalytics {
  todayActive: number;
  yesterdayActive: number;
  twoThreeDaysActive: number;
  fourSevenDaysActive: number;
  oneTwoWeeksActive: number;
  inactive30Plus: number;
  dau: number;
  wau: number;
  mau: number;
  returningRate: number;
}

export function useRetentionAnalytics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-retention-analytics', user?.id],
    queryFn: async (): Promise<RetentionAnalytics> => {
      const { data, error } = await supabase.rpc('admin_get_retention_analytics');
      if (error) throw error;
      const row = (data?.[0] || {}) as Record<string, unknown>;
      return {
        todayActive: Number(row.today_active) || 0,
        yesterdayActive: Number(row.yesterday_active) || 0,
        twoThreeDaysActive: Number(row.two_three_days_active) || 0,
        fourSevenDaysActive: Number(row.four_seven_days_active) || 0,
        oneTwoWeeksActive: Number(row.one_two_weeks_active) || 0,
        inactive30Plus: Number(row.inactive_30_plus) || 0,
        dau: Number(row.dau) || 0,
        wau: Number(row.wau) || 0,
        mau: Number(row.mau) || 0,
        returningRate: Number(row.returning_rate) || 0,
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

export interface CohortData {
  cohortLabel: string;
  cohortDay: number;
  userCount: number;
  stillActive: number;
  retentionRate: number;
}

export function useCohortAnalytics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-cohort-analytics', user?.id],
    queryFn: async (): Promise<CohortData[]> => {
      const { data, error } = await supabase.rpc('admin_get_signup_cohort_analytics');
      if (error) throw error;
      return ((data || []) as Record<string, unknown>[]).map(row => ({
        cohortLabel: String(row.cohort_label || ''),
        cohortDay: Number(row.cohort_day) || 0,
        userCount: Number(row.user_count) || 0,
        stillActive: Number(row.still_active) || 0,
        retentionRate: Number(row.retention_rate) || 0,
      }));
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

export interface OfferAnalytics {
  offerId: string;
  offerName: string;
  promoCode: string;
  discountType: string;
  discountValue: number;
  isActive: boolean;
  timesUsed: number;
  revenueGenerated: number;
  uniqueUsers: number;
  startDate: string;
  endDate: string;
}

export function useOfferAnalytics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-offer-analytics', user?.id],
    queryFn: async (): Promise<OfferAnalytics[]> => {
      const { data, error } = await supabase.rpc('admin_get_offer_analytics');
      if (error) throw error;
      return ((data || []) as Record<string, unknown>[]).map(row => ({
        offerId: String(row.offer_id || ''),
        offerName: String(row.offer_name || ''),
        promoCode: String(row.promo_code || ''),
        discountType: String(row.discount_type || ''),
        discountValue: Number(row.discount_value) || 0,
        isActive: Boolean(row.is_active),
        timesUsed: Number(row.times_used) || 0,
        revenueGenerated: Number(row.revenue_generated) || 0,
        uniqueUsers: Number(row.unique_users) || 0,
        startDate: String(row.start_date || ''),
        endDate: String(row.end_date || ''),
      }));
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

export interface ChurnRiskUser {
  userId: string;
  displayName: string | null;
  email: string | null;
  neveraiId: string | null;
  riskType: string;
  daysSinceActive: number;
  trialDaysRemaining: number | null;
  plan: string;
}

export function useChurnRiskUsers(limit: number = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-churn-risk', user?.id, limit],
    queryFn: async (): Promise<ChurnRiskUser[]> => {
      const { data, error } = await supabase.rpc('admin_get_churn_risk_users', { p_limit: limit });
      if (error) throw error;
      return ((data || []) as Record<string, unknown>[]).map(row => ({
        userId: String(row.user_id || ''),
        displayName: row.display_name ? String(row.display_name) : null,
        email: row.email ? String(row.email) : null,
        neveraiId: row.neverai_id ? String(row.neverai_id) : null,
        riskType: String(row.risk_type || ''),
        daysSinceActive: Number(row.days_since_active) || 0,
        trialDaysRemaining: row.trial_days_remaining != null ? Number(row.trial_days_remaining) : null,
        plan: String(row.plan || 'free'),
      }));
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}
