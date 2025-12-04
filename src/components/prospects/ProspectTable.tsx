import { useState, useMemo } from 'react';
import { Prospect, FunnelStage, ProspectStatus, PriorityLevel } from '@/types/prospect';
import { ProspectRow } from './ProspectRow';
import { ProspectFilters } from './ProspectFilters';
import { AddProspectDialog } from './AddProspectDialog';
import { ImportExcelDialog } from './ImportExcelDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';

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
}

export function ProspectTable({ prospects, loading, onAdd, onUpdate, onDelete, onImport }: ProspectTableProps) {
  const [filters, setFilters] = useState<Filters>({
    search: '',
    stage: 'all',
    status: 'all',
    priority: 'all',
  });

  const filteredProspects = useMemo(() => {
    return prospects.filter((prospect) => {
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
  }, [prospects, filters]);

  const exportToCSV = () => {
    const headers = ['Name', 'Phone', 'Email', 'Funnel Stage', 'Action Taken', 'Status', 'Priority', 'Notes', 'Last Contact Date', 'Date Added'];
    const csvContent = [
      headers.join(','),
      ...filteredProspects.map((p) => [
        `"${p.name}"`,
        `"${p.phone}"`,
        `"${p.email || ''}"`,
        `"${p.funnel_stage}"`,
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
    link.download = `prospects_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <ProspectFilters filters={filters} onFiltersChange={setFilters} onExport={exportToCSV} />
        <div className="flex gap-2">
          <ImportExcelDialog onImport={onImport} />
          <AddProspectDialog onAdd={onAdd} />
        </div>
      </div>

      {prospects.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No prospects yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Click "+ Add Prospect" or "Import Excel" to get started
          </p>
          <div className="flex justify-center gap-2">
            <ImportExcelDialog onImport={onImport} />
            <AddProspectDialog onAdd={onAdd} />
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
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left w-[180px]">Name</th>
                  <th className="px-3 py-2.5 text-left w-[150px]">Phone</th>
                  <th className="px-3 py-2.5 text-left w-[130px]">Stage</th>
                  <th className="px-3 py-2.5 text-left w-[140px]">Action</th>
                  <th className="px-3 py-2.5 text-left w-[100px]">Status</th>
                  <th className="px-3 py-2.5 text-left w-[100px]">Priority</th>
                  <th className="px-3 py-2.5 text-left w-[110px]">Last Contact</th>
                  <th className="px-3 py-2.5 text-left w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProspects.map((prospect) => (
                  <ProspectRow
                    key={prospect.id}
                    prospect={prospect}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
            Showing {filteredProspects.length} of {prospects.length} prospects
          </div>
        </div>
      )}
    </div>
  );
}
