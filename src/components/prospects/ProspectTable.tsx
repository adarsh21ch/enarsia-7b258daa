import { useState, useMemo, useCallback, useEffect } from 'react';
import { Prospect, FunnelStage, ProspectQuality, Sheet, ExtendedActionTaken, FUNNEL_STAGES, EXTENDED_ACTIONS } from '@/types/prospect';
import { SortableProspectRow } from './SortableProspectRow';
import { MobileProspectCard } from './MobileProspectCard';
import { ProspectFilters } from './ProspectFilters';
import { AddProspectDialog } from './AddProspectDialog';
import { ImportExcelDialog } from './ImportExcelDialog';
import { SheetTabs } from './SheetTabs';
import { ColumnOptionsSheet } from './ColumnOptionsSheet';
import { ChangeFilterTagButton } from './ChangeFilterTagButton';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, LayoutGrid, Table2, Undo2, Redo2, X, Trash2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { useUndoRedo, UndoAction } from '@/hooks/useUndoRedo';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useCustomOptionsContext } from '@/contexts/CustomOptionsContext';

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
  onImport: (prospects: Partial<Prospect>[]) => Promise<{
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
  // Filter mode from parent
  filterMode: 'calling' | 'funnel';
  subFilter: 'all' | 'hot' | 'scheduled' | 'day1' | 'progress';
}

// Simplified column configuration - only 3 columns, no horizontal scroll needed
const COLUMNS = [{
  id: 'index',
  label: '#',
  width: '10%',
  minWidth: 40,
}, {
  id: 'name',
  label: 'Name',
  width: '55%',
  minWidth: 160,
}, {
  id: 'action',
  label: 'Response',
  width: '35%',
  minWidth: 100,
}, {
  id: 'stage',
  label: 'Funnel',
  width: '35%',
  minWidth: 100,
}];

// Column order for Calling tab: #, Name, Response
const CALLING_COLUMN_ORDER = ['index', 'name', 'action'];
// Column order for Filter tab: #, Name, Funnel
const FILTER_COLUMN_ORDER = ['index', 'name', 'stage'];

// TableContent component
interface TableContentProps {
  isMobile: boolean;
  COLUMN_ORDER: string[];
  selectionMode: { active: boolean; sheetId: string | null };
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
}: TableContentProps) {
  return (
    <div className="relative">
      {/* Sheet tabs row */}
      <div className="bg-card border-b border-border/50">
        <SheetTabs 
          sheets={sheets} 
          selectedSheetId={selectedSheetId} 
          onSelectSheet={onSelectSheet} 
          onAddSheet={onAddSheet} 
          onUpdateSheet={handleUpdateSheetWithUndo} 
          onDeleteSheet={onDeleteSheet} 
          onEnterSelectMode={handleEnterSelectMode} 
          onDeleteAllInSheet={handleDeleteAllInSheet} 
        />
      </div>
      
      {/* Table - no horizontal scroll, fits viewport */}
      <table className="w-full text-sm border-collapse bg-card table-fixed">
        {/* Header row */}
        <thead>
          <tr className="bg-muted text-xs font-semibold text-muted-foreground border-b border-border">
            {/* Selection checkbox header */}
            {selectionMode.active && (
              <th className="w-10 px-2 py-2.5 bg-muted">
                <Checkbox 
                  checked={selectedIds.size === selectionProspects.length && selectionProspects.length > 0} 
                  onCheckedChange={handleSelectAll} 
                />
              </th>
            )}
            {COLUMN_ORDER.map(columnId => {
              const col = COLUMNS.find(c => c.id === columnId);
              if (!col) return null;
              
              return (
                <th 
                  key={columnId}
                  className={cn(
                    "px-2 py-2.5 text-left whitespace-nowrap bg-muted select-none",
                    columnId === 'index' && "text-center",
                    isMobile && "text-[11px] px-1.5"
                  )}
                  style={{ 
                    width: col.width, 
                    minWidth: `${col.minWidth}px`,
                  }}
                >
                  <div className="flex items-center gap-0.5">
                    <span>{col.label}</span>
                    {columnId === 'action' && <ColumnOptionsSheet columnType="action_taken" columnLabel="Response" defaultOptions={EXTENDED_ACTIONS} />}
                    {columnId === 'stage' && <ColumnOptionsSheet columnType="funnel_stage" columnLabel="Funnel" defaultOptions={FUNNEL_STAGES} />}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        {/* Table body */}
        <tbody>
          {filteredProspects.length === 0 ? (
            <tr>
              <td colSpan={COLUMN_ORDER.length + (selectionMode.active ? 1 : 0)} className="py-12 text-center bg-card">
                <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {prospects.length === 0 ? "No prospects yet" : selectedSheetId ? "No prospects in this sheet" : "No prospects match your filters"}
                </p>
                <p className="text-xs text-muted-foreground/70 mb-3">
                  {prospects.length === 0 || (selectedSheetId && sheetFilteredProspects.length === 0) ? (
                    "Import Excel or Add Prospect to get started"
                  ) : (
                    <button 
                      onClick={() => setFilters({
                        search: '',
                        stages: [],
                        qualities: [],
                        actions: [],
                        incompleteOnly: false
                      })} 
                      className="text-accent hover:underline"
                    >
                      Clear filters
                    </button>
                  )}
                </p>
              </td>
            </tr>
          ) : (
            filteredProspects.map((prospect, index) => (
              <SortableProspectRow 
                key={prospect.id} 
                prospect={prospect} 
                index={index + 1} 
                isCalling={isCalling} 
                isExpanded={expandedRowId === prospect.id} 
                onToggleExpand={() => handleToggleExpand(prospect.id)} 
                onUpdate={handleUpdateWithUndo} 
                onDelete={handleDeleteWithUndo} 
                isEven={index % 2 === 0} 
                columnOrder={COLUMN_ORDER} 
                isMobileTable={isMobile}
                selectionModeActive={selectionMode.active}
                showSelection={selectionMode.active && selectionProspects.some(p => p.id === prospect.id)} 
                isSelected={selectedIds.has(prospect.id)} 
                onToggleSelect={() => handleToggleSelect(prospect.id)}
                disableDrag={!enableDragAndDrop}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
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
  filterMode,
  subFilter
}: ProspectTableProps) {
  const [filters, setFilters] = useState<Filters>({
    search: '',
    stages: [],
    qualities: [],
    actions: [],
    incompleteOnly: false
  });
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

  // Undo/Redo
  const {
    pushAction,
    popUndo,
    popRedo,
    canUndo,
    canRedo
  } = useUndoRedo();

  // Row drag-and-drop sensors - DISABLED on mobile for smooth scrolling
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );
  
  // Disable drag-and-drop on mobile to prevent scroll interference
  const enableDragAndDrop = !isMobile && !!onReorderProspects;
  
  const handleRowDragEnd = (event: DragEndEvent) => {
    if (!enableDragAndDrop) return;
    const { active, over } = event;
    if (over && active.id !== over.id && onReorderProspects) {
      const oldIndex = filteredProspects.findIndex(p => p.id === active.id);
      const newIndex = filteredProspects.findIndex(p => p.id === over.id);
      const newOrder = arrayMove(filteredProspects, oldIndex, newIndex);
      onReorderProspects(newOrder.map(p => p.id));
    }
  };

  // Get the single active filter tag from custom options
  const { getActiveFilterTag } = useCustomOptionsContext();
  const activeFilterTag = useMemo(() => getActiveFilterTag(), [getActiveFilterTag]);

  // For DUPLICATING: Show prospects in BOTH tabs if they have the active filter tag
  const callingProspects = useMemo(() => {
    return prospects;
  }, [prospects]);
  
  // Filter prospects: show only those whose action_taken matches the single active filter tag
  const funnelProspects = useMemo(() => {
    if (!activeFilterTag) {
      // No filter tag set - show empty or fallback to old behavior
      return prospects.filter(p => p.enrollment_status === 'Enrolled' || p.funnel_stage);
    }
    // New behavior: show only prospects with the single active filter tag
    return prospects.filter(p => p.action_taken === activeFilterTag);
  }, [prospects, activeFilterTag]);

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
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = !filters.search || prospect.name.toLowerCase().includes(searchLower) || prospect.phone.toLowerCase().includes(searchLower) || prospect.notes?.toLowerCase().includes(searchLower);
      const matchesStage = filters.stages.length === 0 || prospect.funnel_stage && filters.stages.includes(prospect.funnel_stage);
      const matchesQuality = filters.qualities.length === 0 || prospect.prospect_status && filters.qualities.includes(prospect.prospect_status);
      const matchesAction = filters.actions.length === 0 || filters.actions.includes(prospect.action_taken as ExtendedActionTaken) || filters.actions.includes('Enrollment') && prospect.enrollment_status === 'Enrolled';
      const matchesIncomplete = !filters.incompleteOnly || !prospect.funnel_stage || !prospect.prospect_status || !prospect.action_taken;
      return matchesSearch && matchesStage && matchesQuality && matchesAction && matchesIncomplete;
    });
  }, [sheetFilteredProspects, filters]);

  const getFilterLabel = (): string => {
    if (filters.stages.length > 0) return filters.stages.join('_').replace(/\s+/g, '');
    if (filters.actions.length > 0) return filters.actions.join('_').replace(/\s+/g, '');
    if (filters.qualities.length > 0) return filters.qualities.join('_');
    if (filters.incompleteOnly) return 'Incomplete';
    return filterMode === 'calling' ? 'Calling' : 'Funnel';
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

  const handleAddProspect = async (prospect: Partial<Prospect>) => {
    if (selectedSheetId) {
      prospect.sheet_id = selectedSheetId;
    }
    return onAdd(prospect);
  };

  const handleImportProspects = async (prospectsData: Partial<Prospect>[]) => {
    if (selectedSheetId) {
      prospectsData = prospectsData.map(p => ({
        ...p,
        sheet_id: selectedSheetId
      }));
    }
    return onImport(prospectsData);
  };

  const handleToggleExpand = useCallback((prospectId: string) => {
    if (expandedRowId && expandedRowId !== prospectId) {
      setExpandedRowId(null);
      setTimeout(() => setExpandedRowId(prospectId), 50);
    } else {
      setExpandedRowId(prev => prev === prospectId ? null : prospectId);
    }
  }, [expandedRowId]);

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

  // Delete with undo support
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
    }
    return result;
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const toDelete = prospects.filter(p => selectedIds.has(p.id));
    if (onBulkDelete) {
      const result = await onBulkDelete(Array.from(selectedIds));
      if (result.deleted > 0) {
        pushAction({
          type: 'delete_prospects',
          data: toDelete
        });
        toast.success(`Deleted ${result.deleted} prospects`);
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
        toast.success(`Deleted ${deleted} prospects`);
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

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Undo/Redo buttons */}
          <div className="flex items-center gap-1 mr-2">
            <Button variant="ghost" size="icon" onClick={handleUndo} disabled={!canUndo} className="h-8 w-8">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleRedo} disabled={!canRedo} className="h-8 w-8">
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Filter tag button for funnel mode */}
          {!isCalling && <ChangeFilterTagButton />}
        </div>

        <div className="flex items-center gap-2">
          {/* Selection mode controls */}
          {selectionMode.active && (
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)} disabled={selectedIds.size === 0}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExitSelectMode}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Action buttons - only show in calling mode */}
          {isCalling && !selectionMode.active && (
            <>
              <ImportExcelDialog onImport={handleImportProspects} />
              <AddProspectDialog onAdd={handleAddProspect} />
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <ProspectFilters
        filters={filters}
        onFiltersChange={setFilters}
        onExport={exportToExcel}
        exporting={exporting}
        filteredCount={filteredProspects.length}
      />

      {/* Table */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm">
        {enableDragAndDrop ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleRowDragEnd}>
            <SortableContext items={filteredProspects.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <TableContent
                isMobile={isMobile}
                COLUMN_ORDER={COLUMN_ORDER}
                selectionMode={selectionMode}
                selectedIds={selectedIds}
                selectionProspects={selectionProspects}
                handleSelectAll={handleSelectAll}
                sheets={sheets}
                selectedSheetId={selectedSheetId}
                onSelectSheet={onSelectSheet}
                onAddSheet={onAddSheet}
                handleUpdateSheetWithUndo={handleUpdateSheetWithUndo}
                onDeleteSheet={onDeleteSheet}
                handleEnterSelectMode={handleEnterSelectMode}
                handleDeleteAllInSheet={handleDeleteAllInSheet}
                filteredProspects={filteredProspects}
                prospects={prospects}
                sheetFilteredProspects={sheetFilteredProspects}
                setFilters={setFilters}
                isCalling={isCalling}
                expandedRowId={expandedRowId}
                handleToggleExpand={handleToggleExpand}
                handleUpdateWithUndo={handleUpdateWithUndo}
                handleDeleteWithUndo={handleDeleteWithUndo}
                handleToggleSelect={handleToggleSelect}
                enableDragAndDrop={enableDragAndDrop}
              />
            </SortableContext>
          </DndContext>
        ) : (
          <TableContent
            isMobile={isMobile}
            COLUMN_ORDER={COLUMN_ORDER}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            selectionProspects={selectionProspects}
            handleSelectAll={handleSelectAll}
            sheets={sheets}
            selectedSheetId={selectedSheetId}
            onSelectSheet={onSelectSheet}
            onAddSheet={onAddSheet}
            handleUpdateSheetWithUndo={handleUpdateSheetWithUndo}
            onDeleteSheet={onDeleteSheet}
            handleEnterSelectMode={handleEnterSelectMode}
            handleDeleteAllInSheet={handleDeleteAllInSheet}
            filteredProspects={filteredProspects}
            prospects={prospects}
            sheetFilteredProspects={sheetFilteredProspects}
            setFilters={setFilters}
            isCalling={isCalling}
            expandedRowId={expandedRowId}
            handleToggleExpand={handleToggleExpand}
            handleUpdateWithUndo={handleUpdateWithUndo}
            handleDeleteWithUndo={handleDeleteWithUndo}
            handleToggleSelect={handleToggleSelect}
            enableDragAndDrop={enableDragAndDrop}
          />
        )}
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>{filteredProspects.length} prospects</span>
        <Button variant="ghost" size="sm" onClick={exportToExcel} disabled={exporting || filteredProspects.length === 0} className="h-7 text-xs">
          {exporting ? 'Exporting...' : 'Export Excel'}
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} prospects?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {selectedIds.size} prospect{selectedIds.size !== 1 ? 's' : ''} from your list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete {selectedIds.size} prospect{selectedIds.size !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}