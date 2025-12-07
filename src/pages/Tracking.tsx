import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { FunnelTracker } from '@/components/trackup/FunnelTracker';
import { LeadsTracker } from '@/components/trackup/LeadsTracker';
import { UpgradeBar } from '@/components/subscription/UpgradeBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, TrendingUp, Calendar, Lock } from 'lucide-react';
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
    <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      {/* Premium Header */}
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center px-4 py-3">
          <div className="flex items-center gap-3">
            <img 
              src={nevoraLogo} 
              alt="NevorAI Logo" 
              className="h-10 w-10 rounded-xl object-cover shadow-md"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Track Up</h1>
              <p className="text-xs text-muted-foreground font-medium">Track Your Numbers</p>
            </div>
          </div>
        </div>
      </header>

      <main className="scrollable-content">
        <div className={cn("container py-3 px-4", !isPro ? "pb-36" : "pb-20")}>
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
            {/* Sticky Tab Switcher */}
            <div className="sticky top-0 z-20 bg-gradient-to-b from-background via-background to-background/95 pb-2 -mx-4 px-4 pt-1">
              <TabsList className="w-full grid grid-cols-2 h-14 p-1.5 bg-muted/50 rounded-2xl gap-1">
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
              </TabsList>
            </div>

            <TabsContent value="funnel" className="mt-2 focus-visible:outline-none focus-visible:ring-0">
              <FunnelTracker isPro={isPro} />
            </TabsContent>

            <TabsContent value="leads" className="mt-2 focus-visible:outline-none focus-visible:ring-0">
              <LeadsTracker isPro={isPro} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Upgrade Bar for Free Users */}
      <UpgradeBar />

      <BottomNav />
    </div>
  );
}