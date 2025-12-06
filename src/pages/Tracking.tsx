import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { FunnelTracker } from '@/components/trackup/FunnelTracker';
import { LeadsTracker } from '@/components/trackup/LeadsTracker';
import { ProspectAnalytics } from '@/components/trackup/ProspectAnalytics';
import { UpgradeBar } from '@/components/subscription/UpgradeBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, TrendingUp, BarChart3, Calendar, Lock } from 'lucide-react';
import { useProspects } from '@/hooks/useProspects';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

export default function Tracking() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { prospects } = useProspects();
  const { isPro, loading: subLoading } = useSubscription();
  const [activeTab, setActiveTab] = useState('funnel');

  // Calculate Total CC: 2CC counts as 2, Level Up as 1
  const totalCC = prospects.reduce((sum, p) => {
    if (p.funnel_stage === '2CC') return sum + 2;
    if (p.funnel_stage === 'Level Up') return sum + 1;
    return sum;
  }, 0);

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-24">
      {/* Premium Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img 
              src={nevoraLogo} 
              alt="NevorAI Logo" 
              className="h-10 w-10 rounded-xl object-cover shadow-md"
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight">NevorAI</h1>
              <p className="text-[10px] text-muted-foreground font-medium">Never miss a followup Again</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl px-4 py-2 text-right border border-primary/10">
            <p className="text-[10px] text-muted-foreground font-medium">Total CC</p>
            <p className="text-2xl font-bold text-primary tracking-tight">{totalCC}</p>
          </div>
        </div>
      </header>

      <main className={cn("container py-4 px-4", !isPro && "pb-32")}>
        {/* Page Title with decorative element */}
        <div className="mb-5">
          <h2 className="text-2xl font-bold tracking-tight">TrackUp System</h2>
          <p className="text-sm text-muted-foreground">Track prospect progress and engagement</p>
          <div className="flex items-center gap-1 mt-2">
            <div className="w-8 h-1 bg-primary rounded-full" />
            <div className="w-2 h-1 bg-primary/50 rounded-full" />
            <div className="w-1 h-1 bg-primary/30 rounded-full" />
          </div>
        </div>

        {/* Lock overlay for Free users */}
        {!isPro && (
          <div className="relative mb-6">
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-background/80 backdrop-blur-sm rounded-2xl">
              <div className="p-4 rounded-full bg-muted mb-4">
                <Lock className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Pro Feature</h3>
              <p className="text-muted-foreground max-w-sm text-center">
                Subscribe for ₹249 to unlock TrackUp and all premium features.
              </p>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-5 h-14 p-1.5 bg-muted/50 rounded-2xl gap-1">
            <TabsTrigger 
              value="funnel" 
              className={cn(
                "rounded-xl flex flex-col items-center justify-center gap-0.5 h-full transition-all duration-300",
                "data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:shadow-primary/10",
                "data-[state=active]:text-primary"
              )}
            >
              <TrendingUp className="h-4 w-4" />
              <span className="text-[10px] font-semibold">Funnel</span>
            </TabsTrigger>
            <TabsTrigger 
              value="leads" 
              className={cn(
                "rounded-xl flex flex-col items-center justify-center gap-0.5 h-full transition-all duration-300",
                "data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:shadow-primary/10",
                "data-[state=active]:text-primary"
              )}
            >
              <Calendar className="h-4 w-4" />
              <span className="text-[10px] font-semibold">Leads</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className={cn(
                "rounded-xl flex flex-col items-center justify-center gap-0.5 h-full transition-all duration-300",
                "data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:shadow-primary/10",
                "data-[state=active]:text-primary"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="text-[10px] font-semibold">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="funnel" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <FunnelTracker isPro={isPro} />
          </TabsContent>

          <TabsContent value="leads" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <LeadsTracker isPro={isPro} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <ProspectAnalytics prospects={prospects} isPro={isPro} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Upgrade Bar for Free Users */}
      <UpgradeBar />

      <BottomNav />
    </div>
  );
}
