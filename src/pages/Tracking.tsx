import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProspects } from '@/hooks/useProspects';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/tracking/StatCard';
import { StageDistribution } from '@/components/tracking/StageDistribution';
import { StatusDistribution } from '@/components/tracking/StatusDistribution';
import { ConversionFunnel } from '@/components/tracking/ConversionFunnel';
import { RecentActivity } from '@/components/tracking/RecentActivity';
import { Users, AlertTriangle, TrendingUp, UserCheck } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Tracking() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { prospects, loading } = useProspects();

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const stats = useMemo(() => {
    const totalProspects = prospects.length;
    const positiveCount = prospects.filter(p => p.prospect_status === '+VE').length;
    const highPriorityCount = prospects.filter(p => p.priority === 'High').length;
    const levelUpCount = prospects.filter(p => p.funnel_stage === 'Level Up').length;

    return {
      totalProspects,
      positiveCount,
      highPriorityCount,
      levelUpCount,
    };
  }, [prospects]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Tracking & Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Monitor your sales funnel performance
          </p>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-lg" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Prospects"
                value={stats.totalProspects}
                icon={Users}
              />
              <StatCard
                title="+VE Prospects"
                value={stats.positiveCount}
                icon={UserCheck}
                colorClass="text-status-positive"
              />
              <StatCard
                title="High Priority"
                value={stats.highPriorityCount}
                icon={AlertTriangle}
                colorClass="text-priority-high"
              />
              <StatCard
                title="Level Up"
                value={stats.levelUpCount}
                icon={TrendingUp}
                colorClass="text-stage-levelup"
              />
            </div>

            {/* Conversion Funnel */}
            <ConversionFunnel prospects={prospects} />

            {/* Distribution Charts */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StageDistribution prospects={prospects} />
              <StatusDistribution prospects={prospects} />
              <RecentActivity prospects={prospects} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
