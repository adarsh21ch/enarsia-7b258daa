import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DataMode, ViewType } from '@/hooks/useTrackingModes';

interface ModeSelectorProps {
  dataMode: DataMode;
  viewType: ViewType;
  onDataModeChange: (mode: DataMode) => void;
  onViewTypeChange: (type: ViewType) => void;
}

export function ModeSelectors({
  dataMode,
  viewType,
  onDataModeChange,
  onViewTypeChange,
}: ModeSelectorProps) {
  return (
    <div className="flex gap-2 w-full">
      {/* Left pill: Personal / Total */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-full px-3 py-2',
              'text-xs font-semibold transition-colors',
              'bg-foreground text-background'
            )}
          >
            {dataMode === 'personal' ? 'Personal' : 'Total'}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-[120px]">
          <DropdownMenuItem
            onClick={() => onDataModeChange('personal')}
            className={cn(dataMode === 'personal' && 'font-bold')}
          >
            Personal
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDataModeChange('total')}
            className={cn(dataMode === 'total' && 'font-bold')}
          >
            Total
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Right pill: Leads / Funnels */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-full px-3 py-2',
              'text-xs font-semibold transition-colors',
              'bg-foreground text-background'
            )}
          >
            {viewType === 'leads' ? 'Leads' : 'Funnels'}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-[120px]">
          <DropdownMenuItem
            onClick={() => onViewTypeChange('leads')}
            className={cn(viewType === 'leads' && 'font-bold')}
          >
            Leads
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onViewTypeChange('funnel')}
            className={cn(viewType === 'funnel' && 'font-bold')}
          >
            Funnels
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
