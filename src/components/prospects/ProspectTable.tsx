import { useState, useMemo, useCallback, useEffect } from 'react';
import { Prospect, FunnelStage, ProspectQuality, Sheet, ExtendedActionTaken } from '@/types/prospect';
import { SortableProspectRow } from './SortableProspectRow';
import { MobileProspectCard } from './MobileProspectCard';
import { ProspectFilters } from './ProspectFilters';
import { AddProspectDialog } from './AddProspectDialog';
import { ImportExcelDialog } from './ImportExcelDialog';
import { SheetTabs } from './SheetTabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, GripVertical, LayoutGrid, Table2, Undo2, Redo2, X, Trash2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { useUndoRedo, UndoAction } from '@/hooks/useUndoRedo';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

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
  onImport: (prospects: Partial<Prospect>[]) => Promise<{ imported: number; skipped: number }>;
  onReorderProspects?: (prospectIds: string[]) => Promise<boolean>;
  onRestoreProspect?: (prospect: Prospect) => Promise<Prospect | null>;
  onRestoreProspects?: (prospects: Prospect[]) => Promise<number>;
  onBulkDelete?: (ids: string[]) => Promise<{ deleted: number; prospects: Prospect[] }>;
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

// Column configuration - Response before Funnel
const COLUMNS = [
  { id: 'index', label: '#', defaultWidth: 50, minWidth: 40, mobileWidth: 36, resizable: false },
  { id: 'name', label: 'Name', defaultWidth: 180, minWidth: 140, mobileWidth: 130, resizable: true },
  { id: 'phone', label: 'Phone', defaultWidth: 140, minWidth: 120, mobileWidth: 100, resizable: true },
  { id: 'contact', label: 'Call', defaultWidth: 70, minWidth: 60, mobileWidth: 60, resizable: false },
  { id: 'action', label: 'Response', defaultWidth: 130, minWidth: 100, mobileWidth: 85, resizable: true },
  { id: 'stage', label: 'Funnel', defaultWidth: 130, minWidth: 110, mobileWidth: 85, resizable: true },
  { id: 'quality', label: 'Quality', defaultWidth: 100, minWidth: 85, mobileWidth: 75, resizable: true },
  { id: 'actions', label: '', defaultWidth: 80, minWidth: 70, mobileWidth: 50, resizable: false },
];

// Mobile column order - Response before Funnel
const MOBILE_COLUMN_ORDER = ['index', 'name', 'phone', 'contact', 'action', 'stage', 'quality', 'actions'];

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
  subFilter,
}: ProspectTableProps) {
  const [filters, setFilters] = useState<Filters>({
    search: '',
    stages: [],
    qualities: [],
    actions: [],
    incompleteOnly: false,
  });
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [exporting, setExporting] = useState(false);
  const isMobile = useIsMobile();

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState<{ active: boolean; sheetId: string | null }>({ active: false, sheetId: null });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Undo/Redo
  const { pushAction, popUndo, popRedo, canUndo, canRedo } = useUndoRedo();

  // Column state for reordering and resizing - load from localStorage
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('prospectColumnOrder');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate that all columns exist
        if (Array.isArray(parsed) && parsed.every(id => COLUMNS.some(c => c.id === id))) {
          return parsed;
        }
      } catch {}
    }
    return COLUMNS.map(c => c.id);
  });
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    Object.fromEntries(COLUMNS.map(c => [c.id, c.defaultWidth]))
  );
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);

  // Save column order to localStorage
  useEffect(() => {
    localStorage.setItem('prospectColumnOrder', JSON.stringify(columnOrder));
  }, [columnOrder]);

  // Row drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleRowDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && onReorderProspects) {
      const oldIndex = filteredProspects.findIndex(p => p.id === active.id);
      const newIndex = filteredProspects.findIndex(p => p.id === over.id);
      const newOrder = arrayMove(filteredProspects, oldIndex, newIndex);
      onReorderProspects(newOrder.map(p => p.id));
    }
  };

  // For DUPLICATING: Show prospects in BOTH tabs if they have funnel stages
  const callingProspects = useMemo(() => {
    return prospects;
  }, [prospects]);

  const funnelProspects = useMemo(() => {
    return prospects.filter(p => 
      p.enrollment_status === 'Enrolled' || p.funnel_stage
    );
  }, [prospects]);

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
          return base.filter(p => 
            p.funnel_stage && ['Day 2', 'Day 3', 'Minimum Bill'].includes(p.funnel_stage)
          );
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
    return sheetFilteredProspects.filter((prospect) => {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = !filters.search ||
        prospect.name.toLowerCase().includes(searchLower) ||
        prospect.phone.toLowerCase().includes(searchLower) ||
        (prospect.notes?.toLowerCase().includes(searchLower));

      const matchesStage = filters.stages.length === 0 || 
        (prospect.funnel_stage && filters.stages.includes(prospect.funnel_stage));
      
      const matchesQuality = filters.qualities.length === 0 || 
        (prospect.prospect_status && filters.qualities.includes(prospect.prospect_status));
      
      const matchesAction = filters.actions.length === 0 || 
        filters.actions.includes(prospect.action_taken as ExtendedActionTaken) ||
        (filters.actions.includes('Enrollment') && prospect.enrollment_status === 'Enrolled');

      const matchesIncomplete = !filters.incompleteOnly || 
        !prospect.funnel_stage || 
        !prospect.prospect_status || 
        !prospect.action_taken;

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
        'Date Added': p.date_added ? format(new Date(p.date_added), 'dd/MM/yyyy') : '',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      ws['!cols'] = [
        { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 },
        { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 18 },
        { wch: 10 }, { wch: 10 }, { wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 12 },
      ];

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
      prospectsData = prospectsData.map(p => ({ ...p, sheet_id: selectedSheetId }));
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

  // Column drag handlers
  const handleDragStart = (columnId: string) => {
    setDraggedColumn(columnId);
  };

  const handleDragOver = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumnId) return;
    
    const newOrder = [...columnOrder];
    const draggedIdx = newOrder.indexOf(draggedColumn);
    const targetIdx = newOrder.indexOf(targetColumnId);
    
    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedColumn);
    setColumnOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  // Column resize handlers
  const handleResizeStart = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    setResizingColumn(columnId);
    
    const startX = e.clientX;
    const startWidth = columnWidths[columnId];
    const column = COLUMNS.find(c => c.id === columnId);
    const minWidth = column?.minWidth || 60;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(minWidth, startWidth + delta);
      setColumnWidths(prev => ({ ...prev, [columnId]: newWidth }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Selection mode handlers
  const handleEnterSelectMode = (sheetId: string | null) => {
    setSelectionMode({ active: true, sheetId });
    setSelectedIds(new Set());
    onSelectSheet(sheetId); // Switch to that sheet view
  };

  const handleExitSelectMode = () => {
    setSelectionMode({ active: false, sheetId: null });
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
      pushAction({ type: 'delete_prospect', data: prospect });
    }
    return result;
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    const toDelete = prospects.filter(p => selectedIds.has(p.id));
    
    if (onBulkDelete) {
      const result = await onBulkDelete(Array.from(selectedIds));
      if (result.deleted > 0) {
        pushAction({ type: 'delete_prospects', data: toDelete });
        toast.success(`Deleted ${result.deleted} prospects`);
      }
    } else {
      // Fallback to individual deletes
      let deleted = 0;
      for (const id of selectedIds) {
        const result = await onDelete(id);
        if (result) deleted++;
      }
      if (deleted > 0) {
        pushAction({ type: 'delete_prospects', data: toDelete });
        toast.success(`Deleted ${deleted} prospects`);
      }
    }
    
    handleExitSelectMode();
    setDeleteConfirmOpen(false);
  };

  const handleDeleteAllInSheet = async (sheetId: string | null) => {
    const toDelete = sheetId === null 
      ? baseProspects 
      : baseProspects.filter(p => p.sheet_id === sheetId);
    
    if (toDelete.length === 0) {
      toast.info('No prospects to delete');
      return;
    }

    if (onBulkDelete) {
      const result = await onBulkDelete(toDelete.map(p => p.id));
      if (result.deleted > 0) {
        pushAction({ type: 'delete_prospects', data: toDelete });
        toast.success(`Deleted ${result.deleted} prospects`);
      }
    } else {
      let deleted = 0;
      for (const p of toDelete) {
        const result = await onDelete(p.id);
        if (result) deleted++;
      }
      if (deleted > 0) {
        pushAction({ type: 'delete_prospects', data: toDelete });
        toast.success(`Deleted ${deleted} prospects`);
      }
    }
  };

  // Update with undo support
  const handleUpdateWithUndo = async (id: string, updates: Partial<Prospect>) => {
    const prospect = prospects.find(p => p.id === id);
    if (!prospect) return null;

    // Capture old values for the fields being updated
    const oldData: Partial<Prospect> = {};
    for (const key of Object.keys(updates)) {
      (oldData as any)[key] = (prospect as any)[key];
    }

    const result = await onUpdate(id, updates);
    if (result) {
      pushAction({ type: 'update_prospect', id, oldData, newData: updates });
    }
    return result;
  };

  // Sheet rename with undo support
  const handleUpdateSheetWithUndo = async (id: string, name: string) => {
    const sheet = sheets.find(s => s.id === id);
    if (!sheet) return null;

    const oldName = sheet.name;
    const result = await onUpdateSheet(id, name);
    if (result) {
      pushAction({ type: 'rename_sheet', id, oldName, newName: name });
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
          await onRestoreProspect(action.data);
          toast.success('Prospect restored');
        }
        break;
      case 'delete_prospects':
        if (onRestoreProspects) {
          const count = await onRestoreProspects(action.data);
          toast.success(`Restored ${count} prospects`);
        }
        break;
      case 'update_prospect':
        await onUpdate(action.id, action.oldData);
        toast.success('Change undone');
        break;
      case 'rename_sheet':
        await onUpdateSheet(action.id, action.oldName);
        toast.success('Sheet rename undone');
        break;
    }
  };

  // Redo handler
  const handleRedo = async () => {
    const action = popRedo();
    if (!action) return;

    switch (action.type) {
      case 'delete_prospect':
        await onDelete(action.data.id);
        toast.success('Prospect deleted again');
        break;
      case 'delete_prospects':
        for (const p of action.data) {
          await onDelete(p.id);
        }
        toast.success(`Deleted ${action.data.length} prospects again`);
        break;
      case 'update_prospect':
        await onUpdate(action.id, action.newData);
        toast.success('Change redone');
        break;
      case 'rename_sheet':
        await onUpdateSheet(action.id, action.newName);
        toast.success('Sheet renamed again');
        break;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b border-border last:border-0">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isCalling = filterMode === 'calling';

  // Sheet tabs component to render inline above table header
  const renderSheetTabs = () => {
    if (subFilter !== 'all') return null;
    return (
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
    );
  };

  return (
    <div className="space-y-4">
      
      {/* Toolbar: Filters + Actions */}
      <div className="bg-card/50 rounded-xl border border-border/50 p-2 sm:p-3 space-y-2 sm:space-y-3">
        <div className="flex flex-col gap-2 sm:gap-3">
          <div className="flex items-center justify-between">
            <ProspectFilters 
              filters={filters} 
              onFiltersChange={setFilters} 
              onExport={exportToExcel}
              exporting={exporting}
              filteredCount={filteredProspects.length}
            />
            {/* Undo/Redo buttons - compact icons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleUndo}
                disabled={!canUndo}
                title="Undo"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRedo}
                disabled={!canRedo}
                title="Redo"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2 items-center justify-between">
            {/* View Toggle */}
            <div className="flex items-center bg-muted rounded-lg p-0.5">
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-2.5 gap-1.5"
                onClick={() => setViewMode('table')}
              >
                <Table2 className="h-4 w-4" />
                <span className="text-xs hidden sm:inline">Table</span>
              </Button>
              <Button
                variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-2.5 gap-1.5"
                onClick={() => setViewMode('card')}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="text-xs hidden sm:inline">Cards</span>
              </Button>
            </div>
            <div className="flex gap-2">
              <ImportExcelDialog onImport={handleImportProspects} />
              <AddProspectDialog onAdd={handleAddProspect} />
            </div>
          </div>
        </div>
      </div>

      {/* Selection Mode Bar */}
      {selectionMode.active && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExitSelectMode}
              className="h-8 px-2"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="h-8 text-xs"
            >
              {selectedIds.size === selectionProspects.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={selectedIds.size === 0}
            className="h-8"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete Selected
          </Button>
        </div>
      )}

      {/* Content */}
      {prospects.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No prospects yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Click "+ Add Prospect" or "Import Excel" to get started
          </p>
          <div className="flex justify-center gap-2">
            <ImportExcelDialog onImport={handleImportProspects} />
            <AddProspectDialog onAdd={handleAddProspect} />
          </div>
        </div>
      ) : filteredProspects.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No prospects match your filters.{' '}
            <button
              onClick={() => setFilters({ search: '', stages: [], qualities: [], actions: [], incompleteOnly: false })}
              className="text-accent hover:underline"
            >
              Clear filters
            </button>
          </p>
        </div>
      ) : viewMode === 'card' ? (
        // Card Layout
        <div className={cn("grid gap-3", isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3")}>
          {filteredProspects.map((prospect, index) => (
            <div key={prospect.id} className="relative">
              {selectionMode.active && selectionProspects.some(p => p.id === prospect.id) && (
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={selectedIds.has(prospect.id)}
                    onCheckedChange={() => handleToggleSelect(prospect.id)}
                  />
                </div>
              )}
              <MobileProspectCard
                prospect={prospect}
                index={index + 1}
                isCalling={isCalling}
                onUpdate={handleUpdateWithUndo}
                onDelete={handleDeleteWithUndo}
              />
            </div>
          ))}
        </div>
      ) : (
        // Table Layout
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          {/* Sticky container for SheetTabs and Table Header */}
          <div className="sticky top-0 z-30 bg-card">
            {/* Sheet tabs - replaces the "Swipe to see more columns" hint */}
            {renderSheetTabs()}
          </div>
          <div 
            className="overflow-x-auto"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <table 
              className="text-sm border-collapse w-full"
              style={{ minWidth: isMobile ? '580px' : '880px' }}
            >
              <thead className="sticky top-[37px] z-20 bg-muted/95 backdrop-blur-sm text-xs font-semibold text-muted-foreground border-b border-border">
                <tr>
                  {/* Selection checkbox header */}
                  {selectionMode.active && (
                    <th className="px-2 py-2.5 w-10 min-w-10">
                      <Checkbox
                        checked={selectedIds.size === selectionProspects.length && selectionProspects.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                  )}
                  {/* Drag handle header */}
                  <th className="px-1 py-2.5 w-8 min-w-8"></th>
                  {(isMobile ? MOBILE_COLUMN_ORDER : columnOrder).map((columnId) => {
                    const col = COLUMNS.find(c => c.id === columnId);
                    if (!col) return null;
                    const width = isMobile ? col.mobileWidth : columnWidths[columnId];
                    const isDragging = draggedColumn === columnId;
                    const isResizing = resizingColumn === columnId;
                    const isNameColumn = columnId === 'name';
                    const isIndexColumn = columnId === 'index';
                    
                    return (
                      <th
                        key={columnId}
                        draggable={col.resizable !== false}
                        onDragStart={() => col.resizable !== false && handleDragStart(columnId)}
                        onDragOver={(e) => handleDragOver(e, columnId)}
                        onDragEnd={() => handleDragEnd()}
                        onTouchStart={() => col.resizable !== false && handleDragStart(columnId)}
                        onTouchEnd={() => handleDragEnd()}
                        className={cn(
                          "px-2 py-2.5 text-left whitespace-nowrap",
                          isDragging && "opacity-50 bg-primary/10",
                          columnId === 'index' && "text-center",
                          "hover:bg-muted/50 cursor-grab active:cursor-grabbing px-3 py-3 relative select-none group",
                          isMobile && "text-[11px]",
                          isMobile && isNameColumn && "sticky left-[68px] z-20 bg-muted/50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]",
                          isMobile && isIndexColumn && "sticky left-[32px] z-20 bg-muted/50"
                        )}
                        style={{ width: `${width}px`, minWidth: `${width}px` }}
                      >
                        <div className="flex items-center gap-1">
                          <GripVertical className="h-3 w-3 text-muted-foreground/50" />
                          <span>{col?.label || columnId}</span>
                        </div>
                        {!isMobile && col.resizable && (
                          <div
                            className={cn(
                              "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-primary/50 transition-all",
                              isResizing && "bg-primary opacity-100"
                            )}
                            onMouseDown={(e) => handleResizeStart(e, columnId)}
                          />
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleRowDragEnd}
              >
                <SortableContext
                  items={filteredProspects.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
                    {filteredProspects.map((prospect, index) => (
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
                        columnOrder={isMobile ? MOBILE_COLUMN_ORDER : columnOrder}
                        columnWidths={isMobile ? Object.fromEntries(COLUMNS.map(c => [c.id, c.mobileWidth])) : columnWidths}
                        isMobileTable={isMobile}
                        showSelection={selectionMode.active && selectionProspects.some(p => p.id === prospect.id)}
                        isSelected={selectedIds.has(prospect.id)}
                        onToggleSelect={() => handleToggleSelect(prospect.id)}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </DndContext>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
            <span>Showing {filteredProspects.length} of {baseProspects.length} prospects</span>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} selected prospects?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the selected prospects. You can undo this action using the Undo button.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
