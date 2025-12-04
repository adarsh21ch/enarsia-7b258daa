import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, Download } from 'lucide-react';
import { FUNNEL_STAGES, STATUSES, PRIORITIES, FunnelStage, ProspectStatus, PriorityLevel } from '@/types/prospect';

interface Filters {
  search: string;
  stage: FunnelStage | 'all';
  status: ProspectStatus | 'all';
  priority: PriorityLevel | 'all';
}

interface ProspectFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onExport: () => void;
}

export function ProspectFilters({ filters, onFiltersChange, onExport }: ProspectFiltersProps) {
  const hasFilters = filters.search || filters.stage !== 'all' || filters.status !== 'all' || filters.priority !== 'all';

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      stage: 'all',
      status: 'all',
      priority: 'all',
    });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, phone, notes..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-8 h-9"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          value={filters.stage}
          onValueChange={(value) => onFiltersChange({ ...filters, stage: value as FunnelStage | 'all' })}
        >
          <SelectTrigger className="h-9 w-[130px] text-xs">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="all">All Stages</SelectItem>
            {FUNNEL_STAGES.map((stage) => (
              <SelectItem key={stage} value={stage} className="text-xs">
                {stage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(value) => onFiltersChange({ ...filters, status: value as ProspectStatus | 'all' })}
        >
          <SelectTrigger className="h-9 w-[110px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="all">All Status</SelectItem>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status} className="text-xs">
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.priority}
          onValueChange={(value) => onFiltersChange({ ...filters, priority: value as PriorityLevel | 'all' })}
        >
          <SelectTrigger className="h-9 w-[110px] text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="all">All Priority</SelectItem>
            {PRIORITIES.map((priority) => (
              <SelectItem key={priority} value={priority} className="text-xs">
                {priority}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2 text-xs">
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={onExport} className="h-9 gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>
    </div>
  );
}
