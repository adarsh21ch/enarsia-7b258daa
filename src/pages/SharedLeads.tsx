import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSharedLeads, SharedLeadRecord } from '@/hooks/useSharedLeads';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, Download, Package, Search, X, MoreVertical, FileSpreadsheet, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

/* ---------- Expanded Detail Row ---------- */
function ExpandedLeads({ leads }: {leads: any[];}) {
  if (!leads?.length) return <tr><td colSpan={4} className="px-4 py-3 text-sm text-muted-foreground text-center">No leads</td></tr>;
  return (
    <>
      <tr className="bg-muted/30">
        <td className="px-4 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Name</td>
        <td className="px-4 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Phone</td>
        <td className="px-4 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Notes</td>
        <td />
      </tr>
      {leads.map((lead: any, i: number) =>
      <tr key={i} className="bg-muted/10 border-b border-border/20 last:border-0">
          <td className="px-4 py-2 text-sm font-medium truncate max-w-[160px]">{lead.name || '-'}</td>
          <td className="px-4 py-2 text-sm text-muted-foreground">{lead.phone || '-'}</td>
          <td className="px-4 py-2 text-xs text-muted-foreground hidden sm:table-cell truncate max-w-[200px]">{lead.notes || '-'}</td>
          <td />
        </tr>
      )}
    </>);

}

/* ---------- Main Page ---------- */
export default function SharedLeads() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { pendingShares, loading, importSharedLeads, deleteShare } = useSharedLeads();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string;name: string;} | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user && !authLoading) navigate('/auth');
  }, [user, authLoading, navigate]);

  /* Stats */
  const totalBatches = pendingShares.length;
  const totalLeads = useMemo(() => pendingShares.reduce((sum, s) => sum + (s.lead_data?.length || 0), 0), [pendingShares]);
  const pendingCount = useMemo(() => pendingShares.filter((s) => s.status === 'pending').length, [pendingShares]);
  const importedCount = totalBatches - pendingCount;

  /* Search filter */
  const filteredShares = useMemo(() => {
    if (!searchQuery.trim()) return pendingShares;
    const q = searchQuery.toLowerCase();
    return pendingShares.filter((share) =>
    (share.sender_name || '').toLowerCase().includes(q) ||
    (share.lead_data?.[0]?.sheet_name || '').toLowerCase().includes(q) ||
    share.lead_data?.some((l: any) =>
    (l.name || '').toLowerCase().includes(q) ||
    (l.phone || '').toLowerCase().includes(q)
    )
    );
  }, [pendingShares, searchQuery]);

  /* Import with instant cache invalidation */
  const handleImport = useCallback(async (e: React.MouseEvent, shareId: string) => {
    e.stopPropagation();
    setImportingId(shareId);
    const result = await importSharedLeads(shareId);
    if (result.imported > 0 && result.skipped > 0) {
      toast.success(`${result.imported} leads imported, ${result.skipped} duplicates skipped`);
    } else if (result.imported > 0) {
      toast.success(`${result.imported} leads imported successfully`);
    } else if (result.skipped > 0) {
      toast.info(`All ${result.skipped} leads already exist in your list`);
    }
    if (user) {
      queryClient.invalidateQueries({ queryKey: ['prospects', user.id] });
      queryClient.invalidateQueries({ queryKey: ['prospects-kpi', user.id] });
      queryClient.invalidateQueries({ queryKey: ['sheets', user.id] });
    }
    setImportingId(null);
  }, [importSharedLeads, queryClient, user]);

  /* Delete shared lead batch */
  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    const ok = await deleteShare(deleteConfirm.id);
    if (ok) toast.success('Shared batch deleted');else
    toast.error('Failed to delete');
    setDeleting(false);
    setDeleteConfirm(null);
  }, [deleteConfirm, deleteShare]);

  /* Export single batch */
  const exportBatch = (share: SharedLeadRecord) => {
    const leads = (share.lead_data || []).map((l: any) => ({
      Name: l.name || '',
      Phone: l.phone || '',
      Sheet: l.sheet_name || '',
      Notes: l.notes || '',
      Priority: l.priority || ''
    }));
    if (leads.length === 0) {toast.info('No leads to export');return;}
    const ws = XLSX.utils.json_to_sheet(leads);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, `shared_leads_${(share.lead_data?.[0]?.sheet_name || 'batch').replace(/\s+/g, '_')}.xlsx`);
    toast.success('Exported');
  };

  /* Export all */
  const exportAll = (type: 'csv' | 'xlsx') => {
    const allLeads = pendingShares.flatMap((share) =>
    (share.lead_data || []).map((l: any) => ({
      Name: l.name || '',
      Phone: l.phone || '',
      Sheet: l.sheet_name || '',
      Sender: share.sender_name || 'Unknown',
      Date: format(new Date(share.created_at), 'yyyy-MM-dd HH:mm'),
      Status: share.status
    }))
    );
    if (allLeads.length === 0) {toast.info('No leads to export');return;}

    const ws = XLSX.utils.json_to_sheet(allLeads);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Shared Leads');

    if (type === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;a.download = 'shared_leads.csv';a.click();
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
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by sheet, name, phone, sender..."
              className="w-full h-9 pl-8 pr-8 bg-muted/40 rounded-xl border border-border/40 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />

            {searchQuery &&
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            }
          </div>

          {/* Table */}
          {loading ?
          <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div> :
          filteredShares.length === 0 ?
          <div className="text-center py-12 space-y-2">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{searchQuery ? 'No results found' : 'No shared leads yet'}</p>
              <p className="text-xs text-muted-foreground/70">
                {searchQuery ? 'Try a different search term' : 'Leads shared by your team will appear here'}
              </p>
            </div> :

          <div className="border border-border/50 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/60 border-b-2 border-accent/30">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Sheet / Sender</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground text-xs">Leads</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground text-xs hidden sm:table-cell">Date</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs w-[100px]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShares.map((share) => {
                  const leadCount = share.lead_data?.length || 0;
                  const sheetName = share.lead_data?.[0]?.sheet_name || 'Untitled';
                  const isExpanded = expandedId === share.id;

                  return (
                    <>
                        <tr
                        key={share.id}
                        onClick={() => setExpandedId(isExpanded ? null : share.id)}
                        className={`border-b border-border/30 cursor-pointer transition-colors hover:bg-muted/40 ${isExpanded ? 'bg-muted/20' : 'bg-card'}`}>

                          <td className="px-4 py-3">
                            <p className="font-semibold text-sm leading-tight truncate">{sheetName}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{share.sender_name || 'Unknown'}</p>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <Badge variant="secondary" className="text-[11px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                              {leadCount}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-center text-xs text-muted-foreground hidden sm:table-cell">
                            {format(new Date(share.created_at), 'dd MMM, hh:mm a')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                              size="sm"
                              className="h-7 text-xs gap-1 px-3"
                              disabled={importingId === share.id}
                              onClick={(e) => handleImport(e, share.id)}>

                                {importingId === share.id ?
                              <Loader2 className="h-3 w-3 animate-spin" /> :
                              <FileSpreadsheet className="h-3 w-3" />}
                                Upload
                              </Button>
                              <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              title="Export this batch"
                              onClick={(e) => {
                                e.stopPropagation();
                                exportBatch(share);
                              }}>

                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              title="Delete this batch"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm({ id: share.id, name: sheetName });
                              }}>

                                <Trash2 className="h-3.5 w-3.5 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && <ExpandedLeads key={`${share.id}-detail`} leads={share.lead_data} />}
                      </>);

                })}
                </tbody>
              </table>
            </div>
          }
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete shared batch?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the shared batch "<span className="font-medium">{deleteConfirm?.name}</span>" and its lead data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">

              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>);

}