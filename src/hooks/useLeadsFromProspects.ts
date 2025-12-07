import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, getDaysInMonth, parse, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

export interface DailyLeadMetrics {
  date: string; // "1 December", "2 December", etc.
  dayNumber: number;
  leads: number;
  responses: number;
  videoSent: number;
  enrollments: number;
}

export interface MonthlyTotals {
  leads: number;
  responses: number;
  videoSent: number;
  enrollments: number;
}

const THIRTY_SECONDS_MS = 30 * 1000;

export function useLeadsFromProspects() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [monthYear, setMonthYear] = useState(() => format(new Date(), 'yyyy-MM'));
  const [dailyMetrics, setDailyMetrics] = useState<DailyLeadMetrics[]>([]);
  const [totals, setTotals] = useState<MonthlyTotals>({ leads: 0, responses: 0, videoSent: 0, enrollments: 0 });

  const daysInMonth = useMemo(() => {
    const date = parse(monthYear, 'yyyy-MM', new Date());
    return getDaysInMonth(date);
  }, [monthYear]);

  const daysRemaining = useMemo(() => {
    const now = new Date();
    const currentMonthYear = format(now, 'yyyy-MM');
    if (monthYear !== currentMonthYear) return 0;
    return daysInMonth - now.getDate();
  }, [monthYear, daysInMonth]);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const monthDate = parse(monthYear, 'yyyy-MM', new Date());
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      // Fetch all prospects created in this month
      const { data, error } = await supabase
        .from('prospects')
        .select('id, date_added, action_taken, action_taken_at')
        .eq('user_id', user.id)
        .gte('date_added', monthStart.toISOString())
        .lte('date_added', monthEnd.toISOString());

      if (error) {
        console.error('Error fetching prospects for leads:', error);
        setLoading(false);
        return;
      }

      const prospects = data || [];
      const now = new Date();

      // Initialize daily metrics for all days in month
      const metrics: DailyLeadMetrics[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
        metrics.push({
          date: format(dateObj, 'd MMM'),
          dayNumber: day,
          leads: 0,
          responses: 0,
          videoSent: 0,
          enrollments: 0,
        });
      }

      // Aggregate prospects by day
      prospects.forEach((p) => {
        const addedDate = new Date(p.date_added);
        const dayIndex = addedDate.getDate() - 1;
        
        if (dayIndex >= 0 && dayIndex < metrics.length) {
          metrics[dayIndex].leads++;

          // Check if response is confirmed (30-second rule)
          const actionTakenAt = p.action_taken_at ? new Date(p.action_taken_at) : null;
          const isConfirmed = actionTakenAt && (now.getTime() - actionTakenAt.getTime() >= THIRTY_SECONDS_MS);

          if (p.action_taken && isConfirmed) {
            metrics[dayIndex].responses++;

            if (p.action_taken === 'Video Sent') {
              metrics[dayIndex].videoSent++;
            }
            if (p.action_taken === 'Enrollment') {
              metrics[dayIndex].enrollments++;
            }
          }
        }
      });

      setDailyMetrics(metrics);

      // Calculate totals
      const monthlyTotals = metrics.reduce(
        (acc, day) => ({
          leads: acc.leads + day.leads,
          responses: acc.responses + day.responses,
          videoSent: acc.videoSent + day.videoSent,
          enrollments: acc.enrollments + day.enrollments,
        }),
        { leads: 0, responses: 0, videoSent: 0, enrollments: 0 }
      );
      setTotals(monthlyTotals);
    } catch (err) {
      console.error('Error in fetchData:', err);
    } finally {
      setLoading(false);
    }
  }, [user, monthYear, daysInMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const changeMonth = (direction: 'prev' | 'next') => {
    const date = parse(monthYear, 'yyyy-MM', new Date());
    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    setMonthYear(format(date, 'yyyy-MM'));
  };

  return {
    dailyMetrics,
    totals,
    loading,
    monthYear,
    changeMonth,
    daysInMonth,
    daysRemaining,
    refetch: fetchData,
  };
}
