import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Trash2, Plus, Pencil, Check, X } from 'lucide-react';
import { useCustomOptionsContext } from '@/contexts/CustomOptionsContext';
import { OptionType } from '@/hooks/useCustomOptions';
import { cn } from '@/lib/utils';

interface ColumnOptionsSheetProps {
  columnType: OptionType;
  columnLabel: string;
  defaultOptions: readonly string[];
}

export function ColumnOptionsSheet({ columnType, columnLabel, defaultOptions }: ColumnOptionsSheetProps) {
  const { getCustomOptionsForType, addOption, deleteOption, updateOption } = useCustomOptionsContext();
  const [open, setOpen] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const customOptions = getCustomOptionsForType(columnType);

  const handleAddOption = async () => {
    if (!newValue.trim()) return;
    setAdding(true);
    await addOption(columnType, newValue.trim());
    setNewValue('');
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    // Prevent deleting the last tag
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button 
          className="p-0.5 rounded hover:bg-muted/50 transition-colors ml-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Settings className="h-3 w-3 text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage {columnLabel} Tags</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
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
                className="flex items-center justify-between p-2.5 rounded-md bg-muted/30"
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
                  className="flex items-center justify-between p-2.5 rounded-md bg-muted/30"
                >
                  {editingId === opt.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
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
                      <span className="text-sm">{opt.option_value}</span>
                      <div className="flex items-center gap-1">
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
              ))}
            </div>
          )}

          {customOptions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No custom tags yet. Add one above!
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
