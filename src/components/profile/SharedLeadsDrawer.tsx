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
  /** If true, auto-close drawer after a successful import */
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
      (share.lead_data?.[0]?.sheet_name || '').toLowerCase().includes(q) ||
      share.lead_data?.some((l: any) =>
        (l.name || '').toLowerCase().includes(q) || (l.phone || '').toLowerCase().includes(q)
      )
    );
  }, [pendingShares, searchQuery]);

  /* Import */
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

  /* Delete */
  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    const ok = await deleteShare(deleteConfirm.id);
    if (ok) toast.success('Shared batch deleted');
    else toast.error('Failed to delete');
    setDeleting(false);
    setDeleteConfirm(null);
  }, [deleteConfirm, deleteShare]);

  /* Export single batch */
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
            <DrawerTitle className="text-lg">Shared Leads</DrawerTitle>
            <p className="text-xs text-muted-foreground">Import leads shared by your team</p>
          </DrawerHeader>

          <div className="px-4 pb-6 overflow-y-auto space-y-3">
            {/* Stats */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="px-2 py-1 rounded-lg bg-blue-50/80 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium border border-blue-100/60 dark:border-blue-800/40">
                {totalBatches} Batch{totalBatches !== 1 ? 'es' : ''} · {totalLeads} Leads
              </span>
              <span className="px-2 py-1 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-medium border border-amber-100/60 dark:border-amber-800/40">
                Pending: {pendingCount}
              </span>
              <span className="px-2 py-1 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-100/60 dark:border-emerald-800/40">
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
                placeholder="Search by sheet, name, phone..."
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
            ) : (
              <div className="space-y-2">
                {filteredShares.map(share => {
                  const leadCount = share.lead_data?.length || 0;
                  const sheetName = share.lead_data?.[0]?.sheet_name || 'Untitled';
                  const isExpanded = expandedId === share.id;

                  return (
                    <div
                      key={share.id}
                      className="rounded-xl border border-border/50 bg-card overflow-hidden"
                    >
                      <div
                        className="p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : share.id)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">{sheetName}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {share.sender_name || 'Unknown'} · {format(new Date(share.created_at), 'dd MMM, hh:mm a')}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-[11px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 shrink-0">
                            {leadCount}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1.5 mt-2">
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1 px-3 flex-1"
                            disabled={importingId === share.id}
                            onClick={e => handleImport(e, share.id)}
                          >
                            {importingId === share.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSpreadsheet className="h-3 w-3" />}
                            Import
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            title="Export"
                            onClick={e => { e.stopPropagation(); exportBatch(share); }}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:border-destructive/50"
                            title="Delete"
                            onClick={e => { e.stopPropagation(); setDeleteConfirm({ id: share.id, name: sheetName }); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {isExpanded && share.lead_data?.length > 0 && (
                        <div className="border-t border-border/50 px-3 py-2 space-y-1 max-h-40 overflow-y-auto bg-muted/20">
                          {share.lead_data.map((lead: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border/20 last:border-0">
                              <span className="font-medium truncate flex-1 text-xs">{lead.name || '-'}</span>
                              <span className="text-muted-foreground text-xs ml-2 shrink-0">{lead.phone || '-'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={open => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete shared batch?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "<span className="font-medium">{deleteConfirm?.name}</span>" and its lead data.
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
