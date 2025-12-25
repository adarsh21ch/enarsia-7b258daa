import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Filter, X, ArrowUpDown } from 'lucide-react';
import { FunnelStage, ExtendedActionTaken, FUNNEL_STAGES, EXTENDED_ACTIONS } from '@/types/prospect';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Filters {
  search: string;
  stages: FunnelStage[];
  qualities: string[];
  actions: ExtendedActionTaken[];
  incompleteOnly: boolean;
}

interface FilterBottomSheetProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  showStagesFilter?: boolean;
  showResponsesFilter?: boolean;
}

export function FilterBottomSheet({
  filters,
  onFiltersChange,
  showStagesFilter = true,
  showResponsesFilter = true,
}: FilterBottomSheetProps) {
  const [open, setOpen] = useState(false);
  
  const {
    leadsTrackingTagNames,
    leadsNonTrackingTags,
    stageTagNames,
    stageNonTrackingTags,
  } = useTrackingFormatContext();

  // Build options from TrackingFormatContext
  const hasLeadsTrackingTags = leadsTrackingTagNames.length > 0;
  const actionOptions = hasLeadsTrackingTags 
    ? [...leadsTrackingTagNames, ...leadsNonTrackingTags] as ExtendedActionTaken[]
    : EXTENDED_ACTIONS as ExtendedActionTaken[];
    
  const hasStageTrackingTags = stageTagNames.length > 0;
  const stageOptions = hasStageTrackingTags
    ? [...stageTagNames, ...stageNonTrackingTags] as FunnelStage[]
    : FUNNEL_STAGES as FunnelStage[];

  const activeFilterCount = 
    filters.stages.length + 
    filters.actions.length + 
    (filters.incompleteOnly ? 1 : 0);

  const toggleStage = (stage: FunnelStage) => {
    const newStages = filters.stages.includes(stage) 
      ? filters.stages.filter(s => s !== stage) 
      : [...filters.stages, stage];
    onFiltersChange({ ...filters, stages: newStages });
  };

  const toggleAction = (action: ExtendedActionTaken) => {
    const newActions = filters.actions.includes(action) 
      ? filters.actions.filter(a => a !== action) 
      : [...filters.actions, action];
    onFiltersChange({ ...filters, actions: newActions });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      stages: [],
      qualities: [],
      actions: [],
      incompleteOnly: false,
    });
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className={cn(
            "h-9 w-9 relative",
            activeFilterCount > 0 && "border-primary bg-primary/10"
          )}
        >
          <Filter className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </DrawerTitle>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </DrawerHeader>

        <div className="px-4 py-4 overflow-y-auto space-y-6">
          {/* Response Filters */}
          {showResponsesFilter && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Response Tags
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {actionOptions.map((action) => (
                  <label 
                    key={action} 
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors",
                      filters.actions.includes(action) 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Checkbox 
                      checked={filters.actions.includes(action)} 
                      onCheckedChange={() => toggleAction(action)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm truncate">{action}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Stage Filters */}
          {showStagesFilter && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Funnel Stages
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {stageOptions.map((stage) => (
                  <label 
                    key={stage} 
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors",
                      filters.stages.includes(stage) 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Checkbox 
                      checked={filters.stages.includes(stage)} 
                      onCheckedChange={() => toggleStage(stage)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm truncate">{stage}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Sort Options (optional - placeholder) */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort By
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="h-9 text-xs">
                Date Added
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-xs">
                Name A-Z
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-xs">
                Last Updated
              </Button>
            </div>
          </div>
        </div>

        <DrawerFooter className="border-t border-border pt-3">
          <DrawerClose asChild>
            <Button className="w-full">Apply Filters</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
