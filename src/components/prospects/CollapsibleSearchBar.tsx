import { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface CollapsibleSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  isCollapsed: boolean;
  onExpand: () => void;
  placeholder?: string;
  className?: string;
}

export function CollapsibleSearchBar({
  value,
  onChange,
  isCollapsed,
  onExpand,
  placeholder = "Search name, phone...",
  className,
}: CollapsibleSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Focus input when expanded via search icon
  useEffect(() => {
    if (!isCollapsed && inputRef.current) {
      // Small delay to ensure transition completes
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isCollapsed]);

  // On desktop, always show full search bar
  if (!isMobile) {
    return (
      <div className={cn("relative w-full", className)}>
        <div className="relative flex items-center bg-muted/50 rounded-xl border border-border/30 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-10 pl-9 pr-9 bg-transparent text-sm placeholder:text-muted-foreground/60 focus:outline-none rounded-xl"
          />
          {value && (
            <button
              onClick={() => onChange('')}
              className="absolute right-2 p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Mobile: Show collapsed icon button OR full search bar
  return (
    <div className={cn("relative", className)}>
      {/* Collapsed state: Just search icon button */}
      <div 
        className={cn(
          "transition-all duration-200 overflow-hidden",
          isCollapsed && !value ? "w-10 opacity-100" : "w-0 opacity-0 hidden"
        )}
      >
        <button
          onClick={onExpand}
          className="flex items-center justify-center h-10 w-10 rounded-xl bg-muted/50 border border-border/30 hover:bg-muted transition-colors"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Expanded state: Full search bar */}
      <div 
        className={cn(
          "transition-all duration-200 w-full",
          isCollapsed && !value ? "opacity-0 hidden" : "opacity-100"
        )}
      >
        <div className="relative flex items-center bg-muted/50 rounded-xl border border-border/30 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-10 pl-9 pr-9 bg-transparent text-sm placeholder:text-muted-foreground/60 focus:outline-none rounded-xl"
          />
          {value && (
            <button
              onClick={() => onChange('')}
              className="absolute right-2 p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
