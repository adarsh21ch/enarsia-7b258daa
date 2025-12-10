import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Trash2, Plus } from 'lucide-react';
import { useCustomOptionsContext } from '@/contexts/CustomOptionsContext';

type OptionType = 'funnel_stage' | 'action_taken' | 'prospect_status' | 'priority';

interface ColumnOptionsSheetProps {
  columnType: OptionType;
  columnLabel: string;
  defaultOptions: readonly string[];
}

export function ColumnOptionsSheet({ columnType, columnLabel, defaultOptions }: ColumnOptionsSheetProps) {
  const { getCustomOptionsForType, addOption, deleteOption } = useCustomOptionsContext();
  const [open, setOpen] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [adding, setAdding] = useState(false);

  const customOptions = getCustomOptionsForType(columnType);

  const handleAddOption = async () => {
    if (!newValue.trim()) return;
    setAdding(true);
    await addOption(columnType, newValue.trim());
    setNewValue('');
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    await deleteOption(id);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button 
          className="p-0.5 rounded hover:bg-muted/50 transition-colors ml-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Settings className="h-3 w-3 text-muted-foreground" />
        </button>
      </SheetTrigger>
      <SheetContent className="w-[320px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Manage {columnLabel} Tags</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {/* Add new option */}
          <div className="flex gap-2">
            <Input
              placeholder={`Add new ${columnLabel.toLowerCase()}...`}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
              className="flex-1"
            />
            <Button 
              size="sm" 
              onClick={handleAddOption}
              disabled={!newValue.trim() || adding}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Default options (non-editable) */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium mb-2">Default Tags</p>
            {defaultOptions.map((opt) => (
              <div 
                key={opt}
                className="flex items-center justify-between p-2 rounded-md bg-muted/30"
              >
                <span className="text-sm">{opt}</span>
                <span className="text-xs text-muted-foreground">Default</span>
              </div>
            ))}
          </div>

          {/* Custom options (editable) */}
          {customOptions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium mb-2">Custom Tags</p>
              {customOptions.map((opt) => (
                <div 
                  key={opt.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/30"
                >
                  <span className="text-sm">{opt.option_value}</span>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(opt.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {customOptions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No custom tags yet. Add one above!
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
