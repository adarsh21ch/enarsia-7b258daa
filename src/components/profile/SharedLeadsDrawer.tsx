import { useState, useMemo, useCallback } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Download, Package, Search, X, FileSpreadsheet, Trash2 } from 'lucide-react';
import { useSharedLeads, SharedLeadRecord } from '@/hooks/useSharedLeads';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

interface SharedLeadsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  closeOnImport?: boolean;
}

export function SharedLeadsDrawer({ open, onOpenChange, closeOnImport = false }: SharedLeadsDrawerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { pendingShares, loading, importSharedLeads, deleteShare } = useSharedLeads();

  const [searchQuery, setSearchQuery] = useState('');
  const [importingId, setImportingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const totalBatches = pendingShares.length;
  const totalLeads = useMemo(() => pendingShares.reduce((sum, s) => sum + (s.lead_data?.length || 0), 0), [pendingShares]);
  const pendingCount = useMemo(() => pendingShares.filter(s => s.status === 'pending').length, [pendingShares]);
  const importedCount = totalBatches - pendingCount;

  const filteredShares = useMemo(() => {
    if (!searchQuery.trim()) return pendingShares;
    const q = searchQuery.toLowerCase();
    return pendingShares.filter(share =>
      (share.sender_name || '').toLowerCase().includes(q) ||
      (share.lead_data?.[0]?.sheet_name || '').toLowerCase().includes(q) ||
      share.lead_data?.some((l: any) =>
        (l.name || '').toLowerCase().includes(q) || (l.phone || '').toLowerCase().includes(q)
      )
    );
  }, [pendingShares, searchQuery]);

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
    if (closeOnImport && result.imported > 0) {
      onOpenChange(false);
    }
  }, [importSharedLeads, queryClient, user, closeOnImport, onOpenChange]);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    const ok = await deleteShare(deleteConfirm.id);
    if (ok) toast.success('Shared batch deleted');
    else toast.error('Failed to delete');
    setDeleting(false);
    setDeleteConfirm(null);
  }, [deleteConfirm, deleteShare]);

  const exportBatch = (share: SharedLeadRecord) => {
    const leads = (share.lead_data || []).map((l: any) => ({
      Name: l.name || '', Phone: l.phone || '', Sheet: l.sheet_name || '', Notes: l.notes || '', Priority: l.priority || ''
    }));
    if (leads.length === 0) { toast.info('No leads to export'); return; }
    const ws = XLSX.utils.json_to_sheet(leads);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, `shared_leads_${(share.lead_data?.[0]?.sheet_name || 'batch').replace(/\s+/g, '_')}.xlsx`);
    toast.success('Exported');
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-lg font-bold tracking-tight">Shared Leads</DrawerTitle>
            <p className="text-xs text-muted-foreground font-medium">View, import & download shared leads</p>
          </DrawerHeader>

          <div className="px-4 pb-6 overflow-y-auto space-y-3">
            {/* Stats bar — identical to /shared-leads page */}
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
                placeholder="Search by sheet, name, phone, sender..."
                className="w-full h-9 pl-8 pr-8 bg-muted/40 rounded-xl border border-border/40 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted">
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Table — matching /shared-leads page layout */}
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
            ) : (
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
                    {filteredShares.map(share => {
                      const leadCount = share.lead_data?.length || 0;
                      const sheetName = share.lead_data?.[0]?.sheet_name || 'Untitled';
                      const isExpanded = expandedId === share.id;

                      return (
                        <tr
                          key={share.id}
                          onClick={() => setExpandedId(isExpanded ? null : share.id)}
                          className={`border-b border-border/30 cursor-pointer transition-colors hover:bg-muted/40 ${isExpanded ? 'bg-muted/20' : 'bg-card'}`}
                        >
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
                                onClick={e => handleImport(e, share.id)}
                              >
                                {importingId === share.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSpreadsheet className="h-3 w-3" />}
                                Upload
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                title="Export this batch"
                                onClick={e => { e.stopPropagation(); exportBatch(share); }}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                title="Delete this batch"
                                onClick={e => { e.stopPropagation(); setDeleteConfirm({ id: share.id, name: sheetName }); }}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={o => !o && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete shared batch?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "<span className="font-medium">{deleteConfirm?.name}</span>" and its lead data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
