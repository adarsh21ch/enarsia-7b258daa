import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { FunnelTracker } from '@/components/trackup/FunnelTracker';
import { LeadsTracker } from '@/components/trackup/LeadsTracker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Menu } from 'lucide-react';
import { useProspects } from '@/hooks/useProspects';

export default function Tracking() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { prospects } = useProspects();
  const [activeTab, setActiveTab] = useState('funnel');

  // Calculate Total CC (Level Up count from prospects)
  const totalCC = prospects.filter(p => p.funnel_stage === 'Level Up').length;

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold">NEVORUP</h1>
              <p className="text-xs text-muted-foreground">Never miss a follow-up</p>
            </div>
          </div>
          <div className="bg-muted rounded-lg px-3 py-1.5 text-right">
            <p className="text-xs text-muted-foreground">Total CC:</p>
            <p className="text-lg font-bold text-primary">{totalCC}</p>
          </div>
        </div>
      </header>

      <main className="container py-4 px-4">
        {/* Page Title */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold">TrackUp System</h2>
          <p className="text-sm text-muted-foreground">Track prospect progress and engagement</p>
          <div className="w-10 h-1 bg-primary rounded-full mt-2" />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4 h-12 p-1 bg-muted/50 rounded-xl">
            <TabsTrigger 
              value="funnel" 
              className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary font-medium"
            >
              Funnel Tracker
            </TabsTrigger>
            <TabsTrigger 
              value="leads" 
              className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary font-medium"
            >
              Leads Tracker
            </TabsTrigger>
          </TabsList>

          <TabsContent value="funnel" className="mt-0">
            <FunnelTracker />
          </TabsContent>

          <TabsContent value="leads" className="mt-0">
            <LeadsTracker />
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}
