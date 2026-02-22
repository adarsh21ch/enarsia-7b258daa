import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSharedLeads, SharedLeadRecord } from '@/hooks/useSharedLeads';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, Download, Eye, Package, Search, X, LayoutGrid, Table2, MoreVertical, FileSpreadsheet } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

/* ---------- Card View ---------- */
function ShareCard({ share, onImport }: { share: SharedLeadRecord; onImport: (id: string) => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [importing, setImporting] = useState(false);
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
            <p className="text-xs text-muted-foreground">{format(new Date(share.created_at), 'dd MMM yyyy, hh:mm a')}</p>
            {sheetName && (
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                Sheet: <span className="font-medium text-foreground/70">{sheetName}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
              {leadCount} Lead{leadCount !== 1 ? 's' : ''}
            </Badge>
            {share.status === 'imported' && (
              <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Imported</Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleImport} disabled={importing} className="gap-1.5 flex-1">
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Import
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setExpanded(!expanded)}>
            <Eye className="h-3.5 w-3.5" />
            {expanded ? 'Hide' : 'View'}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/50 px-4 py-3 space-y-1 max-h-48 overflow-y-auto bg-muted/30">
          {share.lead_data?.map((lead: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border/30 last:border-0">
              <span className="font-medium truncate flex-1">{lead.name || 'Unknown'}</span>
              <span className="text-muted-foreground text-xs ml-2 shrink-0">{lead.phone || '-'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Table View ---------- */
function ShareTable({ shares, onImport }: { shares: SharedLeadRecord[]; onImport: (id: string) => Promise<void> }) {
  const [importingId, setImportingId] = useState<string | null>(null);

  const allLeads = useMemo(() => {
    return shares.flatMap(share =>
      (share.lead_data || []).map((lead: any) => ({
        ...lead,
        sender_name: share.sender_name || 'Unknown',
        share_date: share.created_at,
        share_id: share.id,
        share_status: share.status,
      }))
    );
  }, [shares]);

  const handleImport = async (shareId: string) => {
    setImportingId(shareId);
    await onImport(shareId);
    setImportingId(null);
  };

  if (allLeads.length === 0) return <p className="text-center text-sm text-muted-foreground py-8">No leads to display</p>;

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border/50">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Name</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Phone</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs hidden sm:table-cell">Sheet</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs hidden sm:table-cell">Sender</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs hidden md:table-cell">Date</th>
              <th className="text-center px-3 py-2 font-medium text-muted-foreground text-xs">Action</th>
            </tr>
          </thead>
          <tbody>
            {allLeads.map((lead, i) => (
              <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium truncate max-w-[140px]">{lead.name || '-'}</td>
                <td className="px-3 py-2 text-muted-foreground">{lead.phone || '-'}</td>
                <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{lead.sheet_name || '-'}</td>
                <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{lead.sender_name}</td>
                <td className="px-3 py-2 text-muted-foreground text-xs hidden md:table-cell">{format(new Date(lead.share_date), 'dd MMM')}</td>
                <td className="px-3 py-2 text-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1"
                    disabled={importingId === lead.share_id}
                    onClick={() => handleImport(lead.share_id)}
                  >
                    {importingId === lead.share_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                    Import
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Main Page ---------- */
export default function SharedLeads() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { pendingShares, loading, importSharedLeads } = useSharedLeads();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user && !authLoading) navigate('/auth');
  }, [user, authLoading, navigate]);

  /* Stats */
  const totalBatches = pendingShares.length;
  const totalLeads = useMemo(() => pendingShares.reduce((sum, s) => sum + (s.lead_data?.length || 0), 0), [pendingShares]);
  const pendingCount = useMemo(() => pendingShares.filter(s => s.status === 'pending').length, [pendingShares]);
  const importedCount = totalBatches - pendingCount;

  /* Search filter */
  const filteredShares = useMemo(() => {
    if (!searchQuery.trim()) return pendingShares;
    const q = searchQuery.toLowerCase();
    return pendingShares.filter(share =>
      (share.sender_name || '').toLowerCase().includes(q) ||
      share.lead_data?.some((l: any) =>
        (l.name || '').toLowerCase().includes(q) ||
        (l.phone || '').toLowerCase().includes(q)
      )
    );
  }, [pendingShares, searchQuery]);

  /* Import with instant cache invalidation */
  const handleImport = useCallback(async (shareId: string) => {
    const result = await importSharedLeads(shareId);
    if (result.imported > 0 && result.skipped > 0) {
      toast.success(`${result.imported} leads imported, ${result.skipped} duplicates skipped`);
    } else if (result.imported > 0) {
      toast.success(`${result.imported} leads imported successfully`);
    } else if (result.skipped > 0) {
      toast.info(`All ${result.skipped} leads already exist in your list`);
    }
    // Instant refresh: invalidate prospects & sheets caches
    if (user) {
      queryClient.invalidateQueries({ queryKey: ['prospects', user.id] });
      queryClient.invalidateQueries({ queryKey: ['prospects-kpi', user.id] });
      queryClient.invalidateQueries({ queryKey: ['sheets', user.id] });
    }
  }, [importSharedLeads, queryClient, user]);

  /* Export */
  const exportAll = (type: 'csv' | 'xlsx') => {
    const allLeads = pendingShares.flatMap(share =>
      (share.lead_data || []).map((l: any) => ({
        Name: l.name || '',
        Phone: l.phone || '',
        Sheet: l.sheet_name || '',
        Sender: share.sender_name || 'Unknown',
        Date: format(new Date(share.created_at), 'yyyy-MM-dd HH:mm'),
        Status: share.status,
      }))
    );
    if (allLeads.length === 0) { toast.info('No leads to export'); return; }

    const ws = XLSX.utils.json_to_sheet(allLeads);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Shared Leads');

    if (type === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'shared_leads.csv'; a.click();
      URL.revokeObjectURL(url);
    } else {
      XLSX.writeFile(wb, 'shared_leads.xlsx');
    }
    toast.success('Export downloaded');
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
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
              <p className="text-xs text-muted-foreground font-medium">View, import & download shared leads</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-border/60 overflow-hidden">
              <button
                onClick={() => setViewMode('card')}
                className={`p-1.5 transition-colors ${viewMode === 'card' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 transition-colors ${viewMode === 'table' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}
              >
                <Table2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Export menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportAll('csv')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportAll('xlsx')}>
                  <Download className="h-4 w-4 mr-2" /> Export Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="scrollable-content">
        <div className="container py-4 px-4 space-y-3 pb-20">
          {/* Stats bar */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-blue-50/80 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium border border-blue-100/60 dark:border-blue-800/40">
              {totalBatches} Batch{totalBatches !== 1 ? 'es' : ''} · {totalLeads} Leads
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-medium border border-amber-100/60 dark:border-amber-800/40">
              Pending: {pendingCount}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-100/60 dark:border-emerald-800/40">
              Imported: {importedCount}
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, sender..."
              className="w-full h-9 pl-8 pr-8 bg-muted/40 rounded-xl border border-border/40 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredShares.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{searchQuery ? 'No results found' : 'No shared leads yet'}</p>
              <p className="text-xs text-muted-foreground/70">
                {searchQuery ? 'Try a different search term' : 'Leads shared by your team will appear here'}
              </p>
            </div>
          ) : viewMode === 'card' ? (
            <div className="space-y-3">
              {filteredShares.map(share => (
                <ShareCard key={share.id} share={share} onImport={handleImport} />
              ))}
            </div>
          ) : (
            <ShareTable shares={filteredShares} onImport={handleImport} />
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
