import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Video, BarChart3, Crown, Layers, UserCheck } from 'lucide-react';

interface FunnelStats {
  totalCreators: number;
  totalFunnels: number;
  totalVideos: number;
  totalLeads: number;
  funnelsProUsers: number;
  combinedProUsers: number;
}

export function FunnelsStatsGrid() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-funnels-stats'],
    queryFn: async (): Promise<FunnelStats> => {
      const [creators, funnels, videos, leads, funnelsPro, combinedPro] = await Promise.all([
        supabase.from('funnels').select('owner_user_id', { count: 'exact', head: true }),
        supabase.from('funnels').select('*', { count: 'exact', head: true }),
        supabase.from('video_assets').select('*', { count: 'exact', head: true }),
        supabase.from('funnel_leads').select('*', { count: 'exact', head: true }),
        supabase.from('user_funnel_subscriptions').select('*', { count: 'exact', head: true }).eq('plan', 'pro').eq('status', 'active'),
        supabase.from('user_funnel_subscriptions').select('*', { count: 'exact', head: true }).eq('plan', 'combined').eq('status', 'active'),
      ]);

      // For distinct creators, we need a different approach
      const { data: creatorsData } = await supabase.from('funnels').select('owner_user_id');
      const uniqueCreators = new Set(creatorsData?.map(f => f.owner_user_id) || []).size;

      return {
        totalCreators: uniqueCreators,
        totalFunnels: funnels.count || 0,
        totalVideos: videos.count || 0,
        totalLeads: leads.count || 0,
        funnelsProUsers: funnelsPro.count || 0,
        combinedProUsers: combinedPro.count || 0,
      };
    },
    staleTime: 30_000,
  });

  const cards = [
    { label: 'Total Creators', value: stats?.totalCreators, icon: Users, color: 'text-blue-500' },
    { label: 'Total Funnels', value: stats?.totalFunnels, icon: Layers, color: 'text-violet-500' },
    { label: 'Total Videos', value: stats?.totalVideos, icon: Video, color: 'text-pink-500' },
    { label: 'Total Leads', value: stats?.totalLeads, icon: BarChart3, color: 'text-emerald-500' },
    { label: 'Funnels Pro', value: stats?.funnelsProUsers, icon: Crown, color: 'text-amber-500' },
    { label: 'Combined Pro', value: stats?.combinedProUsers, icon: UserCheck, color: 'text-cyan-500' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {cards.map((card) => (
        <Card key={card.label} className="p-3 text-center space-y-1">
          <card.icon className={`h-4 w-4 mx-auto ${card.color}`} />
          {isLoading ? (
            <Skeleton className="h-6 w-10 mx-auto" />
          ) : (
            <p className="text-lg font-bold">{card.value ?? 0}</p>
          )}
          <p className="text-[10px] text-muted-foreground leading-tight">{card.label}</p>
        </Card>
      ))}
    </div>
  );
}
