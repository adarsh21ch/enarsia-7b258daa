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
  const { getOptionsForType } = useCustomOptionsContext();

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
    onFiltersChange({ ...filters, stages: newStages });
  };

  const toggleAction = (action: ExtendedActionTaken) => {
    const newActions = filters.actions.includes(action) ? filters.actions.filter(a => a !== action) : [...filters.actions, action];
    onFiltersChange({ ...filters, actions: newActions });
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

  return (
    <div className="flex items-center gap-1.5">
      {/* Compact search input */}
      <div className="relative w-32 sm:w-40">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input 
          placeholder="Search..." 
          value={filters.search} 
          onChange={e => onFiltersChange({ ...filters, search: e.target.value })} 
          className="pl-7 h-8 text-xs w-full bg-background" 
        />
      </div>

      {/* Filter dropdown - Responses or Stages based on tab */}
      {showResponsesFilter && (
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className={cn(
                "h-8 text-xs gap-1 px-2",
                filters.actions.length > 0 && "border-primary/50 bg-primary/5"
              )}
            >
              <span className="truncate max-w-[70px] sm:max-w-[90px]">{getActionsLabel()}</span>
              <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1.5 bg-popover border-border z-[100]" align="start" sideOffset={4}>
            <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
              {actionOptions.map(action => (
                <label key={action} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                  <Checkbox 
                    checked={filters.actions.includes(action)} 
                    onCheckedChange={() => toggleAction(action)} 
                    className="h-3.5 w-3.5" 
                  />
                  <span className="truncate">{action}</span>
                </label>
              ))}
            </div>
            {filters.actions.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-1 h-7 text-xs" 
                onClick={() => onFiltersChange({ ...filters, actions: [] })}
              >
                Clear
              </Button>
            )}
          </PopoverContent>
        </Popover>
      )}

      {showStagesFilter && (
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className={cn(
                "h-8 text-xs gap-1 px-2",
                filters.stages.length > 0 && "border-primary/50 bg-primary/5"
              )}
            >
              <span className="truncate max-w-[70px] sm:max-w-[90px]">{getStagesLabel()}</span>
              <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1.5 bg-popover border-border z-[100]" align="start" sideOffset={4}>
            <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
              {stageOptions.map(stage => (
                <label key={stage} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                  <Checkbox 
                    checked={filters.stages.includes(stage)} 
                    onCheckedChange={() => toggleStage(stage)} 
                    className="h-3.5 w-3.5" 
                  />
                  <span className="truncate">{stage}</span>
                </label>
              ))}
            </div>
            {filters.stages.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-1 h-7 text-xs" 
                onClick={() => onFiltersChange({ ...filters, stages: [] })}
              >
                Clear
              </Button>
            )}
          </PopoverContent>
        </Popover>
      )}

      {hasFilters && (
        <Button variant="ghost" size="icon" onClick={clearFilters} className="h-8 w-8 shrink-0">
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}