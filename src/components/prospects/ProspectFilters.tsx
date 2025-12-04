import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, Download } from 'lucide-react';
import { FUNNEL_STAGES, STATUSES, PRIORITIES, FunnelStage, ProspectStatus, PriorityLevel } from '@/types/prospect';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      stage: 'all',
      status: 'all',
      priority: 'all',
    });
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Search bar - full width on mobile */}
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, phone..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-8 h-10 sm:h-9 w-full"
        />
      </div>

      {/* Filters row - scrollable on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:flex-wrap sm:overflow-visible">
        <Select
          value={filters.stage}
          onValueChange={(value) => onFiltersChange({ ...filters, stage: value as FunnelStage | 'all' })}
        >
          <SelectTrigger className="h-10 sm:h-9 min-w-[100px] w-auto text-xs shrink-0">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent 
            className="bg-popover border-border z-[100]" 
            position="popper" 
            sideOffset={4}
            align="start"
          >
            <SelectItem value="all" className="min-h-[44px] sm:min-h-0">All Stages</SelectItem>
            {FUNNEL_STAGES.map((stage) => (
              <SelectItem key={stage} value={stage} className="text-xs min-h-[44px] sm:min-h-0">
                {stage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(value) => onFiltersChange({ ...filters, status: value as ProspectStatus | 'all' })}
        >
          <SelectTrigger className="h-10 sm:h-9 min-w-[90px] w-auto text-xs shrink-0">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent 
            className="bg-popover border-border z-[100]" 
            position="popper" 
            sideOffset={4}
            align="start"
          >
            <SelectItem value="all" className="min-h-[44px] sm:min-h-0">All Status</SelectItem>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status} className="text-xs min-h-[44px] sm:min-h-0">
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.priority}
          onValueChange={(value) => onFiltersChange({ ...filters, priority: value as PriorityLevel | 'all' })}
        >
          <SelectTrigger className="h-10 sm:h-9 min-w-[90px] w-auto text-xs shrink-0">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent 
            className="bg-popover border-border z-[100]" 
            position="popper" 
            sideOffset={4}
            align="start"
          >
            <SelectItem value="all" className="min-h-[44px] sm:min-h-0">All Priority</SelectItem>
            {PRIORITIES.map((priority) => (
              <SelectItem key={priority} value={priority} className="text-xs min-h-[44px] sm:min-h-0">
                {priority}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10 sm:h-9 px-2 text-xs shrink-0">
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={onExport} className="h-10 sm:h-9 gap-1.5 shrink-0">
          <Download className="h-3.5 w-3.5" />
          {!isMobile && 'Export'}
        </Button>
      </div>
    </div>
  );
}
