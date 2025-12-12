import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Pencil, Check, X, Edit, Star } from 'lucide-react';
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
    getCustomOptionsForType,
    addOption,
    deleteOption,
    updateOption,
    updateFilterTagStatus,
    setActiveFilterTag,
    getActiveFilterTag
  } = useCustomOptionsContext();
  const [open, setOpen] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const customOptions = getCustomOptionsForType(columnType);
  const isResponseColumn = columnType === 'action_taken';
  const activeFilterTag = getActiveFilterTag();

  const handleAddOption = async () => {
    if (!newValue.trim()) return;
    setAdding(true);
    await addOption(columnType, newValue.trim());
    setNewValue('');
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (customOptions.length <= 1 && defaultOptions.length === 0) {
      return;
    }
    await deleteOption(id);
  };

  const handleStartEdit = (id: string, currentValue: string) => {
    setEditingId(id);
    setEditValue(currentValue);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editValue.trim()) return;
    if (updateOption) {
      await updateOption(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  // Toggle filter tag for custom options
  const handleToggleFilterTag = async (id: string, currentStatus: boolean) => {
    await updateFilterTagStatus(id, !currentStatus);
  };

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
                Only ONE tag can be the Filter tag. Toggle the star to set it. Works for both Tracking and Personal tags.
              </p>
            </div>
          )}

          {/* Tracking Tags section first - read-only but can set as filter tag */}
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

          {/* Divider */}
          <div className="border-t border-border/50 my-2" />

          {/* Personal Tags section - editable */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium mb-2">Personal tags</p>
            <p className="text-[10px] text-muted-foreground mb-2">Personal tags are for your convenience and are not counted in TrackUp analytics.</p>
            
            {/* Add new personal tag */}
            <div className="flex gap-2 mb-2">
              <Input 
                placeholder={`Add personal ${columnLabel.toLowerCase()} tag...`}
                value={newValue} 
                onChange={e => setNewValue(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleAddOption()} 
                className="flex-1" 
              />
              <Button size="sm" onClick={handleAddOption} disabled={!newValue.trim() || adding}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {customOptions.length > 0 ? customOptions.map(opt => (
                <div key={opt.id} className="flex items-center justify-between p-2.5 rounded-md bg-muted/20">
                  {editingId === opt.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input 
                        value={editValue} 
                        onChange={e => setEditValue(e.target.value)} 
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }} 
                        className="h-7 text-sm flex-1" 
                        autoFocus 
                      />
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50" 
                        onClick={handleSaveEdit}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-muted-foreground hover:text-foreground" 
                        onClick={handleCancelEdit}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{opt.option_value}</span>
                        {opt.is_filter_tag && (
                          <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Filter Tag Toggle - only for Response column */}
                        {isResponseColumn && (
                          <div className="flex items-center gap-1.5 mr-2 px-2 py-1 rounded bg-muted/50">
                            <Star className={cn(
                              "h-3 w-3",
                              opt.is_filter_tag ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                            )} />
                            <Switch
                              checked={opt.is_filter_tag || false}
                              onCheckedChange={() => handleToggleFilterTag(opt.id, opt.is_filter_tag || false)}
                              className="h-4 w-7"
                            />
                          </div>
                        )}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 text-muted-foreground hover:text-primary" 
                          onClick={() => handleStartEdit(opt.id, opt.option_value)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className={cn(
                            "h-7 w-7 text-destructive hover:text-destructive", 
                            customOptions.length <= 1 && defaultOptions.length === 0 && "opacity-50 cursor-not-allowed"
                          )} 
                          onClick={() => handleDelete(opt.id)} 
                          disabled={customOptions.length <= 1 && defaultOptions.length === 0}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
            )) : (
              <p className="text-xs text-muted-foreground italic py-2">
                No personal tags yet. Add one above!
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}