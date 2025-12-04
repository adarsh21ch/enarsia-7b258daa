import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProspects } from '@/hooks/useProspects';
import { useSheets } from '@/hooks/useSheets';
import { BottomNav } from '@/components/layout/BottomNav';
import { ProspectTable } from '@/components/prospects/ProspectTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Phone, GitBranch, Users, Flame, CalendarClock, BarChart3, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { prospects, loading, addProspect, updateProspect, deleteProspect, importProspects } = useProspects();
  const { sheets, selectedSheetId, setSelectedSheetId, addSheet, updateSheet, deleteSheet } = useSheets();
  
  const [mainTab, setMainTab] = useState<'calling' | 'funnel'>('calling');
  const [callingSubTab, setCallingSubTab] = useState('all');
  const [funnelSubTab, setFunnelSubTab] = useState('all');

  const totalCC = prospects.filter(p => p.funnel_stage === 'Level Up' || p.funnel_stage === '2CC').length;

  // Calculate counts for sub-tabs
  const callingProspects = prospects.filter(p => 
    (!p.enrollment_status || p.enrollment_status === 'Not Enrolled') &&
    (!p.funnel_stage || p.funnel_stage === 'Enrollment')
  );
  
  const funnelProspects = prospects.filter(p => 
    p.enrollment_status === 'Enrolled' ||
    (p.funnel_stage && p.funnel_stage !== 'Enrollment')
  );

  // Calling sub-tab counts
  const hotLeads = callingProspects.filter(p => 
    p.priority === 'High' || p.prospect_status === '+VE'
  );
  const scheduledLeads = callingProspects.filter(p => p.last_contact_date);

  // Funnel sub-tab counts
  const day1Prospects = funnelProspects.filter(p => p.funnel_stage === 'Day 1');
  const progressingProspects = funnelProspects.filter(p => 
    p.funnel_stage && ['Day 2', 'Day 3', 'Minimum Bill'].includes(p.funnel_stage)
  );

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
        <div className="mb-5">
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

        {/* Main Tabs: Calling / Funnel */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setMainTab('calling')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200",
              mainTab === 'calling'
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Phone className="h-4 w-4" />
            <span>Calling</span>
            <span className={cn(
              "ml-1 text-xs px-2 py-0.5 rounded-full font-semibold",
              mainTab === 'calling'
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-primary/10 text-primary"
            )}>
              {callingProspects.length}
            </span>
          </button>
          
          <button
            onClick={() => setMainTab('funnel')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200",
              mainTab === 'funnel'
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <GitBranch className="h-4 w-4" />
            <span>Funnel</span>
            <span className={cn(
              "ml-1 text-xs px-2 py-0.5 rounded-full font-semibold",
              mainTab === 'funnel'
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-primary/10 text-primary"
            )}>
              {funnelProspects.length}
            </span>
          </button>
        </div>

        {/* Sub-tabs based on main tab */}
        {mainTab === 'calling' ? (
          <Tabs value={callingSubTab} onValueChange={setCallingSubTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-4 h-12 p-1 bg-muted/50 rounded-xl gap-1">
              <TabsTrigger 
                value="all" 
                className={cn(
                  "rounded-lg flex items-center justify-center gap-1.5 h-full transition-all duration-200 text-xs",
                  "data-[state=active]:bg-card data-[state=active]:shadow-md",
                  "data-[state=active]:text-primary"
                )}
              >
                <Users className="h-3.5 w-3.5" />
                <span className="font-semibold">All Leads</span>
                <span className="text-[10px] bg-muted px-1.5 rounded-full">{callingProspects.length}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="hot" 
                className={cn(
                  "rounded-lg flex items-center justify-center gap-1.5 h-full transition-all duration-200 text-xs",
                  "data-[state=active]:bg-card data-[state=active]:shadow-md",
                  "data-[state=active]:text-orange-500"
                )}
              >
                <Flame className="h-3.5 w-3.5" />
                <span className="font-semibold">Hot Leads</span>
                <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 rounded-full">{hotLeads.length}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="scheduled" 
                className={cn(
                  "rounded-lg flex items-center justify-center gap-1.5 h-full transition-all duration-200 text-xs",
                  "data-[state=active]:bg-card data-[state=active]:shadow-md",
                  "data-[state=active]:text-blue-500"
                )}
              >
                <CalendarClock className="h-3.5 w-3.5" />
                <span className="font-semibold">Scheduled</span>
                <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 rounded-full">{scheduledLeads.length}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0 focus-visible:outline-none">
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

            <TabsContent value="hot" className="mt-0 focus-visible:outline-none">
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
                subFilter="hot"
              />
            </TabsContent>

            <TabsContent value="scheduled" className="mt-0 focus-visible:outline-none">
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
                subFilter="scheduled"
              />
            </TabsContent>
          </Tabs>
        ) : (
          <Tabs value={funnelSubTab} onValueChange={setFunnelSubTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-4 h-12 p-1 bg-muted/50 rounded-xl gap-1">
              <TabsTrigger 
                value="all" 
                className={cn(
                  "rounded-lg flex items-center justify-center gap-1.5 h-full transition-all duration-200 text-xs",
                  "data-[state=active]:bg-card data-[state=active]:shadow-md",
                  "data-[state=active]:text-primary"
                )}
              >
                <Users className="h-3.5 w-3.5" />
                <span className="font-semibold">All Enrolled</span>
                <span className="text-[10px] bg-muted px-1.5 rounded-full">{funnelProspects.length}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="day1" 
                className={cn(
                  "rounded-lg flex items-center justify-center gap-1.5 h-full transition-all duration-200 text-xs",
                  "data-[state=active]:bg-card data-[state=active]:shadow-md",
                  "data-[state=active]:text-purple-500"
                )}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="font-semibold">Day 1</span>
                <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 rounded-full">{day1Prospects.length}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="progress" 
                className={cn(
                  "rounded-lg flex items-center justify-center gap-1.5 h-full transition-all duration-200 text-xs",
                  "data-[state=active]:bg-card data-[state=active]:shadow-md",
                  "data-[state=active]:text-green-500"
                )}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="font-semibold">In Progress</span>
                <span className="text-[10px] bg-green-100 text-green-600 px-1.5 rounded-full">{progressingProspects.length}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0 focus-visible:outline-none">
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

            <TabsContent value="day1" className="mt-0 focus-visible:outline-none">
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
                subFilter="day1"
              />
            </TabsContent>

            <TabsContent value="progress" className="mt-0 focus-visible:outline-none">
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
                subFilter="progress"
              />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
