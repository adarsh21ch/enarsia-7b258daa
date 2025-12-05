import { useState, useMemo, useCallback } from 'react';
import { Prospect, FunnelStage, ProspectStatus, PriorityLevel, Sheet } from '@/types/prospect';
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

interface Filters {
  search: string;
  stage: FunnelStage | 'all';
  status: ProspectStatus | 'all';
  priority: PriorityLevel | 'all';
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

// Column configuration - desktop widths
const COLUMNS = [
  { id: 'index', label: '#', defaultWidth: 50, minWidth: 40, mobileWidth: 32, showOnMobile: true },
  { id: 'name', label: 'Name', defaultWidth: 180, minWidth: 120, mobileWidth: 100, showOnMobile: true },
  { id: 'phone', label: 'Phone', defaultWidth: 160, minWidth: 120, mobileWidth: 90, showOnMobile: true },
  { id: 'contact', label: 'Call', defaultWidth: 70, minWidth: 60, mobileWidth: 60, showOnMobile: true },
  { id: 'stage', label: 'Stage', defaultWidth: 120, minWidth: 100, mobileWidth: 80, showOnMobile: true },
  { id: 'action', label: 'Action', defaultWidth: 140, minWidth: 100, mobileWidth: 80, showOnMobile: false },
  { id: 'status', label: 'Status', defaultWidth: 100, minWidth: 80, mobileWidth: 70, showOnMobile: false },
  { id: 'priority', label: 'Priority', defaultWidth: 100, minWidth: 80, mobileWidth: 70, showOnMobile: true },
  { id: 'lastContact', label: 'Date', defaultWidth: 110, minWidth: 90, mobileWidth: 70, showOnMobile: true },
  { id: 'actions', label: '', defaultWidth: 90, minWidth: 80, mobileWidth: 50, showOnMobile: true },
];

// Mobile column order: #, Name, Phone, Call/WhatsApp, Stage, Priority, Date, Actions
const MOBILE_COLUMN_ORDER = ['index', 'name', 'phone', 'contact', 'stage', 'priority', 'lastContact', 'actions'];

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
    stage: 'all',
    status: 'all',
    priority: 'all',
  });
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [mobileViewMode, setMobileViewMode] = useState<'card' | 'table'>('table');
  const isMobile = useIsMobile();

  // Column state for reordering and resizing
  const [columnOrder, setColumnOrder] = useState<string[]>(COLUMNS.map(c => c.id));
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    Object.fromEntries(COLUMNS.map(c => [c.id, c.defaultWidth]))
  );
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);

  // Separate prospects into Calling vs Funnel
  const callingProspects = useMemo(() => {
    return prospects.filter(p => 
      (!p.enrollment_status || p.enrollment_status === 'Not Enrolled') &&
      (!p.funnel_stage || p.funnel_stage === 'Enrollment')
    );
  }, [prospects]);

  const funnelProspects = useMemo(() => {
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
          return base.filter(p => p.priority === 'High' || p.prospect_status === '+VE');
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

      const matchesStage = filters.stage === 'all' || prospect.funnel_stage === filters.stage;
      const matchesStatus = filters.status === 'all' || prospect.prospect_status === filters.status;
      const matchesPriority = filters.priority === 'all' || prospect.priority === filters.priority;

      return matchesSearch && matchesStage && matchesStatus && matchesPriority;
    });
  }, [sheetFilteredProspects, filters]);

  const exportToCSV = () => {
    const headers = ['#', 'Name', 'Phone', 'Email', 'Funnel Stage', 'Enrollment', 'Action Taken', 'Status', 'Priority', 'Notes', 'Last Contact Date', 'Date Added'];
    const csvContent = [
      headers.join(','),
      ...filteredProspects.map((p, i) => [
        i + 1,
        `"${p.name}"`,
        `"${p.phone}"`,
        `"${p.email || ''}"`,
        `"${p.funnel_stage}"`,
        `"${p.enrollment_status || 'Not Enrolled'}"`,
        `"${p.action_taken || ''}"`,
        `"${p.prospect_status || ''}"`,
        `"${p.priority}"`,
        `"${(p.notes || '').replace(/"/g, '""')}"`,
        `"${p.last_contact_date || ''}"`,
        `"${p.date_added}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `prospects_${filterMode}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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
    setExpandedRowId(prev => prev === prospectId ? null : prospectId);
  }, []);

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
          <ProspectFilters filters={filters} onFiltersChange={setFilters} onExport={exportToCSV} />
          <div className="flex gap-2 items-center justify-between sm:justify-end">
            {/* Mobile View Toggle */}
            {isMobile && (
              <div className="flex items-center bg-muted rounded-lg p-0.5">
                <Button
                  variant={mobileViewMode === 'card' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-9 px-3"
                  onClick={() => setMobileViewMode('card')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={mobileViewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-9 px-3"
                  onClick={() => setMobileViewMode('table')}
                >
                  <Table2 className="h-4 w-4" />
                </Button>
              </div>
            )}
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
              onClick={() => setFilters({ search: '', stage: 'all', status: 'all', priority: 'all' })}
              className="text-accent hover:underline"
            >
              Clear filters
            </button>
          </p>
        </div>
      ) : isMobile && mobileViewMode === 'card' ? (
        // Mobile Card Layout
        <div className="space-y-3">
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
          <div className="text-center text-xs text-muted-foreground py-2">
            Showing {filteredProspects.length} of {baseProspects.length} prospects
          </div>
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
              className="text-sm border-collapse"
              style={{ width: '100%', minWidth: isMobile ? '580px' : '800px' }}
            >
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b border-border">
                <tr>
                  {(isMobile ? MOBILE_COLUMN_ORDER : columnOrder).map((columnId) => {
                    const col = COLUMNS.find(c => c.id === columnId);
                    const width = isMobile ? col?.mobileWidth : columnWidths[columnId];
                    const isDragging = draggedColumn === columnId;
                    const isResizing = resizingColumn === columnId;
                    const isNameColumn = columnId === 'name';
                    
                    return (
                      <th
                        key={columnId}
                        draggable={!isMobile}
                        onDragStart={() => !isMobile && handleDragStart(columnId)}
                        onDragOver={(e) => !isMobile && handleDragOver(e, columnId)}
                        onDragEnd={() => !isMobile && handleDragEnd()}
                        className={cn(
                          "px-2 py-2.5 text-left whitespace-nowrap",
                          isDragging && "opacity-50 bg-primary/10",
                          columnId === 'index' && "text-center",
                          !isMobile && "hover:bg-muted/50 cursor-grab active:cursor-grabbing px-3 py-3 relative select-none",
                          isMobile && "text-[11px]",
                          // Make name column header sticky on mobile
                          isMobile && isNameColumn && "sticky left-0 z-20 bg-muted/50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]"
                        )}
                        style={{ width: `${width}px`, minWidth: `${width}px` }}
                      >
                        <div className="flex items-center gap-1">
                          {!isMobile && <GripVertical className="h-3 w-3 text-muted-foreground/50" />}
                          <span>{col?.label || columnId}</span>
                        </div>
                        {!isMobile && (
                          <div
                            className={cn(
                              "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors",
                              isResizing && "bg-primary"
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
                    columnWidths={isMobile 
                      ? Object.fromEntries(COLUMNS.map(c => [c.id, c.mobileWidth])) 
                      : columnWidths
                    }
                    isMobileTable={isMobile}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className={cn(
            "px-4 py-2 border-t border-border/50 bg-muted/20 text-xs text-muted-foreground flex items-center justify-between",
            isMobile && "px-2 py-1.5"
          )}>
            <span>{filteredProspects.length} of {baseProspects.length}</span>
            {!isMobile && <span className="text-muted-foreground/60">Drag columns to reorder • Drag edges to resize</span>}
          </div>
        </div>
      )}
    </div>
  );
}
