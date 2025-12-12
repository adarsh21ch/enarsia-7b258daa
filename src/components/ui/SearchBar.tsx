import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ 
  value, 
  onChange, 
  placeholder = "Search name, phone...",
  className 
}: SearchBarProps) {
  return (
    <div className={cn(
      "relative w-full",
      className
    )}>
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
