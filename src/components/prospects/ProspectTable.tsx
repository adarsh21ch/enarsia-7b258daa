import { useState, useMemo, useCallback } from 'react';
import { Prospect, FunnelStage, ProspectQuality, Sheet, ExtendedActionTaken } from '@/types/prospect';
import { ProspectRow } from './ProspectRow';
import { MobileProspectCard } from './MobileProspectCard';
import { ProspectFilters } from './ProspectFilters';
import { AddProspectDialog } from './AddProspectDialog';
import { ImportExcelDialog } from './ImportExcelDialog';
import { SheetTabs } from './SheetTabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Users, GripVertical, LayoutGrid, Table2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

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

// Column configuration - wider desktop widths for better visibility
const COLUMNS = [
  { id: 'index', label: '#', defaultWidth: 50, minWidth: 40, mobileWidth: 36, resizable: false },
  { id: 'name', label: 'Name', defaultWidth: 180, minWidth: 140, mobileWidth: 130, resizable: true },
  { id: 'phone', label: 'Phone', defaultWidth: 140, minWidth: 120, mobileWidth: 100, resizable: true },
  { id: 'contact', label: 'Call', defaultWidth: 70, minWidth: 60, mobileWidth: 60, resizable: false },
  { id: 'stage', label: 'Stage', defaultWidth: 130, minWidth: 110, mobileWidth: 85, resizable: true },
  { id: 'action', label: 'Action', defaultWidth: 130, minWidth: 100, mobileWidth: 85, resizable: true },
  { id: 'quality', label: 'Quality', defaultWidth: 100, minWidth: 85, mobileWidth: 75, resizable: true },
  { id: 'actions', label: '', defaultWidth: 80, minWidth: 70, mobileWidth: 50, resizable: false },
];

// Mobile column order
const MOBILE_COLUMN_ORDER = ['index', 'name', 'phone', 'contact', 'stage', 'action', 'quality', 'actions'];

export function ProspectTable({
  prospects,
  loading,
  onAdd,
  onUpdate,
  onDelete,
  onImport,
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

  // Column state for reordering and resizing
  const [columnOrder, setColumnOrder] = useState<string[]>(COLUMNS.map(c => c.id));
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    Object.fromEntries(COLUMNS.map(c => [c.id, c.defaultWidth]))
  );
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);

  // For DUPLICATING: Show prospects in BOTH tabs if they have funnel stages
  // Calling tab: ALL prospects (including those with funnel stages)
  // Funnel tab: Only prospects with funnel stages beyond Enrollment
  const callingProspects = useMemo(() => {
    // Calling tab shows ALL prospects - they stay here even when enrolled
    return prospects;
  }, [prospects]);

  const funnelProspects = useMemo(() => {
    // Funnel tab shows prospects that are enrolled OR have a funnel stage beyond Enrollment
    return prospects.filter(p => 
      p.enrollment_status === 'Enrolled' ||
      (p.funnel_stage && p.funnel_stage !== 'Enrollment')
    );
  }, [prospects]);

  // Get base prospects based on filter mode
  const baseProspects = useMemo(() => {
    const base = filterMode === 'calling' ? callingProspects : funnelProspects;
    
    // Apply sub-filter
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

  // Apply search and other filters
  const filteredProspects = useMemo(() => {
    return sheetFilteredProspects.filter((prospect) => {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = !filters.search ||
        prospect.name.toLowerCase().includes(searchLower) ||
        prospect.phone.toLowerCase().includes(searchLower) ||
        (prospect.notes?.toLowerCase().includes(searchLower));

      // Multi-select stage filter
      const matchesStage = filters.stages.length === 0 || 
        (prospect.funnel_stage && filters.stages.includes(prospect.funnel_stage));
      
      // Multi-select quality filter (uses prospect_status)
      const matchesQuality = filters.qualities.length === 0 || 
        (prospect.prospect_status && filters.qualities.includes(prospect.prospect_status));
      
      // Multi-select action filter
      const matchesAction = filters.actions.length === 0 || 
        filters.actions.includes(prospect.action_taken as ExtendedActionTaken) ||
        (filters.actions.includes('Enrolled') && prospect.enrollment_status === 'Enrolled');

      // Incomplete filter - show only prospects missing stage, status, or action
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
      // Prepare data for Excel
      const exportData = filteredProspects.map((p, i) => ({
        '#': i + 1,
        'Name': p.name || '',
        'Phone Number': p.phone || '',
        'Age': p.age_or_dob || '',
        'Gender': p.gender || '',
        'Address': p.address || '',
        'Enrollment Status': p.enrollment_status || (p.funnel_stage && p.funnel_stage !== 'Enrollment' ? 'Enrolled' : 'Not Enrolled'),
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

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      ws['!cols'] = [
        { wch: 5 },   // #
        { wch: 25 },  // Name
        { wch: 15 },  // Phone
        { wch: 10 },  // Age
        { wch: 10 },  // Gender
        { wch: 30 },  // Address
        { wch: 15 },  // Enrollment Status
        { wch: 12 },  // Funnel Stage
        { wch: 18 },  // Last Action
        { wch: 18 },  // Last Action Date
        { wch: 10 },  // Quality
        { wch: 10 },  // Priority
        { wch: 40 },  // Notes
        { wch: 20 },  // Profession
        { wch: 20 },  // Instagram
        { wch: 12 },  // Date Added
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Prospects');

      // Generate filename
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      const filterLabel = getFilterLabel();
      const filename = `NevorAI_Prospects_${dateStr}_${filterLabel}.xlsx`;

      // Trigger download
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
    // Automatically set sheet_id if a sheet is selected
    if (selectedSheetId) {
      prospect.sheet_id = selectedSheetId;
    }
    return onAdd(prospect);
  };

  const handleImportProspects = async (prospectsData: Partial<Prospect>[]) => {
    // Automatically set sheet_id for imported prospects if a sheet is selected
    if (selectedSheetId) {
      prospectsData = prospectsData.map(p => ({ ...p, sheet_id: selectedSheetId }));
    }
    return onImport(prospectsData);
  };

  const handleToggleExpand = useCallback((prospectId: string) => {
    // Smooth transition - collapse first if different row, then expand new one
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

  const getColumnLabel = (columnId: string) => {
    return COLUMNS.find(c => c.id === columnId)?.label || columnId;
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

  // Sheet tabs component to render at bottom (sticky)
  const renderSheetTabs = () => {
    if (subFilter !== 'all') return null;
    return (
      <div className="fixed bottom-16 left-0 right-0 z-40 bg-background border-t border-border shadow-lg">
        <SheetTabs
          sheets={sheets}
          selectedSheetId={selectedSheetId}
          onSelectSheet={onSelectSheet}
          onAddSheet={onAddSheet}
          onUpdateSheet={onUpdateSheet}
          onDeleteSheet={onDeleteSheet}
        />
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", subFilter === 'all' && "pb-12")}>
      {/* Fixed Sheet Tabs at bottom */}
      {renderSheetTabs()}
      
      {/* Toolbar: Filters + Actions */}
      <div className="bg-card/50 rounded-xl border border-border/50 p-2 sm:p-3 space-y-2 sm:space-y-3">
        <div className="flex flex-col gap-2 sm:gap-3">
          <ProspectFilters 
            filters={filters} 
            onFiltersChange={setFilters} 
            onExport={exportToExcel}
            exporting={exporting}
            filteredCount={filteredProspects.length}
          />
          <div className="flex gap-2 items-center justify-between">
            {/* View Toggle - Available on all screen sizes */}
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
        // Card Layout - Works on all screen sizes
        <div className={cn("grid gap-3", isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3")}>
          {filteredProspects.map((prospect, index) => (
            <MobileProspectCard
              key={prospect.id}
              prospect={prospect}
              index={index + 1}
              isCalling={isCalling}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        // Table Layout (Desktop or Mobile Table View)
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          {/* Mobile scroll hint */}
          {isMobile && (
            <div className="px-3 py-1.5 bg-muted/30 text-[10px] text-muted-foreground text-center border-b border-border">
              ← Swipe to see more columns →
            </div>
          )}
          <div 
            className="overflow-x-auto"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <table 
              className="text-sm border-collapse w-full"
              style={{ minWidth: isMobile ? '580px' : '880px' }}
            >
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b border-border">
                <tr>
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
                        draggable={!isMobile && col.resizable !== false}
                        onDragStart={() => !isMobile && col.resizable !== false && handleDragStart(columnId)}
                        onDragOver={(e) => !isMobile && handleDragOver(e, columnId)}
                        onDragEnd={() => !isMobile && handleDragEnd()}
                        className={cn(
                          "px-2 py-2.5 text-left whitespace-nowrap",
                          isDragging && "opacity-50 bg-primary/10",
                          columnId === 'index' && "text-center",
                          !isMobile && "hover:bg-muted/50 cursor-grab active:cursor-grabbing px-3 py-3 relative select-none group",
                          isMobile && "text-[11px]",
                          // Make name column header sticky on mobile (positioned after index)
                          isMobile && isNameColumn && "sticky left-[36px] z-20 bg-muted/50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]",
                          isMobile && isIndexColumn && "sticky left-0 z-20 bg-muted/50"
                        )}
                        style={{ width: `${width}px`, minWidth: `${width}px` }}
                      >
                        <div className="flex items-center gap-1">
                          {!isMobile && <GripVertical className="h-3 w-3 text-muted-foreground/50" />}
                          <span>{col?.label || columnId}</span>
                        </div>
                        {/* Resize handle - only for resizable columns on desktop */}
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
              <tbody>
                {filteredProspects.map((prospect, index) => (
                  <ProspectRow
                    key={prospect.id}
                    prospect={prospect}
                    index={index + 1}
                    isCalling={isCalling}
                    isExpanded={expandedRowId === prospect.id}
                    onToggleExpand={() => handleToggleExpand(prospect.id)}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    isEven={index % 2 === 0}
                    columnOrder={isMobile ? MOBILE_COLUMN_ORDER : columnOrder}
                    columnWidths={isMobile ? Object.fromEntries(COLUMNS.map(c => [c.id, c.mobileWidth])) : columnWidths}
                    isMobileTable={isMobile}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
            <span>Showing {filteredProspects.length} of {baseProspects.length} prospects</span>
          </div>
        </div>
      )}
    </div>
  );
}
