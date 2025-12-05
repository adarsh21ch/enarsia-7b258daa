import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, X, Download, ChevronDown } from 'lucide-react';
import { FUNNEL_STAGES, STATUSES, EXTENDED_ACTIONS, FunnelStage, ProspectStatus, ExtendedActionTaken } from '@/types/prospect';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface Filters {
  search: string;
  stage: FunnelStage | 'all';
  status: ProspectStatus | 'all';
  actions: ExtendedActionTaken[];
  incompleteOnly: boolean;
}

interface ProspectFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onExport: () => void;
}

export function ProspectFilters({ filters, onFiltersChange, onExport }: ProspectFiltersProps) {
  const hasFilters = filters.search || filters.stage !== 'all' || filters.status !== 'all' || filters.actions.length > 0 || filters.incompleteOnly;
  const isMobile = useIsMobile();

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      stage: 'all',
      status: 'all',
      actions: [],
      incompleteOnly: false,
    });
  };

  const toggleAction = (action: ExtendedActionTaken) => {
    const newActions = filters.actions.includes(action)
      ? filters.actions.filter(a => a !== action)
      : [...filters.actions, action];
    onFiltersChange({ ...filters, actions: newActions });
  };

  const getActionsLabel = () => {
    if (filters.actions.length === 0) return 'All Actions';
    if (filters.actions.length === 1) return filters.actions[0];
    return `${filters.actions.length} Actions`;
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

        {/* Multi-select Actions Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className={cn(
                "h-10 sm:h-9 min-w-[100px] w-auto text-xs shrink-0 justify-between gap-1",
                filters.actions.length > 0 && "border-primary/50 bg-primary/5"
              )}
            >
              <span className="truncate">{getActionsLabel()}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-48 p-2 bg-popover border-border z-[100]" 
            align="start"
            sideOffset={4}
          >
            <div className="space-y-1">
              {EXTENDED_ACTIONS.map((action) => (
                <label
                  key={action}
                  className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted cursor-pointer min-h-[40px]"
                >
                  <Checkbox
                    checked={filters.actions.includes(action)}
                    onCheckedChange={() => toggleAction(action)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{action}</span>
                </label>
              ))}
            </div>
            {filters.actions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 h-8 text-xs"
                onClick={() => onFiltersChange({ ...filters, actions: [] })}
              >
                Clear Actions
              </Button>
            )}
          </PopoverContent>
        </Popover>

        {/* Incomplete Records Filter */}
        <Button
          variant={filters.incompleteOnly ? "default" : "outline"}
          size="sm"
          onClick={() => onFiltersChange({ ...filters, incompleteOnly: !filters.incompleteOnly })}
          className={cn(
            "h-10 sm:h-9 text-xs shrink-0",
            filters.incompleteOnly && "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
          )}
        >
          Incomplete
        </Button>

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
