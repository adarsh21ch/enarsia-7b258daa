import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { OptionType, CustomOption } from '@/hooks/useCustomOptions';

interface InlineSelectProps<T extends string> {
  value: T | null | undefined;
  options: readonly T[] | T[];
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
  renderValue?: (value: T) => React.ReactNode;
  // Custom option management (kept for compatibility but not used for inline add)
  optionType?: OptionType;
  customOptions?: CustomOption[];
  onAddOption?: (optionType: OptionType, value: string) => Promise<any>;
  onDeleteOption?: (optionId: string) => Promise<boolean>;
  defaultOptions?: readonly string[];
  // Hide management UI (for use in table cells where management is in column header)
  hideManagement?: boolean;
  // Hide "Add new" option entirely (for tracking tags that must use configured values only)
  hideAddNew?: boolean;
}

export function InlineSelect<T extends string>({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  className,
  renderValue,
}: InlineSelectProps<T>) {
  // Handle selection - allow toggling (selecting same value deselects it)
  const handleValueChange = (v: string) => {
    if (v === value) {
      // Toggle off - same value selected again, clear it
      onChange('' as T);
    } else {
      onChange(v as T);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Select
        value={value ?? ''}
        onValueChange={handleValueChange}
      >
        <SelectTrigger 
          className={cn(
            'h-9 sm:h-8 text-xs border-0 bg-transparent hover:bg-muted/50 focus:ring-1 focus:ring-border/30 focus:bg-transparent min-w-[70px]',
            className
          )}
        >
          <SelectValue placeholder={placeholder}>
            {value && renderValue ? renderValue(value) : value || placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent 
          className="bg-popover border border-border z-[100] max-h-[280px] overflow-y-auto"
          position="popper"
          sideOffset={4}
          align="start"
        >
          {options.map((option) => (
            <SelectItem 
              key={option} 
              value={option} 
              className="text-xs min-h-[44px] sm:min-h-[32px] flex items-center"
            >
              <div className="flex items-center gap-2">
                {renderValue ? renderValue(option) : option}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}