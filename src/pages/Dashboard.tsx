// Dashboard - Follow-Up List Page
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { ProspectTable } from '@/components/prospects/ProspectTable';
import { Loader2 } from 'lucide-react';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { 
    prospects, 
    prospectsLoading, 
    addProspect, 
    updateProspect, 
    deleteProspect, 
    importProspects,
    sheets,
    selectedSheetId,
    setSelectedSheetId,
    addSheet,
    updateSheet,
    deleteSheet
  } = useData();

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
      {/* Header */}
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
            <p className="text-[10px] text-muted-foreground font-medium">Total</p>
            <p className="text-2xl font-bold text-primary tracking-tight">{prospects.length}</p>
          </div>
        </div>
      </header>

      <main className="container py-4 px-4">
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

        <ProspectTable
          prospects={prospects}
          loading={prospectsLoading}
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
      </main>

      <BottomNav />
    </div>
  );
}
