import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Prospect, FunnelStage, ProspectQuality, Sheet, ExtendedActionTaken, FUNNEL_STAGES, EXTENDED_ACTIONS } from '@/types/prospect';
import { SortableProspectRow } from './SortableProspectRow';
import { MobileProspectCard } from './MobileProspectCard';
import { ProspectFilters } from './ProspectFilters';
import { KPIStrip } from './KPIStrip';
import { AddProspectDialog } from './AddProspectDialog';
import { ImportExcelDialog } from './ImportExcelDialog';
import { SheetTabs } from './SheetTabs';
import { ManageResponseTagsDialog } from './ManageResponseTagsDialog';
import { ManageStageTagsDialog } from './ManageStageTagsDialog';
import { ChangeFilterTagButton } from './ChangeFilterTagButton';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, Undo2, Redo2, X, Trash2, Edit, Star } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { useUndoRedo, UndoAction } from '@/hooks/useUndoRedo';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useCustomOptionsContext } from '@/contexts/CustomOptionsContext';
import { useTrackingTags } from '@/hooks/useTrackingTags';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
interface Filters {
  search: string;
  stages: FunnelStage[];
  qualities: ProspectQuality[];
  actions: ExtendedActionTaken[];
  incompleteOnly: boolean;
}
interface ProspectTableProps {
  prospects: Prospect[];
  loading: boolean;
  onAdd: (prospect: Partial<Prospect>) => Promise<Prospect | null>;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
  onDelete: (id: string) => Promise<boolean>;
  onImport: (prospects: Partial<Prospect>[], onProgress?: (imported: number, total: number) => void) => Promise<{
    imported: number;
    skipped: number;
  }>;
  onReorderProspects?: (prospectIds: string[]) => Promise<boolean>;
  onRestoreProspect?: (prospect: Prospect) => Promise<Prospect | null>;
  onRestoreProspects?: (prospects: Prospect[]) => Promise<number>;
  onBulkDelete?: (ids: string[]) => Promise<{
    deleted: number;
    prospects: Prospect[];
  }>;
  // Sheet props
  sheets: Sheet[];
  selectedSheetId: string | null;
  onSelectSheet: (id: string | null) => void;
  onAddSheet: (name: string) => Promise<Sheet | null>;
  onUpdateSheet: (id: string, name: string) => Promise<Sheet | null>;
  onDeleteSheet: (id: string) => Promise<boolean>;
  // Auto date sheet creation (only for Leads tab)
  getOrCreateTodaySheet?: () => Promise<string | null>;
  // Filter mode from parent
  filterMode: 'calling' | 'funnel';
  subFilter: 'all' | 'hot' | 'scheduled' | 'day1' | 'progress';
  // External search from parent (optional - if provided, will be used instead of internal search)
  externalSearch?: string;
}

// Simplified column configuration - only 3 columns, no horizontal scroll needed
const COLUMNS = [{
  id: 'index',
  label: '#',
  width: '10%',
  minWidth: 40
}, {
  id: 'name',
  label: 'Name',
  width: '55%',
  minWidth: 160
}, {
  id: 'action',
  label: 'Response',
  width: '35%',
  minWidth: 100
}, {
  id: 'stage',
  label: 'Stage',
  width: '35%',
  minWidth: 100
}];

// Column order for Calling tab: #, Name, Response
const CALLING_COLUMN_ORDER = ['index', 'name', 'action'];
// Column order for Funnel tab: #, Name, Funnel
const FILTER_COLUMN_ORDER = ['index', 'name', 'stage'];

// TableContent component
interface TableContentProps {
  isMobile: boolean;
  COLUMN_ORDER: string[];
  selectionMode: {
    active: boolean;
    sheetId: string | null;
  };
  selectedIds: Set<string>;
  selectionProspects: Prospect[];
  handleSelectAll: () => void;
  sheets: Sheet[];
  selectedSheetId: string | null;
  onSelectSheet: (id: string | null) => void;
  onAddSheet: (name: string) => Promise<Sheet | null>;
  handleUpdateSheetWithUndo: (id: string, name: string) => Promise<Sheet | null>;
  onDeleteSheet: (id: string) => Promise<boolean>;
  handleEnterSelectMode: (sheetId: string | null) => void;
  handleDeleteAllInSheet: (sheetId: string | null) => Promise<void>;
  filteredProspects: Prospect[];
  prospects: Prospect[];
  sheetFilteredProspects: Prospect[];
  setFilters: (filters: Filters) => void;
  isCalling: boolean;
  expandedRowId: string | null;
  handleToggleExpand: (id: string) => void;
  handleUpdateWithUndo: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
  handleDeleteWithUndo: (id: string) => Promise<boolean>;
  handleToggleSelect: (id: string) => void;
  enableDragAndDrop: boolean;
  callingTrackingTags: string[];
  stageTrackingTags: string[];
  onOpenResponseTagsDialog: () => void;
  onOpenStageTagsDialog: () => void;
  lastContactedId: string | null;
  onMarkLastContacted: (id: string) => void;
  onExportSheet?: (sheetId: string | null) => void;
  onExportAll?: () => void;
}
function TableContent({
  isMobile,
  COLUMN_ORDER,
  selectionMode,
  selectedIds,
  selectionProspects,
  handleSelectAll,
  sheets,
  selectedSheetId,
  onSelectSheet,
  onAddSheet,
  handleUpdateSheetWithUndo,
  onDeleteSheet,
  handleEnterSelectMode,
  handleDeleteAllInSheet,
  filteredProspects,
  prospects,
  sheetFilteredProspects,
  setFilters,
  isCalling,
  expandedRowId,
  handleToggleExpand,
  handleUpdateWithUndo,
  handleDeleteWithUndo,
  handleToggleSelect,
  enableDragAndDrop,
  callingTrackingTags,
  stageTrackingTags,
  onOpenResponseTagsDialog,
  onOpenStageTagsDialog,
  lastContactedId,
  onMarkLastContacted,
  onExportSheet,
  onExportAll
}: TableContentProps) {
  return <div className="relative flex flex-col h-full">
      {/* Table - scrollable area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <table className="w-full text-sm border-collapse bg-card table-fixed">
          {/* Header row */}
          <thead className="sticky top-0 z-20 shadow-sm">
            <tr className="bg-muted text-xs font-semibold text-muted-foreground border-b border-border">
              {/* Selection checkbox header */}
              {selectionMode.active && <th className="w-10 px-2 py-2.5 bg-muted">
                  <Checkbox checked={selectedIds.size === selectionProspects.length && selectionProspects.length > 0} onCheckedChange={handleSelectAll} />
                </th>}
              {COLUMN_ORDER.map(columnId => {
              const col = COLUMNS.find(c => c.id === columnId);
              if (!col) return null;
              return <th key={columnId} className={cn("px-2 py-2.5 text-left whitespace-nowrap bg-muted select-none", columnId === 'index' && "text-center", isMobile && "text-[11px] px-1.5")} style={{
                width: col.width,
                minWidth: `${col.minWidth}px`
              }}>
                    <div className="flex items-center gap-0.5">
                      <span>{col.label}</span>
                      {columnId === 'action' && <button className="p-0.5 rounded hover:bg-muted/50 transition-colors ml-1" onClick={e => {
                    e.stopPropagation();
                    onOpenResponseTagsDialog();
                  }} title="Manage Response Tags">
                          <Edit className="h-3 w-3 text-muted-foreground" />
                        </button>}
                      {columnId === 'stage' && <button className="p-0.5 rounded hover:bg-muted/50 transition-colors ml-1" onClick={e => {
                    e.stopPropagation();
                    onOpenStageTagsDialog();
                  }} title="Manage Stage Tags">
                          <Edit className="h-3 w-3 text-muted-foreground" />
                        </button>}
                    </div>
                  </th>;
            })}
            </tr>
          </thead>
          {/* Table body */}
          <tbody>
            {filteredProspects.length === 0 ? <tr>
                <td colSpan={COLUMN_ORDER.length + (selectionMode.active ? 1 : 0)} className="py-12 text-center bg-card">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {prospects.length === 0 ? "No leads yet" : selectedSheetId ? "No leads in this sheet" : "No leads match your filters"}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mb-3">
                    {prospects.length === 0 || selectedSheetId && sheetFilteredProspects.length === 0 ? "Import Excel or Add Lead to get started" : <button onClick={() => setFilters({
                  search: '',
                  stages: [],
                  qualities: [],
                  actions: [],
                  incompleteOnly: false
                })} className="text-accent hover:underline">
                        Clear filters
                      </button>}
                  </p>
                </td>
              </tr> : filteredProspects.map((prospect, index) => <SortableProspectRow key={prospect.id} prospect={prospect} index={index + 1} isCalling={isCalling} isExpanded={expandedRowId === prospect.id} onToggleExpand={() => handleToggleExpand(prospect.id)} onUpdate={handleUpdateWithUndo} onDelete={handleDeleteWithUndo} isEven={index % 2 === 0} columnOrder={COLUMN_ORDER} isMobileTable={isMobile} selectionModeActive={selectionMode.active} showSelection={selectionMode.active && selectionProspects.some(p => p.id === prospect.id)} isSelected={selectedIds.has(prospect.id)} onToggleSelect={() => handleToggleSelect(prospect.id)} disableDrag={!enableDragAndDrop} isLastContacted={lastContactedId === prospect.id} onMarkLastContacted={() => onMarkLastContacted(prospect.id)} />)}
          </tbody>
        </table>
      </div>
      
      {/* Bottom sticky sheet tabs (Excel-style) - always visible */}
      <div className="flex-shrink-0 bg-card border-t border-border/50 shadow-[0_-2px_8px_rgba(0,0,0,0.1)]">
        <SheetTabs sheets={sheets} selectedSheetId={selectedSheetId} onSelectSheet={onSelectSheet} onAddSheet={onAddSheet} onUpdateSheet={handleUpdateSheetWithUndo} onDeleteSheet={onDeleteSheet} onEnterSelectMode={handleEnterSelectMode} onDeleteAllInSheet={handleDeleteAllInSheet} onExportSheet={onExportSheet} onExportAll={onExportAll} />
      </div>
    </div>;
}
export function ProspectTable({
  prospects,
  loading,
  onAdd,
  onUpdate,
  onDelete,
  onImport,
  onReorderProspects,
  onRestoreProspect,
  onRestoreProspects,
  onBulkDelete,
  sheets,
  selectedSheetId,
  onSelectSheet,
  onAddSheet,
  onUpdateSheet,
  onDeleteSheet,
  getOrCreateTodaySheet,
  filterMode,
  subFilter,
  externalSearch = ''
}: ProspectTableProps) {
  const [filters, setFilters] = useState<Filters>({
    search: '',
    stages: [],
    qualities: [],
    actions: [],
    incompleteOnly: false
  });

  // Use external search if provided, otherwise use internal filters.search
  const effectiveSearch = externalSearch || filters.search;
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [exporting, setExporting] = useState(false);
  const isMobile = useIsMobile();

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState<{
    active: boolean;
    sheetId: string | null;
  }>({
    active: false,
    sheetId: null
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Last contacted tracking - highlight the prospect for 3 seconds after call/WhatsApp
  const [lastContactedId, setLastContactedId] = useState<string | null>(null);
  const lastContactedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Tag management dialogs
  const [responseTagsDialogOpen, setResponseTagsDialogOpen] = useState(false);
  const [stageTagsDialogOpen, setStageTagsDialogOpen] = useState(false);

  // Undo/Redo
  const {
    pushAction,
    popUndo,
    popRedo,
    canUndo,
    canRedo
  } = useUndoRedo();

  // Row drag-and-drop sensors - DISABLED on mobile for smooth scrolling
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));

  // Disable drag-and-drop on mobile to prevent scroll interference
  const enableDragAndDrop = !isMobile && !!onReorderProspects;
  const handleRowDragEnd = (event: DragEndEvent) => {
    if (!enableDragAndDrop) return;
    const {
      active,
      over
    } = event;
    if (over && active.id !== over.id && onReorderProspects) {
      const oldIndex = filteredProspects.findIndex(p => p.id === active.id);
      const newIndex = filteredProspects.findIndex(p => p.id === over.id);
      const newOrder = arrayMove(filteredProspects, oldIndex, newIndex);
      onReorderProspects(newOrder.map(p => p.id));
    }
  };

  // Get the Funnel Tag from TrackingFormatContext (the Response tag with isStageTag = true)
  const {
    leadsStageTag
  } = useTrackingFormatContext();

  // Get tracking tags from profile
  const {
    callingTrackingTags,
    stageTrackingTags
  } = useTrackingTags();

  // For DUPLICATING: Calling tab keeps ALL leads in a stable order
  const callingProspects = useMemo(() => {
    return prospects;
  }, [prospects]);

  // Funnel tab list order: when a lead gets the Funnel Tag, it should appear as a "new entry"
  // at the bottom (stable order by action_taken_at ASC).
  const funnelProspects = useMemo(() => {
    const base = (() => {
      if (!leadsStageTag) {
        // No funnel tag set - show empty or fallback to old behavior
        return prospects.filter(p => p.enrollment_status === 'Enrolled' || p.funnel_stage);
      }
      // New behavior: show only leads with the Funnel Tag as their Response
      return prospects.filter(p => p.action_taken === leadsStageTag);
    })();

    // Stable funnel ordering: oldest tagged first, newest tagged last (bottom)
    return [...base].sort((a, b) => {
      const aTagAt = (a as any).action_taken_at as string | null | undefined;
      const bTagAt = (b as any).action_taken_at as string | null | undefined;
      const aTagTime = aTagAt ? new Date(aTagAt).getTime() : 0;
      const bTagTime = bTagAt ? new Date(bTagAt).getTime() : 0;
      if (aTagTime !== bTagTime) return aTagTime - bTagTime;
      const aAdded = new Date(a.date_added).getTime();
      const bAdded = new Date(b.date_added).getTime();
      if (aAdded !== bAdded) return aAdded - bAdded;
      return a.id.localeCompare(b.id);
    });
  }, [prospects, leadsStageTag]);

  // Get base prospects based on filter mode
  const baseProspects = useMemo(() => {
    const base = filterMode === 'calling' ? callingProspects : funnelProspects;
    if (filterMode === 'calling') {
      switch (subFilter) {
        case 'hot':
          return base.filter(p => p.priority === 'High' || p.prospect_status === 'Good');
        case 'scheduled':
          return base.filter(p => p.last_contact_date);
        default:
          return base;
      }
    } else {
      switch (subFilter) {
        case 'day1':
          return base.filter(p => p.funnel_stage === 'Day 1');
        case 'progress':
          return base.filter(p => p.funnel_stage && ['Day 2', 'Day 3', 'Minimum Bill'].includes(p.funnel_stage));
        default:
          return base;
      }
    }
  }, [callingProspects, funnelProspects, filterMode, subFilter]);

  // Filter by sheet (works for both Calling and Funnel tabs)
  const sheetFilteredProspects = useMemo(() => {
    if (!selectedSheetId) return baseProspects;
    return baseProspects.filter(p => p.sheet_id === selectedSheetId);
  }, [baseProspects, selectedSheetId]);

  // Get prospects for selection mode (based on selection sheet, not current view)
  const selectionProspects = useMemo(() => {
    if (!selectionMode.active) return [];
    if (selectionMode.sheetId === null) return baseProspects;
    return baseProspects.filter(p => p.sheet_id === selectionMode.sheetId);
  }, [baseProspects, selectionMode]);

  // Apply search and other filters
  const filteredProspects = useMemo(() => {
    return sheetFilteredProspects.filter(prospect => {
      const searchLower = effectiveSearch.toLowerCase();
      const matchesSearch = !effectiveSearch || prospect.name.toLowerCase().includes(searchLower) || prospect.phone.toLowerCase().includes(searchLower) || prospect.notes?.toLowerCase().includes(searchLower);
      const matchesStage = filters.stages.length === 0 || prospect.funnel_stage && filters.stages.includes(prospect.funnel_stage);
      const matchesQuality = filters.qualities.length === 0 || prospect.prospect_status && filters.qualities.includes(prospect.prospect_status);
      const matchesAction = filters.actions.length === 0 || filters.actions.includes(prospect.action_taken as ExtendedActionTaken) || filters.actions.includes('Enrollment') && prospect.enrollment_status === 'Enrolled';
      const matchesIncomplete = !filters.incompleteOnly || !prospect.funnel_stage || !prospect.prospect_status || !prospect.action_taken;
      return matchesSearch && matchesStage && matchesQuality && matchesAction && matchesIncomplete;
    });
  }, [sheetFilteredProspects, filters, effectiveSearch]);
  const getFilterLabel = (): string => {
    if (filters.stages.length > 0) return filters.stages.join('_').replace(/\s+/g, '');
    if (filters.actions.length > 0) return filters.actions.join('_').replace(/\s+/g, '');
    if (filters.qualities.length > 0) return filters.qualities.join('_');
    if (filters.incompleteOnly) return 'Incomplete';
    return filterMode === 'calling' ? 'Calling' : 'Filter';
  };
  const exportToExcel = async () => {
    if (filteredProspects.length === 0) {
      toast.error('No data to export. Apply filters or add prospects first.');
      return;
    }
    setExporting(true);
    try {
      const exportData = filteredProspects.map((p, i) => ({
        '#': i + 1,
        'Name': p.name || '',
        'Phone Number': p.phone || '',
        'Age': p.age_or_dob || '',
        'Gender': p.gender || '',
        'Address': p.address || '',
        'Enrollment Status': p.enrollment_status || (p.funnel_stage ? 'Enrolled' : 'Not Enrolled'),
        'Funnel Stage': p.funnel_stage || '',
        'Last Action': p.action_taken || 'No Action',
        'Last Action Date': p.updated_at ? format(new Date(p.updated_at), 'dd/MM/yyyy HH:mm') : '',
        'Quality': p.prospect_status || '',
        'Priority': p.priority || '',
        'Notes': p.notes || '',
        'Profession': p.profession || '',
        'Instagram': p.instagram || '',
        'Date Added': p.date_added ? format(new Date(p.date_added), 'dd/MM/yyyy') : ''
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [{
        wch: 5
      }, {
        wch: 25
      }, {
        wch: 15
      }, {
        wch: 10
      }, {
        wch: 10
      }, {
        wch: 30
      }, {
        wch: 15
      }, {
        wch: 12
      }, {
        wch: 18
      }, {
        wch: 18
      }, {
        wch: 10
      }, {
        wch: 10
      }, {
        wch: 40
      }, {
        wch: 20
      }, {
        wch: 20
      }, {
        wch: 12
      }];
      XLSX.utils.book_append_sheet(wb, ws, 'Prospects');
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      const filterLabel = getFilterLabel();
      const filename = `NevorAI_Prospects_${dateStr}_${filterLabel}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${filteredProspects.length} prospects successfully!`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Export specific sheet
  const exportSheet = async (sheetId: string | null) => {
    const sheetProspects = sheetId === null ? baseProspects : baseProspects.filter(p => p.sheet_id === sheetId);
    if (sheetProspects.length === 0) {
      toast.error('No data to export in this sheet.');
      return;
    }
    setExporting(true);
    try {
      const exportData = sheetProspects.map((p, i) => ({
        '#': i + 1,
        'Name': p.name || '',
        'Phone Number': p.phone || '',
        'Age': p.age_or_dob || '',
        'Gender': p.gender || '',
        'Address': p.address || '',
        'Enrollment Status': p.enrollment_status || (p.funnel_stage ? 'Enrolled' : 'Not Enrolled'),
        'Funnel Stage': p.funnel_stage || '',
        'Last Action': p.action_taken || 'No Action',
        'Last Action Date': p.updated_at ? format(new Date(p.updated_at), 'dd/MM/yyyy HH:mm') : '',
        'Quality': p.prospect_status || '',
        'Priority': p.priority || '',
        'Notes': p.notes || '',
        'Profession': p.profession || '',
        'Instagram': p.instagram || '',
        'Date Added': p.date_added ? format(new Date(p.date_added), 'dd/MM/yyyy') : ''
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Prospects');
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      const sheetName = sheetId ? sheets.find(s => s.id === sheetId)?.name || 'Sheet' : 'All';
      const filename = `NevorAI_${sheetName}_${dateStr}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${sheetProspects.length} prospects successfully!`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };
  const handleAddProspect = async (prospect: Partial<Prospect>) => {
    // Auto-assign to today's date sheet for Leads tab
    if (filterMode === 'calling' && getOrCreateTodaySheet) {
      const todaySheetId = await getOrCreateTodaySheet();
      if (todaySheetId) {
        prospect.sheet_id = todaySheetId;
      }
    } else if (selectedSheetId) {
      prospect.sheet_id = selectedSheetId;
    }
    return onAdd(prospect);
  };
  const handleImportProspects = async (prospectsData: Partial<Prospect>[], onProgress?: (imported: number, total: number) => void) => {
    let targetSheetId: string | null = null;

    // Auto-assign to today's date sheet for Leads tab
    if (filterMode === 'calling' && getOrCreateTodaySheet) {
      targetSheetId = await getOrCreateTodaySheet();
      if (targetSheetId) {
        prospectsData = prospectsData.map(p => ({
          ...p,
          sheet_id: targetSheetId
        }));
      }
    } else if (selectedSheetId) {
      targetSheetId = selectedSheetId;
      prospectsData = prospectsData.map(p => ({
        ...p,
        sheet_id: selectedSheetId
      }));
    }
    const result = await onImport(prospectsData, onProgress);

    // Switch to the target sheet after successful import
    if (result.imported > 0 && targetSheetId) {
      onSelectSheet(targetSheetId);
    }
    return result;
  };
  const handleToggleExpand = useCallback((prospectId: string) => {
    if (expandedRowId && expandedRowId !== prospectId) {
      setExpandedRowId(null);
      setTimeout(() => setExpandedRowId(prospectId), 50);
    } else {
      setExpandedRowId(prev => prev === prospectId ? null : prospectId);
    }
  }, [expandedRowId]);

  // Last contacted handler - highlights the prospect for 3 seconds
  const handleMarkLastContacted = useCallback((id: string) => {
    if (lastContactedTimeoutRef.current) {
      clearTimeout(lastContactedTimeoutRef.current);
    }
    setLastContactedId(id);
    lastContactedTimeoutRef.current = setTimeout(() => {
      setLastContactedId(null);
    }, 3000);
  }, []);

  // Selection mode handlers
  const handleEnterSelectMode = (sheetId: string | null) => {
    setSelectionMode({
      active: true,
      sheetId
    });
    setSelectedIds(new Set());
    onSelectSheet(sheetId);
  };
  const handleExitSelectMode = () => {
    setSelectionMode({
      active: false,
      sheetId: null
    });
    setSelectedIds(new Set());
  };
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const handleSelectAll = () => {
    if (selectedIds.size === selectionProspects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectionProspects.map(p => p.id)));
    }
  };

  // Delete with undo support - show snackbar with UNDO on mobile
  const handleDeleteWithUndo = async (id: string) => {
    const prospect = prospects.find(p => p.id === id);
    if (!prospect) return false;
    const result = await onDelete(id);
    if (result) {
      pushAction({
        type: 'delete_prospect',
        data: prospect
      });
      // Close expanded row if it was the deleted one
      if (expandedRowId === id) {
        setExpandedRowId(null);
      }
      // Show snackbar with undo option
      toast.success(`Deleted ${prospect.name}`, {
        action: {
          label: 'UNDO',
          onClick: async () => {
            if (onRestoreProspect) {
              await onRestoreProspect(prospect);
              toast.success('Restored successfully');
            }
          }
        },
        duration: 5000
      });
    }
    return result;
  };
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const toDelete = prospects.filter(p => selectedIds.has(p.id));
    const count = toDelete.length;
    if (onBulkDelete) {
      const result = await onBulkDelete(Array.from(selectedIds));
      if (result.deleted > 0) {
        pushAction({
          type: 'delete_prospects',
          data: toDelete
        });
        toast.success(`Deleted ${result.deleted} prospects`, {
          action: {
            label: 'UNDO',
            onClick: async () => {
              if (onRestoreProspects) {
                await onRestoreProspects(toDelete);
                toast.success('Restored successfully');
              }
            }
          },
          duration: 5000
        });
      }
    } else {
      let deleted = 0;
      for (const id of selectedIds) {
        const result = await onDelete(id);
        if (result) deleted++;
      }
      if (deleted > 0) {
        pushAction({
          type: 'delete_prospects',
          data: toDelete
        });
        toast.success(`Deleted ${deleted} prospects`, {
          action: {
            label: 'UNDO',
            onClick: async () => {
              if (onRestoreProspects) {
                await onRestoreProspects(toDelete);
                toast.success('Restored successfully');
              }
            }
          },
          duration: 5000
        });
      }
    }
    handleExitSelectMode();
    setDeleteConfirmOpen(false);
  };
  const handleDeleteAllInSheet = async (sheetId: string | null) => {
    const toDelete = sheetId === null ? baseProspects : baseProspects.filter(p => p.sheet_id === sheetId);
    if (toDelete.length === 0) {
      toast.info('No prospects to delete');
      return;
    }
    if (onBulkDelete) {
      const result = await onBulkDelete(toDelete.map(p => p.id));
      if (result.deleted > 0) {
        pushAction({
          type: 'delete_prospects',
          data: toDelete
        });
        toast.success(`Deleted ${result.deleted} prospects`);
      }
    } else {
      let deleted = 0;
      for (const p of toDelete) {
        const result = await onDelete(p.id);
        if (result) deleted++;
      }
      if (deleted > 0) {
        pushAction({
          type: 'delete_prospects',
          data: toDelete
        });
        toast.success(`Deleted ${deleted} prospects`);
      }
    }
  };

  // Update with undo support
  const handleUpdateWithUndo = async (id: string, updates: Partial<Prospect>) => {
    const prospect = prospects.find(p => p.id === id);
    if (!prospect) return null;
    const oldData: Partial<Prospect> = {};
    for (const key of Object.keys(updates)) {
      (oldData as any)[key] = (prospect as any)[key];
    }
    const result = await onUpdate(id, updates);
    if (result) {
      pushAction({
        type: 'update_prospect',
        id,
        oldData,
        newData: updates
      });
    }
    return result;
  };

  // Sheet update with undo
  const handleUpdateSheetWithUndo = async (id: string, name: string) => {
    const sheet = sheets.find(s => s.id === id);
    if (!sheet) return null;
    const oldName = sheet.name;
    const result = await onUpdateSheet(id, name);
    if (result) {
      pushAction({
        type: 'rename_sheet',
        id,
        oldName,
        newName: name
      });
    }
    return result;
  };

  // Undo handler
  const handleUndo = async () => {
    const action = popUndo();
    if (!action) return;
    switch (action.type) {
      case 'delete_prospect':
        if (onRestoreProspect) {
          await onRestoreProspect(action.data as Prospect);
        }
        break;
      case 'delete_prospects':
        if (onRestoreProspects) {
          await onRestoreProspects(action.data as Prospect[]);
        }
        break;
      case 'update_prospect':
        await onUpdate(action.id, action.oldData);
        break;
      case 'rename_sheet':
        await onUpdateSheet(action.id, action.oldName);
        break;
    }
  };

  // Redo handler
  const handleRedo = async () => {
    const action = popRedo();
    if (!action) return;
    switch (action.type) {
      case 'delete_prospect':
        await onDelete((action.data as Prospect).id);
        break;
      case 'delete_prospects':
        if (onBulkDelete) {
          await onBulkDelete((action.data as Prospect[]).map(p => p.id));
        }
        break;
      case 'update_prospect':
        await onUpdate(action.id, action.newData);
        break;
      case 'rename_sheet':
        await onUpdateSheet(action.id, action.newName);
        break;
    }
  };
  const isCalling = filterMode === 'calling';
  const COLUMN_ORDER = isCalling ? CALLING_COLUMN_ORDER : FILTER_COLUMN_ORDER;

  // Only show skeleton on initial load when we have no data
  // If we have cached data, show it immediately even while refreshing
  if (loading && prospects.length === 0) {
    return <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="space-y-2">
          {Array.from({
          length: 5
        }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>;
  }
  return <div className="flex flex-col h-full gap-2">
      {/* KPI Strip - horizontal scrolling on mobile */}
      <div className="flex-shrink-0">
        <KPIStrip prospects={filteredProspects} isCalling={isCalling} className="my-0 py-[2px]" />
      </div>

      {/* Single Action Bar - Filters left, Actions right */}
      <div className="flex-shrink-0 flex items-center justify-between gap-2">
        {/* Left side - Filters */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ProspectFilters filters={filters} onFiltersChange={setFilters} onExport={exportToExcel} exporting={exporting} filteredCount={filteredProspects.length} showStagesFilter={!isCalling} showResponsesFilter={isCalling} filterTagButton={!isCalling ? <ChangeFilterTagButton /> : undefined} hideSearch={!!externalSearch} />
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Selection mode controls */}
          {selectionMode.active ? <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1">
              <span className="text-xs font-medium">{selectedIds.size}</span>
              <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)} disabled={selectedIds.size === 0} className="h-7 px-2">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExitSelectMode} className="h-7 w-7 p-0">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div> : <>
              {/* Undo/Redo buttons - desktop only */}
              {!isMobile && <div className="flex items-center">
                  <Button variant="ghost" size="icon" onClick={handleUndo} disabled={!canUndo} className="h-8 w-8">
                    <Undo2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleRedo} disabled={!canRedo} className="h-8 w-8">
                    <Redo2 className="h-4 w-4" />
                  </Button>
                </div>}

              {/* Import & Add buttons - same line */}
              <ImportExcelDialog onImport={handleImportProspects} />
              <AddProspectDialog onAdd={handleAddProspect} existingProspects={prospects} />
            </>}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        {enableDragAndDrop ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleRowDragEnd}>
            <SortableContext items={filteredProspects.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <TableContent isMobile={isMobile} COLUMN_ORDER={COLUMN_ORDER} selectionMode={selectionMode} selectedIds={selectedIds} selectionProspects={selectionProspects} handleSelectAll={handleSelectAll} sheets={sheets} selectedSheetId={selectedSheetId} onSelectSheet={onSelectSheet} onAddSheet={onAddSheet} handleUpdateSheetWithUndo={handleUpdateSheetWithUndo} onDeleteSheet={onDeleteSheet} handleEnterSelectMode={handleEnterSelectMode} handleDeleteAllInSheet={handleDeleteAllInSheet} filteredProspects={filteredProspects} prospects={prospects} sheetFilteredProspects={sheetFilteredProspects} setFilters={setFilters} isCalling={isCalling} expandedRowId={expandedRowId} handleToggleExpand={handleToggleExpand} handleUpdateWithUndo={handleUpdateWithUndo} handleDeleteWithUndo={handleDeleteWithUndo} handleToggleSelect={handleToggleSelect} enableDragAndDrop={enableDragAndDrop} callingTrackingTags={callingTrackingTags} stageTrackingTags={stageTrackingTags} onOpenResponseTagsDialog={() => setResponseTagsDialogOpen(true)} onOpenStageTagsDialog={() => setStageTagsDialogOpen(true)} lastContactedId={lastContactedId} onMarkLastContacted={handleMarkLastContacted} onExportSheet={exportSheet} onExportAll={exportToExcel} />
            </SortableContext>
          </DndContext> : <TableContent isMobile={isMobile} COLUMN_ORDER={COLUMN_ORDER} selectionMode={selectionMode} selectedIds={selectedIds} selectionProspects={selectionProspects} handleSelectAll={handleSelectAll} sheets={sheets} selectedSheetId={selectedSheetId} onSelectSheet={onSelectSheet} onAddSheet={onAddSheet} handleUpdateSheetWithUndo={handleUpdateSheetWithUndo} onDeleteSheet={onDeleteSheet} handleEnterSelectMode={handleEnterSelectMode} handleDeleteAllInSheet={handleDeleteAllInSheet} filteredProspects={filteredProspects} prospects={prospects} sheetFilteredProspects={sheetFilteredProspects} setFilters={setFilters} isCalling={isCalling} expandedRowId={expandedRowId} handleToggleExpand={handleToggleExpand} handleUpdateWithUndo={handleUpdateWithUndo} handleDeleteWithUndo={handleDeleteWithUndo} handleToggleSelect={handleToggleSelect} enableDragAndDrop={enableDragAndDrop} callingTrackingTags={callingTrackingTags} stageTrackingTags={stageTrackingTags} onOpenResponseTagsDialog={() => setResponseTagsDialogOpen(true)} onOpenStageTagsDialog={() => setStageTagsDialogOpen(true)} lastContactedId={lastContactedId} onMarkLastContacted={handleMarkLastContacted} onExportSheet={exportSheet} onExportAll={exportToExcel} />}
      </div>

      {/* Footer info */}
      

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} lead{selectedIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {selectedIds.size} lead{selectedIds.size !== 1 ? 's' : ''} from your list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete {selectedIds.size} lead{selectedIds.size !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tag management dialogs */}
      <ManageResponseTagsDialog open={responseTagsDialogOpen} onOpenChange={setResponseTagsDialogOpen} />
      <ManageStageTagsDialog open={stageTagsDialogOpen} onOpenChange={setStageTagsDialogOpen} />
    </div>;
}