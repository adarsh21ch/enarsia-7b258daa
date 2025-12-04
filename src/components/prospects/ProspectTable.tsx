import { useState, useMemo } from 'react';
import { Prospect, FunnelStage, ProspectStatus, PriorityLevel, Sheet } from '@/types/prospect';
import { ProspectRow } from './ProspectRow';
import { MobileProspectCard } from './MobileProspectCard';
import { ProspectFilters } from './ProspectFilters';
import { AddProspectDialog } from './AddProspectDialog';
import { ImportExcelDialog } from './ImportExcelDialog';
import { CallingFunnelTabs, TabType } from './CallingFunnelTabs';
import { SheetTabs } from './SheetTabs';
import { ProspectReportCard } from './ProspectReportCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

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
}

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
}: ProspectTableProps) {
  const [activeTab, setActiveTab] = useState<TabType>('calling');
  const [filters, setFilters] = useState<Filters>({
    search: '',
    stage: 'all',
    status: 'all',
    priority: 'all',
  });
  const [reportCardProspect, setReportCardProspect] = useState<Prospect | null>(null);
  const [reportCardOpen, setReportCardOpen] = useState(false);
  const isMobile = useIsMobile();

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

  // Get base prospects based on active tab
  const baseProspects = activeTab === 'calling' ? callingProspects : funnelProspects;

  // Filter by sheet (only in Calling tab)
  const sheetFilteredProspects = useMemo(() => {
    if (activeTab !== 'calling' || !selectedSheetId) return baseProspects;
    return baseProspects.filter(p => p.sheet_id === selectedSheetId);
  }, [baseProspects, activeTab, selectedSheetId]);

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
    link.download = `prospects_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleAddProspect = async (prospect: Partial<Prospect>) => {
    // Automatically set sheet_id if a sheet is selected in Calling tab
    if (activeTab === 'calling' && selectedSheetId) {
      prospect.sheet_id = selectedSheetId;
    }
    return onAdd(prospect);
  };

  const handleImportProspects = async (prospectsData: Partial<Prospect>[]) => {
    // Automatically set sheet_id for imported prospects if a sheet is selected
    if (activeTab === 'calling' && selectedSheetId) {
      prospectsData = prospectsData.map(p => ({ ...p, sheet_id: selectedSheetId }));
    }
    return onImport(prospectsData);
  };

  const handleOpenReportCard = (prospect: Prospect) => {
    setReportCardProspect(prospect);
    setReportCardOpen(true);
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

  const isCalling = activeTab === 'calling';

  return (
    <div className="space-y-4">
      {/* Calling/Funnel Tabs */}
      <CallingFunnelTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        callingCount={callingProspects.length}
        funnelCount={funnelProspects.length}
      />

      {/* Sheet Tabs (only in Calling) */}
      {activeTab === 'calling' && (
        <SheetTabs
          sheets={sheets}
          selectedSheetId={selectedSheetId}
          onSelectSheet={onSelectSheet}
          onAddSheet={onAddSheet}
          onUpdateSheet={onUpdateSheet}
          onDeleteSheet={onDeleteSheet}
        />
      )}

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <ProspectFilters filters={filters} onFiltersChange={setFilters} onExport={exportToCSV} />
        <div className="flex gap-2">
          <ImportExcelDialog onImport={handleImportProspects} />
          <AddProspectDialog onAdd={handleAddProspect} />
        </div>
      </div>

      {/* Content */}
      {prospects.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
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
        <div className="bg-card rounded-lg border border-border p-8 text-center">
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
      ) : isMobile ? (
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
              onOpenReportCard={handleOpenReportCard}
            />
          ))}
          <div className="text-center text-xs text-muted-foreground py-2">
            Showing {filteredProspects.length} of {baseProspects.length} prospects
          </div>
        </div>
      ) : (
        // Desktop Table Layout
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="px-2 py-2.5 text-center w-[50px]">#</th>
                  <th className="px-3 py-2.5 text-left w-[180px]">Name</th>
                  <th className="px-3 py-2.5 text-left w-[150px]">Phone</th>
                  <th className="px-3 py-2.5 text-left w-[120px]">{isCalling ? 'Enroll' : 'Stage'}</th>
                  <th className="px-3 py-2.5 text-left w-[140px]">Action</th>
                  <th className="px-3 py-2.5 text-left w-[100px]">Status</th>
                  <th className="px-3 py-2.5 text-left w-[100px]">Priority</th>
                  <th className="px-3 py-2.5 text-left w-[110px]">Last Contact</th>
                  <th className="px-3 py-2.5 text-left w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProspects.map((prospect, index) => (
                  <ProspectRow
                    key={prospect.id}
                    prospect={prospect}
                    index={index + 1}
                    isCalling={isCalling}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onOpenReportCard={handleOpenReportCard}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
            Showing {filteredProspects.length} of {baseProspects.length} prospects
          </div>
        </div>
      )}

      {/* Prospect Report Card Drawer */}
      <ProspectReportCard
        prospect={reportCardProspect}
        open={reportCardOpen}
        onOpenChange={setReportCardOpen}
        onUpdate={onUpdate}
      />
    </div>
  );
}
