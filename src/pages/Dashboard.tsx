// Dashboard - Follow-Up List Page
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProspects } from '@/hooks/useProspects';
import { useSheets } from '@/hooks/useSheets';
import { BottomNav } from '@/components/layout/BottomNav';
import { ProspectTable } from '@/components/prospects/ProspectTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Phone, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';
import { CustomOptionsProvider } from '@/contexts/CustomOptionsContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { prospects, loading, addProspect, updateProspect, deleteProspect, importProspects } = useProspects();
  const { sheets, selectedSheetId, setSelectedSheetId, addSheet, updateSheet, deleteSheet } = useSheets();
  
  const [mainTab, setMainTab] = useState<'calling' | 'funnel'>('calling');

  // Calculate Total CC: 2CC counts as 2, Level Up as 1
  const totalCC = prospects.reduce((sum, p) => {
    if (p.funnel_stage === '2CC') return sum + 2;
    if (p.funnel_stage === 'Level Up') return sum + 1;
    return sum;
  }, 0);

  // Calculate funnel counts for summary bar
  const funnelCounts = {
    enrollment: prospects.filter(p => p.funnel_stage === 'Enrollment').length,
    day1: prospects.filter(p => p.funnel_stage === 'Day 1').length,
    day2: prospects.filter(p => p.funnel_stage === 'Day 2').length,
    day3: prospects.filter(p => p.funnel_stage === 'Day 3').length,
    minBill: prospects.filter(p => p.funnel_stage === 'Minimum Bill').length,
    levelUp: prospects.filter(p => p.funnel_stage === 'Level Up').length,
    twoCC: prospects.filter(p => p.funnel_stage === '2CC').length,
  };

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
    <CustomOptionsProvider>
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

      <main className="container py-4 px-4">
        {/* Page Title */}
        <div className="mb-3">
          <h2 className="text-2xl font-bold tracking-tight">Follow-Up List</h2>
          <p className="text-sm text-muted-foreground">
            Manage and track your sales prospects
          </p>
          <div className="flex items-center gap-1 mt-2">
            <div className="w-8 h-1 bg-primary rounded-full" />
            <div className="w-2 h-1 bg-primary/50 rounded-full" />
            <div className="w-1 h-1 bg-primary/30 rounded-full" />
          </div>
        </div>

        {/* Compact Funnel Summary Bar */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 mb-4">
          <span><strong className="text-foreground">{funnelCounts.enrollment}</strong> Enroll</span>
          <span><strong className="text-foreground">{funnelCounts.day1}</strong> Day1</span>
          <span><strong className="text-foreground">{funnelCounts.day2}</strong> Day2</span>
          <span><strong className="text-foreground">{funnelCounts.day3}</strong> Day3</span>
          <span><strong className="text-foreground">{funnelCounts.minBill}</strong> MinBill</span>
          <span><strong className="text-foreground">{funnelCounts.levelUp}</strong> LevelUp</span>
          <span><strong className="text-foreground">{funnelCounts.twoCC}</strong> 2CC</span>
        </div>

        {/* Premium Segmented Control: Calling / Funnel */}
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'calling' | 'funnel')} className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-5 h-14 p-1.5 bg-muted/50 rounded-2xl gap-1">
            <TabsTrigger 
              value="calling" 
              className={cn(
                "rounded-xl flex flex-col items-center justify-center gap-0.5 h-full transition-all duration-300",
                "data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:shadow-primary/10",
                "data-[state=active]:text-primary"
              )}
            >
              <Phone className="h-4 w-4" />
              <span className="text-[10px] font-semibold">Calling</span>
            </TabsTrigger>
            <TabsTrigger 
              value="funnel" 
              className={cn(
                "rounded-xl flex flex-col items-center justify-center gap-0.5 h-full transition-all duration-300",
                "data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:shadow-primary/10",
                "data-[state=active]:text-primary"
              )}
            >
              <GitBranch className="h-4 w-4" />
              <span className="text-[10px] font-semibold">Funnel</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calling" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <ProspectTable
              prospects={prospects}
              loading={loading}
              onAdd={addProspect}
              onUpdate={updateProspect}
              onDelete={deleteProspect}
              onImport={importProspects}
              sheets={sheets}
              selectedSheetId={selectedSheetId}
              onSelectSheet={setSelectedSheetId}
              onAddSheet={addSheet}
              onUpdateSheet={updateSheet}
              onDeleteSheet={deleteSheet}
              filterMode="calling"
              subFilter="all"
            />
          </TabsContent>

          <TabsContent value="funnel" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <ProspectTable
              prospects={prospects}
              loading={loading}
              onAdd={addProspect}
              onUpdate={updateProspect}
              onDelete={deleteProspect}
              onImport={importProspects}
              sheets={sheets}
              selectedSheetId={selectedSheetId}
              onSelectSheet={setSelectedSheetId}
              onAddSheet={addSheet}
              onUpdateSheet={updateSheet}
              onDeleteSheet={deleteSheet}
              filterMode="funnel"
              subFilter="all"
            />
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
    </CustomOptionsProvider>
  );
}
