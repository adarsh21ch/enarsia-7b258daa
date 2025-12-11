import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, X, Download, ChevronDown, Loader2 } from 'lucide-react';
import { FUNNEL_STAGES, EXTENDED_ACTIONS, FunnelStage, ProspectQuality, ExtendedActionTaken } from '@/types/prospect';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCustomOptionsContext } from '@/contexts/CustomOptionsContext';
import { cn } from '@/lib/utils';
interface Filters {
  search: string;
  stages: FunnelStage[];
  qualities: ProspectQuality[];
  actions: ExtendedActionTaken[];
  incompleteOnly: boolean;
}
interface ProspectFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onExport: () => Promise<void>;
  exporting?: boolean;
  filteredCount?: number;
  showStagesFilter?: boolean;
  showResponsesFilter?: boolean;
}
export function ProspectFilters({
  filters,
  onFiltersChange,
  onExport,
  exporting = false,
  filteredCount = 0,
  showStagesFilter = true,
  showResponsesFilter = true
}: ProspectFiltersProps) {
  const hasFilters = filters.search || filters.stages.length > 0 || filters.actions.length > 0;
  const isMobile = useIsMobile();
  const {
    getOptionsForType
  } = useCustomOptionsContext();

  // Get dynamic options from user's custom tags
  const stageOptions = getOptionsForType('funnel_stage', FUNNEL_STAGES) as FunnelStage[];
  const actionOptions = getOptionsForType('action_taken', EXTENDED_ACTIONS) as ExtendedActionTaken[];
  const clearFilters = () => {
    onFiltersChange({
      search: '',
      stages: [],
      qualities: [],
      actions: [],
      incompleteOnly: false
    });
  };
  const toggleStage = (stage: FunnelStage) => {
    const newStages = filters.stages.includes(stage) ? filters.stages.filter(s => s !== stage) : [...filters.stages, stage];
    onFiltersChange({
      ...filters,
      stages: newStages
    });
  };
  const toggleAction = (action: ExtendedActionTaken) => {
    const newActions = filters.actions.includes(action) ? filters.actions.filter(a => a !== action) : [...filters.actions, action];
    onFiltersChange({
      ...filters,
      actions: newActions
    });
  };
  const getStagesLabel = () => {
    if (filters.stages.length === 0) return 'All Stages';
    if (filters.stages.length === 1) return filters.stages[0];
    return `${filters.stages.length} Stages`;
  };
  const getActionsLabel = () => {
    if (filters.actions.length === 0) return 'All Responses';
    if (filters.actions.length === 1) return filters.actions[0];
    return `${filters.actions.length} Responses`;
  };
  return <div className="flex flex-col gap-2 w-full">
      {/* Search bar - full width on mobile */}
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search name, phone..." value={filters.search} onChange={e => onFiltersChange({
        ...filters,
        search: e.target.value
      })} className="pl-8 h-10 sm:h-9 w-full mx-0" />
      </div>

      {/* Filters row - scrollable on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:flex-wrap sm:overflow-visible">
        {/* Multi-select Responses Filter - only show if showResponsesFilter is true */}
        {showResponsesFilter && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("h-10 sm:h-9 min-w-[100px] w-auto text-xs shrink-0 justify-between gap-1", filters.actions.length > 0 && "border-primary/50 bg-primary/5")}>
                <span className="truncate">{getActionsLabel()}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2 bg-popover border-border z-[100]" align="start" sideOffset={4}>
              <div className="space-y-1">
                {actionOptions.map(action => <label key={action} className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted cursor-pointer min-h-[40px]">
                    <Checkbox checked={filters.actions.includes(action)} onCheckedChange={() => toggleAction(action)} className="h-4 w-4" />
                    <span className="text-sm">{action}</span>
                  </label>)}
              </div>
              {filters.actions.length > 0 && <Button variant="ghost" size="sm" className="w-full mt-2 h-8 text-xs" onClick={() => onFiltersChange({
              ...filters,
              actions: []
            })}>
                  Clear Responses
                </Button>}
            </PopoverContent>
          </Popover>
        )}

        {/* Multi-select Stages Filter - only show if showStagesFilter is true */}
        {showStagesFilter && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("h-10 sm:h-9 min-w-[100px] w-auto text-xs shrink-0 justify-between gap-1", filters.stages.length > 0 && "border-primary/50 bg-primary/5")}>
                <span className="truncate">{getStagesLabel()}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2 bg-popover border-border z-[100]" align="start" sideOffset={4}>
              <div className="space-y-1">
                {stageOptions.map(stage => <label key={stage} className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted cursor-pointer min-h-[40px]">
                    <Checkbox checked={filters.stages.includes(stage)} onCheckedChange={() => toggleStage(stage)} className="h-4 w-4" />
                    <span className="text-sm">{stage}</span>
                  </label>)}
              </div>
              {filters.stages.length > 0 && <Button variant="ghost" size="sm" className="w-full mt-2 h-8 text-xs" onClick={() => onFiltersChange({
              ...filters,
              stages: []
            })}>
                  Clear Stages
                </Button>}
            </PopoverContent>
          </Popover>
        )}

        {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10 sm:h-9 px-2 text-xs shrink-0">
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>}

        <Button variant="outline" size="sm" onClick={onExport} disabled={exporting || filteredCount === 0} className="h-10 sm:h-9 gap-1.5 shrink-0">
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {!isMobile && (exporting ? 'Exporting...' : `Export${filteredCount > 0 ? ` (${filteredCount})` : ''}`)}
        </Button>
      </div>
    </div>;
}