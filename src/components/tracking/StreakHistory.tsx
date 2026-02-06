import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useStreak } from '@/hooks/useStreak';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flame, Lock, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay } from 'date-fns';

export function StreakHistory() {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const { currentStreak, longestStreak, streakEnabled } = useStreak();

  // Fetch last 30 days of activity
  const { data: activities } = useQuery({
    queryKey: ['streak-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('user_daily_activity' as any)
        .select('activity_date, has_activity, activity_sources')
        .eq('user_id', user.id)
        .gte('activity_date', thirtyDaysAgo)
        .order('activity_date', { ascending: true });
      if (error) return [];
      return data as unknown as { activity_date: string; has_activity: boolean; activity_sources: string[] }[];
    },
    enabled: !!user && isPro && streakEnabled,
    staleTime: 60000,
  });

  if (!streakEnabled) return null;

  if (!isPro) {
    return (
      <Card className="p-4 border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="h-4 w-4 text-orange-500" />
          <h3 className="font-semibold text-sm">Streak History</h3>
          <Lock className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Upgrade to Pro to view your streak history and consistency insights.
        </p>
        <Button variant="outline" size="sm" className="w-full text-xs">
          Upgrade to Pro
        </Button>
      </Card>
    );
  }

  // Build a set of active dates for quick lookup
  const activeDates = new Set(
    (activities || []).filter(a => a.has_activity).map(a => a.activity_date)
  );

  // Generate last 30 days
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(startOfDay(new Date()), 29 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    return { date, dateStr, active: activeDates.has(dateStr) };
  });

  const activeDayCount = days.filter(d => d.active).length;

  return (
    <Card className="p-4 border-border/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          <h3 className="font-semibold text-sm">Streak History</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Trophy className="h-3 w-3 text-amber-500" />
            Best: {longestStreak}
          </span>
          <span>{activeDayCount}/30 active</span>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="grid grid-cols-10 gap-1">
        {days.map((day) => (
          <div
            key={day.dateStr}
            title={`${format(day.date, 'MMM d')} - ${day.active ? 'Active' : 'Inactive'}`}
            className={cn(
              "h-5 w-full rounded-sm transition-colors",
              day.active
                ? "bg-orange-500/80"
                : "bg-muted/40"
            )}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground">
        <span>{format(days[0].date, 'MMM d')}</span>
        <span>Today</span>
      </div>
    </Card>
  );
}
