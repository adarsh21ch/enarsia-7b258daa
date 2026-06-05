import { ChevronDown, Phone, Layers, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TopTabBar } from '@/components/ui/TopTabBar';
import type { DataMode, ViewType } from '@/hooks/useTrackingModes';

interface ModeSelectorProps {
  dataMode: DataMode;
  viewType: ViewType;
  onDataModeChange: (mode: DataMode) => void;
  onViewTypeChange: (type: ViewType) => void;
  /** Hide the Personal/Total toggle (mobile single-user view). */
  hidePersonalTotal?: boolean;
}

export function ModeSelectors({
  dataMode,
  viewType,
  onDataModeChange,
  onViewTypeChange,
  hidePersonalTotal = false,
}: ModeSelectorProps) {
  return (
    <div className="space-y-2 w-full">
      {/* Personal / Total toggle — hidden on mobile single-user view */}
      {!hidePersonalTotal && (
        <div className="flex gap-2">
          <button
            onClick={() => onDataModeChange('personal')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5',
              'text-xs font-semibold transition-colors border',
              dataMode === 'personal'
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-muted/50 text-muted-foreground border-border/30 hover:bg-muted'
            )}
          >
            <User className="h-3.5 w-3.5" />
            Personal
          </button>
          <button
            onClick={() => onDataModeChange('total')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5',
              'text-xs font-semibold transition-colors border',
              dataMode === 'total'
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-muted/50 text-muted-foreground border-border/30 hover:bg-muted'
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Total
          </button>
        </div>
      )}

      {/* Leads / Funnels - TopTabBar style */}
      <TopTabBar
        options={[
          { value: 'leads', label: 'Leads', icon: Phone },
          { value: 'funnel', label: 'Funnel', icon: Layers },
        ]}
        value={viewType}
        onChange={(v) => onViewTypeChange(v as ViewType)}
      />
    </div>
  );
}
