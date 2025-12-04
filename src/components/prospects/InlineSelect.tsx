import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OptionType, CustomOption } from '@/hooks/useCustomOptions';

interface InlineSelectProps<T extends string> {
  value: T | null | undefined;
  options: readonly T[] | T[];
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
  renderValue?: (value: T) => React.ReactNode;
  // Custom option management
  optionType?: OptionType;
  customOptions?: CustomOption[];
  onAddOption?: (optionType: OptionType, value: string) => Promise<any>;
  onDeleteOption?: (optionId: string) => Promise<boolean>;
  defaultOptions?: readonly string[];
}

export function InlineSelect<T extends string>({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  className,
  renderValue,
  optionType,
  customOptions = [],
  onAddOption,
  onDeleteOption,
  defaultOptions = [],
}: InlineSelectProps<T>) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [manageOpen, setManageOpen] = useState(false);

  const handleAddNew = async () => {
    if (!newValue.trim() || !optionType || !onAddOption) return;
    
    const result = await onAddOption(optionType, newValue.trim());
    if (result) {
      setNewValue('');
      setIsAddingNew(false);
      // Auto-select the new option
      onChange(newValue.trim() as T);
    }
  };

  const handleDeleteCustom = async (optionId: string, optionValue: string) => {
    if (!onDeleteOption) return;
    
    const confirmed = window.confirm(`Delete "${optionValue}"? This won't affect existing prospects.`);
    if (confirmed) {
      await onDeleteOption(optionId);
    }
  };

  // Check if an option is custom (not in default list)
  const isCustomOption = (opt: string) => {
    return !defaultOptions.includes(opt);
  };

  const canManageOptions = optionType && onAddOption;

  return (
    <div className="flex items-center gap-1">
      <Select
        value={value ?? ''}
        onValueChange={(v) => {
          if (v === '__add_new__') {
            setIsAddingNew(true);
          } else {
            onChange(v as T);
          }
        }}
      >
        <SelectTrigger className={cn('h-8 text-xs border-0 bg-transparent hover:bg-muted focus:ring-1 focus:ring-accent/30', className)}>
          <SelectValue placeholder={placeholder}>
            {value && renderValue ? renderValue(value) : value || placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover border border-border z-50 max-h-[300px]">
          {options.map((option) => (
            <SelectItem key={option} value={option} className="text-xs">
              <div className="flex items-center gap-2">
                {renderValue ? renderValue(option) : option}
              </div>
            </SelectItem>
          ))}
          
          {/* Add new option */}
          {canManageOptions && (
            <SelectItem value="__add_new__" className="text-xs text-accent border-t border-border mt-1 pt-1">
              <div className="flex items-center gap-1.5">
                <Plus className="h-3 w-3" />
                <span>Add new...</span>
              </div>
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      {/* Manage button for custom options */}
      {canManageOptions && customOptions.length > 0 && (
        <Popover open={manageOpen} onOpenChange={setManageOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Settings2 className="h-3 w-3 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48 p-2 bg-popover border-border z-50">
            <p className="text-xs font-medium text-muted-foreground mb-2">Custom options</p>
            <div className="space-y-1">
              {customOptions.map((opt) => (
                <div key={opt.id} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-muted">
                  <span>{opt.option_value}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteCustom(opt.id, opt.option_value)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Add new dialog */}
      {isAddingNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsAddingNew(false)}>
          <div className="bg-card rounded-lg border border-border p-4 w-[280px] shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-medium mb-3">Add new option</p>
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Enter option name..."
              className="h-9 text-sm mb-3"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddNew();
                if (e.key === 'Escape') setIsAddingNew(false);
              }}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setIsAddingNew(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddNew} disabled={!newValue.trim()}>
                Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
