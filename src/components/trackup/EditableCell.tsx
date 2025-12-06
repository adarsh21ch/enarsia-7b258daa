import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  value: number | null;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function EditableCell({ value, onChange, className, disabled = false, placeholder = '0' }: EditableCellProps) {
  const [inputValue, setInputValue] = useState(value?.toString() ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value?.toString() ?? '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    setInputValue(e.target.value);
  };

  const handleBlur = () => {
    if (disabled) return;
    const numValue = parseInt(inputValue) || 0;
    if (numValue !== value) {
      onChange(numValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  if (disabled || value === null) {
    return (
      <div className={cn(
        "w-full h-8 px-1 flex items-center justify-center text-sm text-muted-foreground",
        className
      )}>
        {placeholder}
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      type="number"
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={cn(
        "w-full h-8 px-1 text-center text-sm bg-transparent border-none",
        "focus:outline-none focus:bg-muted/50 rounded",
        "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
        value === 0 ? "text-muted-foreground/50" : "text-foreground font-medium",
        className
      )}
      min={0}
    />
  );
}
