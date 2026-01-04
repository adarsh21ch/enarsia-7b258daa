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
  amount: number | null;
  status: string | null;
  event_type: string;
}

export interface AdminAnalytics {
  dailySignups: DailySignup[];
  subscriptionBreakdown: SubscriptionBreakdown[];
  recentPayments: PaymentLog[];
  // Core metrics from single source of truth
  neveraiTotalUsers: number;
  neveraiTodayActive: number;
  neveraiWeekActive: number;
  activeProUsers: number;
  totalLeads: number;
  todayLeads: number;
  weekLeads: number;
  monthLeads: number;
}

export function useAdminAnalytics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-analytics', user?.id],
    queryFn: async (): Promise<AdminAnalytics> => {
      const now = new Date();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch all data in parallel
      const [analyticsRes, profilesRes, subscriptionsRes, paymentsRes] = await Promise.all([
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
        
        // Get recent payments (empty for now - payments not enabled)
        supabase
          .from('payments_log')
          .select('id, created_at, user_email, amount, status, event_type')
          .order('created_at', { ascending: false })
          .limit(20),
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
      const today = now.toISOString().split('T')[0];
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
        pro: { count: 0, active_count: 0 }
      };

      if (subscriptionsRes.data) {
        subscriptionsRes.data.forEach(sub => {
          const plan = sub.plan || 'free';
          if (!breakdown[plan]) {
            breakdown[plan] = { count: 0, active_count: 0 };
          }
          breakdown[plan].count++;
          
          if (plan === 'pro' && sub.expires_at && new Date(sub.expires_at) > now) {
            breakdown[plan].active_count++;
          } else if (plan === 'free') {
            breakdown[plan].active_count++;
          }
        });
      }

      const subscriptionBreakdown: SubscriptionBreakdown[] = Object.entries(breakdown).map(
        ([plan, data]) => ({ plan, ...data })
      );

      // Recent payments (empty or actual)
      const recentPayments: PaymentLog[] = (paymentsRes.data || []) as PaymentLog[];

      return {
        dailySignups,
        subscriptionBreakdown,
        recentPayments,
        // Core metrics from single source of truth
        neveraiTotalUsers: Number(metrics.neverai_total_users) || 0,
        neveraiTodayActive: Number(metrics.neverai_today_active) || 0,
        neveraiWeekActive: Number(metrics.neverai_week_active) || 0,
        activeProUsers: Number(metrics.active_pro_users) || 0,
        totalLeads: Number(metrics.total_leads) || 0,
        todayLeads: Number(metrics.today_leads) || 0,
        weekLeads: Number(metrics.week_leads) || 0,
        monthLeads: Number(metrics.month_leads) || 0,
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
