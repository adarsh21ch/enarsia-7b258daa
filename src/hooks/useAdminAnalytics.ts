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
  todaySignups: number;
  weekSignups: number;
  monthSignups: number;
  totalRevenue: number;
}

export function useAdminAnalytics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-analytics', user?.id],
    queryFn: async (): Promise<AdminAnalytics> => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch all data in parallel
      const [profilesRes, subscriptionsRes, paymentsRes] = await Promise.all([
        // Get all profiles for signup analysis
        supabase
          .from('profiles')
          .select('created_at')
          .gte('created_at', monthAgo)
          .order('created_at', { ascending: true }),
        
        // Get subscription breakdown
        supabase
          .from('user_subscriptions')
          .select('plan, expires_at'),
        
        // Get recent successful payments
        supabase
          .from('payments_log')
          .select('id, created_at, user_email, amount, status, event_type')
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      // Process daily signups
      const signupsByDate: Record<string, number> = {};
      let todaySignups = 0;
      let weekSignups = 0;
      let monthSignups = 0;

      if (profilesRes.data) {
        profilesRes.data.forEach(profile => {
          const date = profile.created_at?.split('T')[0];
          if (date) {
            signupsByDate[date] = (signupsByDate[date] || 0) + 1;
            monthSignups++;
            
            if (date === today) todaySignups++;
            if (new Date(profile.created_at) >= new Date(weekAgo)) weekSignups++;
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

      // Calculate total revenue from successful payments
      let totalRevenue = 0;
      const recentPayments: PaymentLog[] = [];
      
      if (paymentsRes.data) {
        paymentsRes.data.forEach(payment => {
          recentPayments.push(payment as PaymentLog);
          if (payment.status === 'success' && payment.amount) {
            totalRevenue += payment.amount;
          }
        });
      }

      return {
        dailySignups,
        subscriptionBreakdown,
        recentPayments,
        todaySignups,
        weekSignups,
        monthSignups,
        totalRevenue
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
