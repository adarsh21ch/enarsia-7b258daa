import { useRef, useCallback } from 'react';
import { Prospect, Sheet } from '@/types/prospect';
import { SortableProspectRow } from './SortableProspectRow';
import { SheetTabs } from './SheetTabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  SensorDescriptor,
  SensorOptions,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface ColumnConfig {
  id: string;
  label: string;
  width: number;
  mobileWidth: number;
}

interface TableLayoutProps {
  sheets: Sheet[];
  selectedSheetId: string | null;
  onSelectSheet: (id: string | null) => void;
  onAddSheet: (name: string) => Promise<Sheet | null>;
  onUpdateSheet: (id: string, name: string) => Promise<Sheet | null>;
  onDeleteSheet: (id: string) => Promise<boolean>;
  onEnterSelectMode: (sheetId: string | null) => void;
  onDeleteAllInSheet: (sheetId: string | null) => Promise<void>;
  selectionMode: { active: boolean; sheetId: string | null };
  selectedIds: Set<string>;
  selectionProspects: Prospect[];
  handleSelectAll: () => void;
  columnOrder: string[];
  columnWidths: Record<string, number>;
  isMobile: boolean;
  filteredProspects: Prospect[];
  prospects: Prospect[];
  sheetFilteredProspects: Prospect[];
  baseProspects: Prospect[];
  setFilters: (filters: any) => void;
  sensors: SensorDescriptor<SensorOptions>[];
  handleRowDragEnd: (event: DragEndEvent) => void;
  isCalling: boolean;
  expandedRowId: string | null;
  handleToggleExpand: (id: string) => void;
  handleUpdateWithUndo: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
  handleDeleteWithUndo: (id: string) => Promise<boolean>;
  handleToggleSelect: (id: string) => void;
  COLUMNS: ColumnConfig[];
}

export function TableLayout({
  sheets,
  selectedSheetId,
  onSelectSheet,
  onAddSheet,
  onUpdateSheet,
  onDeleteSheet,
  onEnterSelectMode,
  onDeleteAllInSheet,
  selectionMode,
  selectedIds,
  selectionProspects,
  handleSelectAll,
  columnOrder,
  columnWidths,
  isMobile,
  filteredProspects,
  prospects,
  sheetFilteredProspects,
  baseProspects,
  setFilters,
  sensors,
  handleRowDragEnd,
  isCalling,
  expandedRowId,
  handleToggleExpand,
  handleUpdateWithUndo,
  handleDeleteWithUndo,
  handleToggleSelect,
  COLUMNS,
}: TableLayoutProps) {
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  // Sync horizontal scroll between header and body
  const handleBodyScroll = useCallback(() => {
    if (bodyScrollRef.current && headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = bodyScrollRef.current.scrollLeft;
    }
  }, []);

  const handleHeaderScroll = useCallback(() => {
    if (headerScrollRef.current && bodyScrollRef.current) {
      bodyScrollRef.current.scrollLeft = headerScrollRef.current.scrollLeft;
    }
  }, []);

  const tableMinWidth = isMobile ? 580 : 880;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm flex flex-col">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-30 bg-card">
        {/* Sheet tabs - always full width, no horizontal scroll */}
        <div className="border-b border-border/50">
          <SheetTabs
            sheets={sheets}
            selectedSheetId={selectedSheetId}
            onSelectSheet={onSelectSheet}
            onAddSheet={onAddSheet}
            onUpdateSheet={onUpdateSheet}
            onDeleteSheet={onDeleteSheet}
            onEnterSelectMode={onEnterSelectMode}
            onDeleteAllInSheet={onDeleteAllInSheet}
          />
        </div>
        
        {/* Column headers - horizontally scrollable, synced with body */}
        <div
          ref={headerScrollRef}
          onScroll={handleHeaderScroll}
          className="overflow-x-auto scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div 
            className="flex bg-muted/95 backdrop-blur-sm text-xs font-semibold text-muted-foreground border-b border-border"
            style={{ minWidth: `${tableMinWidth}px` }}
          >
            {/* Selection checkbox header */}
            {selectionMode.active && (
              <div className="px-2 py-2.5 w-10 min-w-[40px] flex-shrink-0 flex items-center justify-center">
                <Checkbox
                  checked={selectedIds.size === selectionProspects.length && selectionProspects.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </div>
            )}
            {/* Drag handle header */}
            <div className="px-1 py-2.5 w-8 min-w-[32px] flex-shrink-0"></div>
            {columnOrder.map((columnId) => {
              const col = COLUMNS.find(c => c.id === columnId);
              if (!col) return null;
              const width = columnWidths[columnId];
              const isNameColumn = columnId === 'name';
              const isIndexColumn = columnId === 'index';
              
              return (
                <div
                  key={columnId}
                  className={cn(
                    "px-2 py-2.5 text-left whitespace-nowrap flex-shrink-0",
                    columnId === 'index' && "text-center",
                    isMobile && "text-[11px] px-1.5",
                    isMobile && isNameColumn && "sticky left-[68px] z-20 bg-muted/95 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]",
                    isMobile && isIndexColumn && "sticky left-[32px] z-20 bg-muted/95"
                  )}
                  style={{ width: `${width}px`, minWidth: `${width}px` }}
                >
                  {col.label}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scrollable Body Section */}
      <div
        ref={bodyScrollRef}
        onScroll={handleBodyScroll}
        className="overflow-x-auto flex-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <table 
          className="text-sm border-collapse w-full"
          style={{ minWidth: `${tableMinWidth}px` }}
        >
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
                {filteredProspects.length === 0 ? (
                  <tr>
                    <td 
                      colSpan={columnOrder.length + (selectionMode.active ? 2 : 1) + 1}
                      className="py-12 text-center"
                    >
                      <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {prospects.length === 0 
                          ? "No prospects yet" 
                          : selectedSheetId 
                            ? "No prospects in this sheet"
                            : "No prospects match your filters"
                        }
                      </p>
                      <p className="text-xs text-muted-foreground/70 mb-3">
                        {prospects.length === 0 || (selectedSheetId && sheetFilteredProspects.length === 0)
                          ? "Import Excel or Add Prospect to get started"
                          : (
                            <button
                              onClick={() => setFilters({ search: '', stages: [], qualities: [], actions: [], incompleteOnly: false })}
                              className="text-accent hover:underline"
                            >
                              Clear filters
                            </button>
                          )
                        }
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
                      columnOrder={columnOrder}
                      columnWidths={columnWidths}
                      isMobileTable={isMobile}
                      showSelection={selectionMode.active && selectionProspects.some(p => p.id === prospect.id)}
                      isSelected={selectedIds.has(prospect.id)}
                      onToggleSelect={() => handleToggleSelect(prospect.id)}
                    />
                  ))
                )}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
        <span>Showing {filteredProspects.length} of {baseProspects.length} prospects</span>
      </div>
    </div>
  );
}
