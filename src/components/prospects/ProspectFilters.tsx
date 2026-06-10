import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { X, ChevronDown, Settings2, Lock } from 'lucide-react';
import { FUNNEL_STAGES, EXTENDED_ACTIONS, FunnelStage, ProspectQuality, ExtendedActionTaken } from '@/types/prospect';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/contexts/PermissionsContext';
import { toast } from 'sonner';
import { ManageResponseTagsDialog } from './ManageResponseTagsDialog';
import { ManageStageTagsDialog } from './ManageStageTagsDialog';
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
  showStagesFilter?: boolean;
  showResponsesFilter?: boolean;
  filterTagButton?: React.ReactNode;
  hideSearch?: boolean;
}
export function ProspectFilters({
  filters,
  onFiltersChange,
  showStagesFilter = true,
  showResponsesFilter = true,
  filterTagButton,
  hideSearch = false
}: ProspectFiltersProps) {
  const hasFilters = filters.search || filters.stages.length > 0 || filters.actions.length > 0;
  const isMobile = useIsMobile();
  const { checkFeature } = usePermissions();
  const canRetarget = checkFeature('retargeting_by_tags');

  // Use TrackingFormatContext for tag options (unified source of truth)
  const {
    leadsTrackingTagNames,
    leadsNonTrackingTags,
    stageTagNames,
    stageNonTrackingTags
  } = useTrackingFormatContext();

  // Dialog states
  const [showResponseTagsDialog, setShowResponseTagsDialog] = useState(false);
  const [showStageTagsDialog, setShowStageTagsDialog] = useState(false);

  // Build options: merge tracking + personal tags, fallback only when BOTH empty
  const combinedLeadsOptions = [...leadsTrackingTagNames, ...leadsNonTrackingTags] as ExtendedActionTaken[];
  const actionOptions = combinedLeadsOptions.length > 0 ? combinedLeadsOptions : EXTENDED_ACTIONS as ExtendedActionTaken[];
  const combinedStageOptions = [...stageTagNames, ...stageNonTrackingTags] as FunnelStage[];
  const stageOptions = combinedStageOptions.length > 0 ? combinedStageOptions : FUNNEL_STAGES as FunnelStage[];
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
    if (filters.stages.length === 0) return 'Retargeting';
    if (filters.stages.length === 1) return filters.stages[0];
    return `${filters.stages.length} Stages`;
  };
  const getActionsLabel = () => {
    if (filters.actions.length === 0) return 'Retargeting';
    if (filters.actions.length === 1) return filters.actions[0];
    return `${filters.actions.length} Responses`;
  };
  return <>
    <div className="flex items-center">
      <div className="flex gap-1.5 items-center">
        {/* Multi-select Stages Filter - only show if showStagesFilter is true */}
        {showStagesFilter && <Popover modal>
          <PopoverTrigger asChild>
            <Button data-onboarding="retargeting-btn" variant="outline" className={cn("h-9 w-auto text-xs shrink-0 justify-between gap-1 rounded-xl", filters.stages.length > 0 && "border-primary/50 bg-primary/5", !canRetarget && "opacity-60")}
              onClick={!canRetarget ? (e: React.MouseEvent) => { e.preventDefault(); toast.error('Upgrade your plan to use retargeting filters'); } : undefined}
            >
              {!canRetarget && <Lock className="h-3 w-3 mr-0.5" />}
              <span className="truncate">{getStagesLabel()}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          {canRetarget && <PopoverContent className="w-48 p-2 bg-popover border-border z-[100]" align="start" sideOffset={4}>
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
            <PopoverPrimitiveClose asChild>
              <Button variant="ghost" size="sm" className="w-full mt-2 h-8 text-xs gap-1 text-muted-foreground">
                <X className="h-3 w-3" />
                Close
              </Button>
            </PopoverPrimitiveClose>
          </PopoverContent>}
        </Popover>}

        {/* Multi-select Responses Filter - only show if showResponsesFilter is true */}
        {showResponsesFilter && <Popover modal>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("h-9 w-auto text-xs shrink-0 justify-between gap-1 rounded-xl", filters.actions.length > 0 && "border-primary/50 bg-primary/5", !canRetarget && "opacity-60")}
              onClick={!canRetarget ? (e: React.MouseEvent) => { e.preventDefault(); toast.error('Upgrade your plan to use retargeting filters'); } : undefined}
            >
              {!canRetarget && <Lock className="h-3 w-3 mr-0.5" />}
              <span className="truncate">{getActionsLabel()}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          {canRetarget && <PopoverContent className="w-48 p-2 bg-popover border-border z-[100]" align="start" sideOffset={4}>
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
            <PopoverPrimitiveClose asChild>
              <Button variant="ghost" size="sm" className="w-full mt-2 h-8 text-xs gap-1 text-muted-foreground">
                <X className="h-3 w-3" />
                Close
              </Button>
            </PopoverPrimitiveClose>
          </PopoverContent>}
        </Popover>}

        {/* Filter Tag button - inline with other controls (only on desktop) */}
        {!isMobile && filterTagButton}

        {hasFilters && <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9 px-2 text-xs shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <X className="h-3.5 w-3.5 sm:mr-1" />
          {!isMobile && 'Clear'}
        </Button>}
      </div>
    </div>

    {/* Tag Management Dialogs */}
    <ManageResponseTagsDialog open={showResponseTagsDialog} onOpenChange={setShowResponseTagsDialog} />
    <ManageStageTagsDialog open={showStageTagsDialog} onOpenChange={setShowStageTagsDialog} />
  </>;
}
