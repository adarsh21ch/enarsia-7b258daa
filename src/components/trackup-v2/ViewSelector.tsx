import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ViewMode } from '@/hooks/useTrackingModes';

interface ViewSelectorProps {
  viewMode: ViewMode;
  options: { value: ViewMode; label: string }[];
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewSelector({ viewMode, options, onViewModeChange }: ViewSelectorProps) {
  const activeLabel = options.find((o) => o.value === viewMode)?.label || viewMode;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-3 py-1.5',
            'text-xs font-semibold transition-colors',
            'bg-accent text-accent-foreground border-accent'
          )}
        >
          {activeLabel}
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => onViewModeChange(opt.value)}
            className={cn(viewMode === opt.value && 'font-bold')}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
