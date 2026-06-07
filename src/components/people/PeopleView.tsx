import { useEffect, useState, useCallback } from 'react';
import { ProspectTable } from '@/components/prospects/ProspectTable';
import { PersonTableView } from './PersonTableView';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { Prospect, Sheet as SheetType } from '@/types/prospect';

const STORAGE_KEY = 'people_view_mode';
export type PeopleViewMode = 'card' | 'table';

function readMode(): PeopleViewMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'card' || v === 'table') return v;
  } catch {}
  return 'card';
}

interface PeopleViewProps {
  source: 'leads' | 'funnel';
  prospects: Prospect[];
  loading: boolean;
  onAdd: (p: Partial<Prospect>) => Promise<Prospect | null>;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
  onDelete: (id: string) => Promise<Prospect | null | boolean>;
  onBulkDelete?: (ids: string[]) => Promise<{ deleted: number; prospects: Prospect[] }>;
  onBulkDeleteBySheet?: (sheetId: string | null) => Promise<{ deleted: number }>;
  onRestoreProspect?: (p: Prospect) => Promise<Prospect | null>;
  onRestoreProspects?: (p: Prospect[]) => Promise<number>;
  onImport: (
    prospects: Partial<Prospect>[],
    onProgress?: (imported: number, total: number) => void,
  ) => Promise<{ imported: number; skipped: number }>;
  onReorderProspects?: (ids: string[]) => Promise<boolean>;
  sheets: SheetType[];
  selectedSheetId: string | null;
  onSelectSheet: (id: string | null) => void;
  onAddSheet: (name: string) => Promise<SheetType | null>;
  onUpdateSheet: (id: string, name: string) => Promise<SheetType | null>;
  onDeleteSheet: (id: string) => Promise<boolean>;
  getOrCreateTodaySheet?: () => Promise<string | null>;
  filterMode: 'calling' | 'funnel';
  subFilter: 'all' | 'hot' | 'scheduled' | 'day1' | 'progress';
  externalSearch?: string;
  onExternalSearchChange?: (v: string) => void;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  kpiTotal?: number;
  kpiTagCounts?: Record<string, number>;
  loadedCount?: number;
  fetchAllForExport?: (sheetId?: string | null) => Promise<Prospect[]>;
  stickyHeaderTop?: number;
}

export function PeopleView(props: PeopleViewProps) {
  const isMobile = useIsMobile();
  const [storedMode, setStoredMode] = useState<PeopleViewMode>(readMode);

  // Mobile forces card view but preserves the stored desktop preference
  const effectiveMode: PeopleViewMode = isMobile ? 'card' : storedMode;

  const toggleView = useCallback(() => {
    if (isMobile) {
      toast.message('List view requires a wider screen');
      return;
    }
    setStoredMode((prev) => {
      const next: PeopleViewMode = prev === 'card' ? 'table' : 'card';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
      return next;
    });
  }, [isMobile]);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'card' || e.newValue === 'table')) {
        setStoredMode(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (effectiveMode === 'table') {
    return (
      <PersonTableView
        prospects={props.prospects}
        loading={props.loading}
        onUpdate={props.onUpdate}
        onDelete={props.onDelete}
        onBulkDelete={props.onBulkDelete}
        sheets={props.sheets}
        selectedSheetId={props.selectedSheetId}
        onSelectSheet={props.onSelectSheet}
        onAddSheet={props.onAddSheet}
        onUpdateSheet={props.onUpdateSheet}
        onDeleteSheet={props.onDeleteSheet}
        externalSearch={props.externalSearch}
        onExternalSearchChange={props.onExternalSearchChange}
        hasNextPage={props.hasNextPage}
        onLoadMore={props.onLoadMore}
        isLoadingMore={props.isLoadingMore}
        source={props.source}
        viewMode={effectiveMode}
        onToggleView={toggleView}
        viewToggleDisabled={isMobile}
      />
    );
  }

  return (
    <ProspectTable
      {...props}
      viewMode={effectiveMode}
      onToggleView={toggleView}
      viewToggleDisabled={isMobile}
    />
  );
}
