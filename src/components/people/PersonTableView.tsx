import { useMemo, useState, useEffect, Suspense, lazy } from 'react';
import { AddProspectDialog } from '@/components/prospects/AddProspectDialog';
const ImportExcelDialog = lazy(() => import('@/components/prospects/ImportExcelDialog').then(m => ({ default: m.ImportExcelDialog })));

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { Prospect, Sheet as SheetType } from '@/types/prospect';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  MoreHorizontal,
  Phone,
  MessageSquareText,
  Trash2,
  Download,
  Search,
  Settings2,
  ChevronLeft,
  ChevronRight,
  List,
  LayoutGrid,
  Check,
  UserPlus,
  Upload,
  Share2,
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/ActionIcons';
import { SheetTabs } from '@/components/prospects/SheetTabs';
import { ProspectDetailModal } from '@/components/prospects/ProspectDetailModal';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { buildWhatsAppLink } from '@/lib/whatsapp';

const openWhatsApp = (phone: string) => window.open(buildWhatsAppLink(phone), '_blank');

interface PersonTableViewProps {
  prospects: Prospect[];
  loading: boolean;
  onAdd?: (prospect: Partial<Prospect>) => Promise<Prospect | null>;
  onImport?: (
    prospects: Partial<Prospect>[],
    onProgress?: (imported: number, total: number) => void,
  ) => Promise<{ imported: number; skipped: number }>;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
  onDelete: (id: string) => Promise<Prospect | null | boolean>;
  onBulkDelete?: (ids: string[]) => Promise<{ deleted: number; prospects: Prospect[] }>;
  // Sheets
  sheets: SheetType[];
  selectedSheetId: string | null;
  onSelectSheet: (id: string | null) => void;
  onAddSheet: (name: string) => Promise<SheetType | null>;
  onUpdateSheet: (id: string, name: string) => Promise<SheetType | null>;
  onDeleteSheet: (id: string) => Promise<boolean>;
  // External search
  externalSearch?: string;
  onExternalSearchChange?: (v: string) => void;
  // Pagination (server)
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  source: 'leads' | 'funnel';
  viewMode?: 'card' | 'table';
  onToggleView?: () => void;
  viewToggleDisabled?: boolean;
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCSV(rows: Prospect[], source: string) {
  const headers = [
    'Name',
    'Phone',
    'Phone 2',
    'Email',
    'Stage',
    'Quality',
    'Source',
    'Address',
    'State',
    'Notes',
    'Updated',
  ];
  const lines = [headers.join(',')];
  for (const p of rows) {
    lines.push(
      [
        p.name,
        p.phone,
        p.phone2 ?? '',
        p.email ?? '',
        p.funnel_stage ?? '',
        p.prospect_status ?? '',
        (p as any).source ?? '',
        p.address ?? '',
        p.state ?? '',
        p.notes ?? '',
        p.updated_at ?? '',
      ]
        .map(csvEscape)
        .join(','),
    );
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `nevorai-${source}-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function PersonTableView({
  prospects,
  loading,
  onAdd,
  onImport,
  onUpdate,
  onDelete,
  onBulkDelete,
  sheets,
  selectedSheetId,
  onSelectSheet,
  onAddSheet,
  onUpdateSheet,
  onDeleteSheet,
  externalSearch,
  onExternalSearchChange,
  hasNextPage,
  onLoadMore,
  isLoadingMore,
  source,
  viewMode,
  onToggleView,
  viewToggleDisabled,
}: PersonTableViewProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [stageFilter, setStageFilter] = useState<string>('');
  const [qualityFilter, setQualityFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [search, setSearch] = useState(externalSearch ?? '');
  const [activeProspect, setActiveProspect] = useState<Prospect | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [addProspectOpen, setAddProspectOpen] = useState(false);
  const [fixMappingOpen, setFixMappingOpen] = useState(false);

  useEffect(() => {
    if (externalSearch !== undefined) setSearch(externalSearch);
  }, [externalSearch]);

  const handleSearchChange = (v: string) => {
    setSearch(v);
    onExternalSearchChange?.(v);
  };

  // Build options from data
  const stageOptions = useMemo(
    () => Array.from(new Set(prospects.map((p) => p.funnel_stage).filter(Boolean))) as string[],
    [prospects],
  );
  const qualityOptions = useMemo(
    () => Array.from(new Set(prospects.map((p) => p.prospect_status).filter(Boolean))) as string[],
    [prospects],
  );
  const sourceOptions = useMemo(
    () => Array.from(new Set(prospects.map((p) => (p as any).source).filter(Boolean))) as string[],
    [prospects],
  );

  const filtered = useMemo(() => {
    return prospects.filter((p) => {
      if (stageFilter && p.funnel_stage !== stageFilter) return false;
      if (qualityFilter && p.prospect_status !== qualityFilter) return false;
      if (sourceFilter && (p as any).source !== sourceFilter) return false;
      return true;
    });
  }, [prospects, stageFilter, qualityFilter, sourceFilter]);

  const columns = useMemo<ColumnDef<Prospect>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? 'indeterminate'
                  : false
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            onClick={(e) => e.stopPropagation()}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        size: 32,
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.name || '—'}</span>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        cell: ({ row }) => (
          <a
            href={`tel:${row.original.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="text-primary hover:underline tabular-nums"
          >
            {row.original.phone}
          </a>
        ),
      },
      {
        accessorKey: 'funnel_stage',
        header: 'Stage',
        cell: ({ row }) => (
          <span className="text-xs px-2 py-0.5 rounded-md bg-muted/60 text-foreground">
            {row.original.funnel_stage || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'prospect_status',
        header: 'Quality',
        cell: ({ row }) => (
          <span className="text-xs px-2 py-0.5 rounded-md bg-muted/60 text-foreground">
            {row.original.prospect_status || '—'}
          </span>
        ),
      },
      {
        id: 'notes',
        header: 'Notes',
        cell: ({ row }) => {
          const p = row.original;
          if (editingNotes === p.id) {
            return (
              <Input
                autoFocus
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onBlur={() => {
                  if (notesDraft !== (p.notes ?? '')) onUpdate(p.id, { notes: notesDraft });
                  setEditingNotes(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                  } else if (e.key === 'Escape') {
                    setEditingNotes(null);
                  }
                }}
                className="h-7 text-xs"
              />
            );
          }
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingNotes(p.id);
                setNotesDraft(p.notes ?? '');
              }}
              className="text-left text-xs text-muted-foreground truncate max-w-[220px] hover:text-foreground"
            >
              {p.notes || <span className="italic opacity-60">Add note…</span>}
            </button>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: 'updated_at',
        header: 'Last Updated',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {row.original.updated_at
              ? formatDistanceToNow(new Date(row.original.updated_at), { addSuffix: true })
              : '—'}
          </span>
        ),
      },
      {
        id: 'source',
        accessorFn: (r) => (r as any).source ?? '',
        header: 'Source',
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">
            {(getValue() as string) || '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => setActiveProspect(p)}>
                  Open / Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => (window.location.href = `tel:${p.phone}`)}>
                  <Phone className="h-3.5 w-3.5 mr-2" /> Call
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openWhatsApp(p.phone)}>
                  <WhatsAppIcon className="h-3.5 w-3.5 mr-2" /> WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => (window.location.href = `sms:${p.phone}`)}>
                  <MessageSquareText className="h-3.5 w-3.5 mr-2" /> Text
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={async () => {
                    await onDelete(p.id);
                    toast.success('Lead deleted');
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [editingNotes, notesDraft, onUpdate, onDelete],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, rowSelection, columnVisibility, globalFilter: search },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: handleSearchChange,
    globalFilterFn: (row, _id, filterValue) => {
      if (!filterValue) return true;
      const q = String(filterValue).toLowerCase();
      const p = row.original;
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
    getRowId: (r) => r.id,
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows.map((r) => r.original);
  const selectedCount = selectedRows.length;

  return (
    <div className="flex flex-col gap-2 pb-28">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search name, phone, email…"
            className="h-8 pl-7 text-xs"
          />
        </div>

        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="h-8 text-xs rounded-md border border-input bg-background px-2"
        >
          <option value="">All stages</option>
          {stageOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={qualityFilter}
          onChange={(e) => setQualityFilter(e.target.value)}
          className="h-8 text-xs rounded-md border border-input bg-background px-2"
        >
          <option value="">All quality</option>
          {qualityOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {sourceOptions.length > 0 && (
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-8 text-xs rounded-md border border-input bg-background px-2"
          >
            <option value="">All sources</option>
            {sourceOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <Settings2 className="h-3.5 w-3.5 mr-1" /> Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Show columns</DropdownMenuLabel>
            {table
              .getAllLeafColumns()
              .filter((c) => c.id !== 'select' && c.id !== 'actions')
              .map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onCheckedChange={(v) => col.toggleVisibility(!!v)}
                >
                  {typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex items-center gap-2">
          {onToggleView && (
            <div className="inline-flex items-center rounded-xl border border-border bg-background p-0.5 shadow-sm" role="group" aria-label="View mode">
              <button
                type="button"
                onClick={() => { if (viewMode !== 'card') onToggleView(); }}
                className={cn(
                  "h-7 px-2.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors",
                  viewMode !== 'table' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
                aria-pressed={viewMode !== 'table'}
                title="Card view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Card</span>
              </button>
              <button
                type="button"
                onClick={() => { if (viewMode !== 'table' && !viewToggleDisabled) onToggleView(); }}
                disabled={viewToggleDisabled}
                className={cn(
                  "h-7 px-2.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors disabled:opacity-40",
                  viewMode === 'table' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
                aria-pressed={viewMode === 'table'}
                title={viewToggleDisabled ? 'List view requires a wider screen' : 'List view'}
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden md:inline">List</span>
              </button>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {onToggleView && (
                <>
                  <DropdownMenuItem
                    onClick={() => { if (!viewToggleDisabled) onToggleView(); }}
                    disabled={viewToggleDisabled}
                    className="gap-2"
                  >
                    <List className="h-4 w-4" />
                    Switch to Card view
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {onAdd && (
                <DropdownMenuItem onClick={() => setAddProspectOpen(true)} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Prospect
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => downloadCSV(selectedCount ? selectedRows : filtered, source)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {selectedCount ? `Export ${selectedCount} Selected` : 'Export Leads'}
              </DropdownMenuItem>
              {onImport && (
                <DropdownMenuItem onClick={() => setFixMappingOpen(true)} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Fix column mapping
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (onToggleView && !viewToggleDisabled) onToggleView();
                  toast.message('Switched to Card view', { description: 'Use the 3-dot menu → Share Leads to share.' });
                }}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share Leads
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>


      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-xs font-medium">{selectedCount} selected</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => {
              selectedRows.forEach((p) => openWhatsApp(p.phone));
            }}
          >
            <WhatsAppIcon className="h-3 w-3 mr-1" /> WhatsApp
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => downloadCSV(selectedRows, source)}
          >
            <Download className="h-3 w-3 mr-1" /> Export CSV
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs ml-auto"
            onClick={() => setRowSelection({})}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border/40 bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/30">
                {hg.headers.map((h) => {
                  const canSort = h.column.getCanSort();
                  const sorted = h.column.getIsSorted();
                  // Responsive hiding for less-critical columns
                  const hideOnTablet =
                    h.column.id === 'source' || h.column.id === 'updated_at';
                  return (
                    <TableHead
                      key={h.id}
                      className={cn(
                        'h-9 text-xs font-medium',
                        canSort && 'cursor-pointer select-none',
                        hideOnTablet && 'hidden lg:table-cell',
                      )}
                      onClick={canSort ? h.column.getToggleSortingHandler() : undefined}
                    >
                      <div className="flex items-center gap-1">
                        {h.isPlaceholder
                          ? null
                          : flexRender(h.column.columnDef.header, h.getContext())}
                        {canSort &&
                          (sorted === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          ))}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading && prospects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground text-sm">
                  Loading…
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground text-sm">
                  No leads found
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  className="cursor-pointer"
                  onClick={() => setActiveProspect(row.original)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const hideOnTablet =
                      cell.column.id === 'source' || cell.column.id === 'updated_at';
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn('py-2 text-sm', hideOnTablet && 'hidden lg:table-cell')}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground py-1">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())} ·{' '}
          {filtered.length} loaded
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => {
              if (!table.getCanNextPage() && hasNextPage) {
                onLoadMore?.();
              } else {
                table.nextPage();
              }
            }}
            disabled={!table.getCanNextPage() && !hasNextPage}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {hasNextPage && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onLoadMore?.()}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? 'Loading…' : 'Load more'}
            </Button>
          )}
        </div>
      </div>

      {/* Sheet tabs persist at bottom */}
      <div className="pt-1">
        <SheetTabs
          sheets={sheets}
          selectedSheetId={selectedSheetId}
          onSelectSheet={onSelectSheet}
          onAddSheet={onAddSheet}
          onUpdateSheet={onUpdateSheet}
          onDeleteSheet={onDeleteSheet}
        />
      </div>

      {/* Detail modal */}
      {activeProspect && (
        <ProspectDetailModal
          prospect={activeProspect}
          open={!!activeProspect}
          onOpenChange={(o) => !o && setActiveProspect(null)}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      )}

      {/* Bulk delete confirm */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} leads?</AlertDialogTitle>
            <AlertDialogDescription>
              They will be moved to Recently Deleted and can be restored within 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const ids = selectedRows.map((r) => r.id);
                if (onBulkDelete) {
                  const res = await onBulkDelete(ids);
                  toast.success(`${res.deleted} deleted`);
                } else {
                  for (const id of ids) await onDelete(id);
                  toast.success(`${ids.length} deleted`);
                }
                setRowSelection({});
                setBulkDeleteOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
