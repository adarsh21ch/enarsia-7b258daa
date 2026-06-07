import { LayoutGrid, Table2, Trello } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type PeopleViewMode = 'card' | 'table';

interface ViewSwitcherProps {
  value: PeopleViewMode;
  onChange: (v: PeopleViewMode) => void;
  disableTable?: boolean;
  className?: string;
}

export function ViewSwitcher({ value, onChange, disableTable, className }: ViewSwitcherProps) {
  const btn = (active: boolean) =>
    cn(
      'h-7 w-7 rounded-md flex items-center justify-center transition-all',
      active
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
    );

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          'inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/40 border border-border/40',
          className,
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Card view"
              onClick={() => onChange('card')}
              className={btn(value === 'card')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Card view</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Table view"
              disabled={disableTable}
              onClick={() => !disableTable && onChange('table')}
              className={cn(btn(value === 'table'), disableTable && 'opacity-40 cursor-not-allowed')}
            >
              <Table2 className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {disableTable ? 'Table view requires a wider screen' : 'Table view'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Kanban view"
              disabled
              className={cn(btn(false), 'opacity-40 cursor-not-allowed')}
            >
              <Trello className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Kanban — coming soon</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
