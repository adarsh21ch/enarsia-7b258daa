import { Table2, LayoutGrid, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LayoutMode = 'table' | 'card' | 'chart';

interface LayoutToggleProps {
  value: LayoutMode;
  onChange: (mode: LayoutMode) => void;
  className?: string;
}

const OPTIONS: Array<{ value: LayoutMode; icon: typeof Table2; label: string }> = [
  { value: 'table', icon: Table2, label: 'Table view' },
  { value: 'card', icon: LayoutGrid, label: 'Card view' },
  { value: 'chart', icon: BarChart3, label: 'Chart view' },
];

/**
 * Segmented icon toggle for switching between Table / Card / Chart layouts.
 * Selected option uses primary color; others use muted-foreground.
 */
export function LayoutToggle({ value, onChange, className }: LayoutToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Display layout"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-border/60 bg-card p-0.5',
        className,
      )}
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={selected}
            aria-label={opt.label}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center justify-center h-7 w-8 rounded-md transition-colors',
              selected
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
