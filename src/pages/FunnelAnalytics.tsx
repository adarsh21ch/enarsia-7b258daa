import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFunnel } from '@/hooks/useFunnels';
import { useFunnelLeads, useFunnelLeadStats } from '@/hooks/useFunnelLeads';
import { FunnelLeadsTable } from '@/components/funnels/FunnelLeadsTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Users, CheckCircle, CreditCard, TrendingUp, Copy, Lock } from 'lucide-react';
import { getFunnelPublicUrl } from '@/types/funnels';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { useFunnelFeatureAccess } from '@/hooks/useFunnelFeatureAccess';
import { FunnelsUpgradeDrawer } from '@/components/funnels/FunnelsUpgradeDrawer';

export default function FunnelAnalytics() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  
  const { data: funnel, isLoading: loadingFunnel } = useFunnel(id);
  const { data: leadsData, isLoading: loadingLeads } = useFunnelLeads(id);
  const { data: stats, isLoading: loadingStats } = useFunnelLeadStats(id);
  const advancedAnalytics = useFunnelFeatureAccess('funnel_advanced_analytics');

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  const copyLink = () => {
    if (funnel) {
      const url = getFunnelPublicUrl(funnel.slug);
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
  };

  if (loadingFunnel) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!funnel) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Funnel not found</h2>
          <Button onClick={() => navigate('/funnels')}>Back to Funnels</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/funnels')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{funnel.title}</h1>
              <p className="text-muted-foreground">Analytics & Leads</p>
            </div>
          </div>
          <Button variant="outline" onClick={copyLink}>
            <Copy className="w-4 h-4 mr-2" />
            Copy Link
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Leads</p>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold">{stats?.totalLeads || 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {advancedAnalytics.canAccess ? (
            <>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Video Completed</p>
                      {loadingStats ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold">{stats?.completedVideo || 0}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Completion Rate</p>
                      {loadingStats ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold">{stats?.completionRate || 0}%</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                      <CreditCard className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Paid Leads</p>
                      {loadingStats ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold">{stats?.paidLeads || 0}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {[
                { label: 'Video Completed', icon: CheckCircle, color: 'green' },
                { label: 'Completion Rate', icon: TrendingUp, color: 'blue' },
                { label: 'Paid Leads', icon: CreditCard, color: 'amber' },
              ].map(({ label, icon: Icon, color }) => (
                <Card key={label} className="relative overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 blur-sm">
                      <div className={`p-3 bg-${color}-100 dark:bg-${color}-900/20 rounded-lg`}>
                        <Icon className={`w-6 h-6 text-${color}-600`} />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="text-2xl font-bold">--</p>
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" />
                        Pro
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <div className="col-span-full flex justify-center">
                <FunnelsUpgradeDrawer variant="compact" triggerText="Unlock Advanced Analytics" />
              </div>
            </>
          )}
        </div>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelLeadsTable 
              leads={leadsData?.leads || []} 
              isLoading={loadingLeads} 
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
