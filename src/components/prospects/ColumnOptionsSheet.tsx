import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit, Star, Target, Lock } from 'lucide-react';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { OptionType } from '@/hooks/useCustomOptions';
import { cn } from '@/lib/utils';

interface ColumnOptionsSheetProps {
  columnType: OptionType;
  columnLabel: string;
  defaultOptions: readonly string[];
}

export function ColumnOptionsSheet({
  columnType,
  columnLabel,
  defaultOptions
}: ColumnOptionsSheetProps) {
  const {
    leadsTrackingTags,
    stageTags,
    isUsingLeaderFormat,
    rootLeaderName,
    isLeadsStageTag,
    isLeadsFinalTarget,
    isStageFinalTarget,
  } = useTrackingFormatContext();
  const [open, setOpen] = useState(false);

  const isResponseColumn = columnType === 'action_taken';
  const isStageColumn = columnType === 'funnel_stage';

  // Get tracking tags based on column type
  const trackingTags = isResponseColumn ? leadsTrackingTags : (isStageColumn ? stageTags : []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button 
          className="p-0.5 rounded hover:bg-muted/50 transition-colors ml-1" 
          onClick={e => e.stopPropagation()}
        >
          <Edit className="h-3 w-3 text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage {columnLabel} Tags</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          {/* Leader format notice */}
          {isUsingLeaderFormat && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
              <Lock className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Using {rootLeaderName}'s tracking format (read-only)
              </p>
            </div>
          )}

          {/* Legend for indicators */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {isResponseColumn && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                <span>Funnel Tag</span>
              </div>
            )}
            {isStageColumn && (
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3 text-emerald-500" />
                <span>Final Target</span>
              </div>
            )}
          </div>

          {/* Tracking Tags section - read-only display */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium mb-2">Tracking tags</p>
            {trackingTags.length > 0 ? trackingTags.map((tag, index) => {
              const tagName = typeof tag === 'string' ? tag : tag.name;
              const isStageTagFlag = isResponseColumn && isLeadsStageTag(tagName);
              const isFinal = isStageColumn && isStageFinalTarget(tagName);
              
              return (
                <div 
                  key={`${tagName}-${index}`} 
                  className="flex items-center justify-between p-2.5 rounded-md bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{tagName}</span>
                    {isStageTagFlag && (
                      <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        Funnel Tag
                      </span>
                    )}
                    {isFinal && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <Target className="h-3 w-3 text-emerald-500" />
                        Final
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground/60 italic">Tracking</span>
                </div>
              );
            }) : (
              <p className="text-xs text-muted-foreground italic p-2">
                No tracking tags configured. Add them in Profile → Leader's Tracking Format.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
