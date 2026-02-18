import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Video, BarChart3, Layers } from 'lucide-react';

interface FunnelStats {
  totalCreators: number;
  totalFunnels: number;
  totalVideos: number;
  totalLeads: number;
}

export function FunnelsStatsGrid() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-funnels-stats'],
    queryFn: async (): Promise<FunnelStats> => {
      const [funnels, videos, leads] = await Promise.all([
        supabase.from('funnels').select('*', { count: 'exact', head: true }),
        supabase.from('video_assets').select('*', { count: 'exact', head: true }),
        supabase.from('funnel_leads').select('*', { count: 'exact', head: true }),
      ]);

      const { data: creatorsData } = await supabase.from('funnels').select('owner_user_id');
      const uniqueCreators = new Set(creatorsData?.map(f => f.owner_user_id) || []).size;

      return {
        totalCreators: uniqueCreators,
        totalFunnels: funnels.count || 0,
        totalVideos: videos.count || 0,
        totalLeads: leads.count || 0,
      };
    },
    staleTime: 30_000,
  });

  const cards = [
    { label: 'Total Creators', value: stats?.totalCreators, icon: Users, color: 'text-primary' },
    { label: 'Total Funnels', value: stats?.totalFunnels, icon: Layers, color: 'text-primary' },
    { label: 'Total Videos', value: stats?.totalVideos, icon: Video, color: 'text-primary' },
    { label: 'Total Leads', value: stats?.totalLeads, icon: BarChart3, color: 'text-primary' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
