import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSharedLeads, SharedLeadRecord } from '@/hooks/useSharedLeads';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, ChevronDown, ChevronLeft, Download, Eye, Package } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

function ShareGroup({ share, onImport }: { share: SharedLeadRecord; onImport: (id: string) => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [importing, setImporting] = useState(false);
  const isPending = share.status === 'pending';
  const leadCount = share.lead_data?.length || 0;
  const sheetName = share.lead_data?.[0]?.sheet_name;

  const handleImport = async () => {
    setImporting(true);
    await onImport(share.id);
    setImporting(false);
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{share.sender_name || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(share.created_at), 'dd MMM yyyy, hh:mm a')}
            </p>
            {sheetName && (
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                Sheet: <span className="font-medium text-foreground/70">{sheetName}</span>
              </p>
            )}
          </div>
          {isPending ? (
            <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
              {leadCount} Lead{leadCount !== 1 ? 's' : ''}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              Imported
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isPending && (
            <Button size="sm" onClick={handleImport} disabled={importing} className="gap-1.5 flex-1">
              {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Import
            </Button>
          )}
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5 flex-1">
                <Eye className="h-3.5 w-3.5" />
                View
                <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </div>

      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleContent>
          <div className="border-t border-border/50 px-4 py-3 space-y-2 max-h-48 overflow-y-auto bg-muted/30">
            {share.lead_data?.map((lead: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border/30 last:border-0">
                <span className="font-medium truncate flex-1">{lead.name || 'Unknown'}</span>
                <span className="text-muted-foreground text-xs ml-2 shrink-0">{lead.phone || '-'}</span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default function SharedLeads() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { pendingShares, loading, importSharedLeads } = useSharedLeads();

  useEffect(() => {
    if (!user && !authLoading) navigate('/auth');
  }, [user, authLoading, navigate]);

  const handleImport = async (shareId: string) => {
    const result = await importSharedLeads(shareId);
    if (result.imported > 0 && result.skipped > 0) {
      toast.success(`${result.imported} leads imported, ${result.skipped} duplicates skipped`);
    } else if (result.imported > 0) {
      toast.success(`${result.imported} leads imported successfully`);
    } else if (result.skipped > 0) {
      toast.info(`All ${result.skipped} leads already exist in your list`);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>;
  }

  return (
    <div className="app-layout bg-background">
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('/profile')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Shared Leads</h1>
              <p className="text-xs text-muted-foreground font-medium">View & import leads from your team</p>
            </div>
          </div>
        </div>
      </header>

      <main className="scrollable-content">
        <div className="container py-4 px-4 space-y-3 pb-20">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingShares.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No shared leads yet</p>
              <p className="text-xs text-muted-foreground/70">Leads shared by your team will appear here</p>
            </div>
          ) : (
            pendingShares.map(share => (
              <ShareGroup key={share.id} share={share} onImport={handleImport} />
            ))
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
