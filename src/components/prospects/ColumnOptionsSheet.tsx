import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Edit, Star } from 'lucide-react';
import { useCustomOptionsContext } from '@/contexts/CustomOptionsContext';
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
    setActiveFilterTag,
    getActiveFilterTag
  } = useCustomOptionsContext();
  const [open, setOpen] = useState(false);

  const isResponseColumn = columnType === 'action_taken';
  const activeFilterTag = getActiveFilterTag();

  // Set filter tag for default (tracking) options
  const handleSetDefaultAsFilterTag = async (tagValue: string) => {
    if (activeFilterTag === tagValue) {
      // If already active, we could clear it, but for now just keep it
      return;
    }
    await setActiveFilterTag(tagValue);
  };

  const isDefaultTagActiveFilter = (tagValue: string) => {
    return activeFilterTag === tagValue;
  };

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
          {/* Filter tag hint - show at top for Response column */}
          {isResponseColumn && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900">
              <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                Only ONE tag can be the Filter tag. Toggle the star to set it.
              </p>
            </div>
          )}

          {/* Tracking Tags section - read-only but can set as filter tag */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium mb-2">Tracking tags</p>
            {defaultOptions.length > 0 ? defaultOptions.map(opt => (
              <div key={opt} className="flex items-center justify-between p-2.5 rounded-md bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{opt}</span>
                  {isResponseColumn && isDefaultTagActiveFilter(opt) && (
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Filter Tag Toggle for Tracking Tags - Response column only */}
                  {isResponseColumn && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50">
                      <Star className={cn(
                        "h-3 w-3",
                        isDefaultTagActiveFilter(opt) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                      )} />
                      <Switch
                        checked={isDefaultTagActiveFilter(opt)}
                        onCheckedChange={() => handleSetDefaultAsFilterTag(opt)}
                        className="h-4 w-7"
                      />
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground/60 italic">Tracking</span>
                </div>
              </div>
            )) : (
              <p className="text-xs text-muted-foreground italic p-2">No tracking tags configured. Add them in Profile → Leader & Tracking Tags.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
