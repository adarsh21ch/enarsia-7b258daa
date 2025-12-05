import { useState, useMemo, useCallback } from 'react';
import { Prospect, Sheet } from '@/types/prospect';
import { ProspectRow } from './ProspectRow';
import { MobileProspectCard } from './MobileProspectCard';
import { AddProspectDialog } from './AddProspectDialog';
import { ImportExcelDialog } from './ImportExcelDialog';
import { SheetTabs } from './SheetTabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, LayoutGrid, Table2, Search, Download, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { cn } from '@/lib/utils';

interface ProspectTableProps {
  prospects: Prospect[];
  loading: boolean;
  onAdd: (prospect: Partial<Prospect>) => Promise<Prospect | null>;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
  onDelete: (id: string) => Promise<boolean>;
  onImport: (prospects: Partial<Prospect>[]) => Promise<{ imported: number; skipped: number }>;
  sheets: Sheet[];
  selectedSheetId: string | null;
  onSelectSheet: (id: string | null) => void;
  onAddSheet: (name: string) => Promise<Sheet | null>;
  onUpdateSheet: (id: string, name: string) => Promise<Sheet | null>;
  onDeleteSheet: (id: string) => Promise<boolean>;
  filterMode: 'calling' | 'funnel';
  subFilter: 'all' | 'hot' | 'scheduled' | 'day1' | 'progress';
}

// Simplified columns for 6-field model
const COLUMNS = [
  { id: 'index', label: '#', defaultWidth: 50, minWidth: 40, mobileWidth: 36 },
  { id: 'name', label: 'Name', defaultWidth: 180, minWidth: 120, mobileWidth: 130 },
  { id: 'phone', label: 'Phone', defaultWidth: 140, minWidth: 100, mobileWidth: 100 },
  { id: 'contact', label: 'Call', defaultWidth: 70, minWidth: 60, mobileWidth: 60 },
  { id: 'location', label: 'Location', defaultWidth: 150, minWidth: 100, mobileWidth: 100 },
  { id: 'age', label: 'Age/DOB', defaultWidth: 90, minWidth: 70, mobileWidth: 70 },
  { id: 'gender', label: 'Gender', defaultWidth: 80, minWidth: 60, mobileWidth: 60 },
  { id: 'actions', label: '', defaultWidth: 80, minWidth: 70, mobileWidth: 50 },
];

const MOBILE_COLUMN_ORDER = ['index', 'name', 'phone', 'contact', 'location', 'age', 'gender', 'actions'];

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
  const [search, setSearch] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [mobileViewMode, setMobileViewMode] = useState<'card' | 'table'>('table');
  const isMobile = useIsMobile();
  
  const debouncedSearch = useDebouncedValue(search, 200);

  const [columnOrder] = useState<string[]>(COLUMNS.map(c => c.id));
  const [columnWidths] = useState<Record<string, number>>(
    Object.fromEntries(COLUMNS.map(c => [c.id, c.defaultWidth]))
  );

  // Filter by sheet
  const sheetFilteredProspects = useMemo(() => {
    if (!selectedSheetId) return prospects;
    return prospects.filter(p => p.sheet_id === selectedSheetId);
  }, [prospects, selectedSheetId]);

  // Apply search filter
  const filteredProspects = useMemo(() => {
    return sheetFilteredProspects.filter((prospect) => {
      const searchLower = debouncedSearch.toLowerCase();
      return !debouncedSearch ||
        prospect.name.toLowerCase().includes(searchLower) ||
        prospect.phone.toLowerCase().includes(searchLower) ||
        prospect.city?.toLowerCase().includes(searchLower) ||
        prospect.state?.toLowerCase().includes(searchLower);
    });
  }, [sheetFilteredProspects, debouncedSearch]);

  const exportToCSV = () => {
    const headers = ['#', 'Name', 'Phone', 'City', 'State', 'Age/DOB', 'Gender', 'Date Added'];
    const csvContent = [
      headers.join(','),
      ...filteredProspects.map((p, i) => [
        i + 1,
        `"${p.name}"`,
        `"${p.phone}"`,
        `"${p.city || ''}"`,
        `"${p.state || ''}"`,
        `"${p.age_or_dob || ''}"`,
        `"${p.gender || ''}"`,
        `"${p.date_added}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `prospects_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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
            </div>
          ))}
        </div>
      </div>
    );
  }

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
      {renderSheetTabs()}
      
      {/* Toolbar */}
      <div className="bg-card/50 rounded-xl border border-border/50 p-2 sm:p-3 space-y-2 sm:space-y-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8 h-10"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <div className="flex gap-2 items-center justify-between sm:justify-end">
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
            <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-1.5">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <ImportExcelDialog onImport={handleImportProspects} />
            <AddProspectDialog onAdd={handleAddProspect} />
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
            No prospects match your search.{' '}
            <button
              onClick={() => setSearch('')}
              className="text-accent hover:underline"
            >
              Clear search
            </button>
          </p>
        </div>
      ) : isMobile && mobileViewMode === 'card' ? (
        <div className="space-y-3">
          {filteredProspects.map((prospect, index) => (
            <MobileProspectCard
              key={prospect.id}
              prospect={prospect}
              index={index + 1}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
          <div className="text-center text-xs text-muted-foreground py-2">
            Showing {filteredProspects.length} of {prospects.length} prospects
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
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
              style={{ width: '100%', minWidth: isMobile ? '600px' : '700px' }}
            >
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b border-border">
                <tr>
                  {(isMobile ? MOBILE_COLUMN_ORDER : columnOrder).map((columnId) => {
                    const col = COLUMNS.find(c => c.id === columnId);
                    if (!col) return null;
                    const width = isMobile ? col.mobileWidth : columnWidths[columnId];
                    const isNameColumn = columnId === 'name';
                    const isIndexColumn = columnId === 'index';
                    
                    return (
                      <th
                        key={columnId}
                        className={cn(
                          "px-2 py-2.5 text-left whitespace-nowrap",
                          columnId === 'index' && "text-center",
                          !isMobile && "px-3 py-3",
                          isMobile && "text-[11px]",
                          isMobile && isNameColumn && "sticky left-[36px] z-20 bg-muted/50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]",
                          isMobile && isIndexColumn && "sticky left-0 z-20 bg-muted/50"
                        )}
                        style={{ width: `${width}px`, minWidth: `${width}px` }}
                      >
                        {getColumnLabel(columnId)}
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
          <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
            Showing {filteredProspects.length} of {prospects.length} prospects
          </div>
        </div>
      )}
    </div>
  );
}
