import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { OptionType, CustomOption } from '@/hooks/useCustomOptions';
import { Star } from 'lucide-react';

interface InlineSelectProps<T extends string> {
  value: T | null | undefined;
  options: readonly T[] | T[];
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
  renderValue?: (value: T) => React.ReactNode;
  // Tracking vs Non-tracking tags separation
  trackingOptions?: readonly string[];
  nonTrackingOptions?: readonly string[];
  personalOptions?: readonly string[];
  showTagSeparation?: boolean;
  finalTargetTag?: string | null;
  // Legacy props - kept for compatibility
  optionType?: OptionType;
  customOptions?: CustomOption[];
  onAddOption?: (optionType: OptionType, value: string) => Promise<any>;
  onDeleteOption?: (optionId: string) => Promise<boolean>;
  defaultOptions?: readonly string[];
  hideManagement?: boolean;
  hideAddNew?: boolean;
}

export function InlineSelect<T extends string>({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  className,
  renderValue,
  trackingOptions = [],
  nonTrackingOptions = [],
  personalOptions = [],
  showTagSeparation = false,
  finalTargetTag = null,
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

  // If showing separation, render grouped options
  const renderGroupedOptions = () => {
    if (!showTagSeparation) {
      return options.map((option) => (
        <SelectItem 
          key={option} 
          value={option} 
          className="text-xs min-h-[44px] sm:min-h-[32px] flex items-center"
        >
          <div className="flex items-center gap-2">
            {renderValue ? renderValue(option) : option}
          </div>
        </SelectItem>
      ));
    }

    return (
      <>
        {/* Tracking tags group */}
        {trackingOptions.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-[10px] text-muted-foreground/70 px-2 py-1">
              Tracking tags (for analytics)
            </SelectLabel>
            {trackingOptions.map((option) => (
              <SelectItem 
                key={option} 
                value={option as string} 
                className="text-xs min-h-[44px] sm:min-h-[32px] flex items-center"
              >
                <div className="flex items-center gap-2">
                  {renderValue ? renderValue(option as T) : option}
                  {finalTargetTag === option && (
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        
        {/* Separator */}
        {trackingOptions.length > 0 && (nonTrackingOptions.length > 0 || personalOptions.length > 0) && (
          <SelectSeparator className="my-1" />
        )}
        
        {/* Non-tracking tags group */}
        {nonTrackingOptions.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-[10px] text-muted-foreground/70 px-2 py-1">
              Non-tracking tags (not counted)
            </SelectLabel>
            {nonTrackingOptions.map((option) => (
              <SelectItem 
                key={option} 
                value={option as string} 
                className="text-xs min-h-[44px] sm:min-h-[32px] flex items-center"
              >
                <div className="flex items-center gap-2">
                  {renderValue ? renderValue(option as T) : option}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        
        {/* Personal/custom tags group */}
        {personalOptions.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-[10px] text-muted-foreground/70 px-2 py-1">
              Personal tags (only you see these)
            </SelectLabel>
            {personalOptions.map((option) => (
              <SelectItem 
                key={option} 
                value={option as string} 
                className="text-xs min-h-[44px] sm:min-h-[32px] flex items-center"
              >
                <div className="flex items-center gap-2">
                  {renderValue ? renderValue(option as T) : option}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {/* Fallback if both empty but options exist */}
        {trackingOptions.length === 0 && personalOptions.length === 0 && options.map((option) => (
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
      </>
    );
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
          {renderGroupedOptions()}
        </SelectContent>
      </Select>
    </div>
  );
}