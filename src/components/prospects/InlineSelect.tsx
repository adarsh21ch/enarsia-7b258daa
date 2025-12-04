import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface InlineSelectProps<T extends string> {
  value: T | null | undefined;
  options: readonly T[];
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
  renderValue?: (value: T) => React.ReactNode;
}

export function InlineSelect<T extends string>({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  className,
  renderValue,
}: InlineSelectProps<T>) {
  return (
    <Select
      value={value ?? ''}
      onValueChange={(v) => onChange(v as T)}
    >
      <SelectTrigger className={cn('h-8 text-xs border-0 bg-transparent hover:bg-muted focus:ring-1 focus:ring-accent/30', className)}>
        <SelectValue placeholder={placeholder}>
          {value && renderValue ? renderValue(value) : value || placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-popover border border-border z-50">
        {options.map((option) => (
          <SelectItem key={option} value={option} className="text-xs">
            {renderValue ? renderValue(option) : option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
