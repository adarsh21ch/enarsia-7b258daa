import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TabType = 'calling' | 'funnel';

interface CallingFunnelTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  callingCount: number;
  funnelCount: number;
}

export function CallingFunnelTabs({ activeTab, onTabChange, callingCount, funnelCount }: CallingFunnelTabsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onTabChange('calling')}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200",
          activeTab === 'calling'
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Phone className="h-4 w-4" />
        <span>Calling</span>
        <span className={cn(
          "ml-1 text-xs px-2 py-0.5 rounded-full font-semibold",
          activeTab === 'calling'
            ? "bg-primary-foreground/20 text-primary-foreground"
            : "bg-primary/10 text-primary"
        )}>
          {callingCount}
        </span>
      </button>
      
      <button
        onClick={() => onTabChange('funnel')}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200",
          activeTab === 'funnel'
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Layers className="h-4 w-4" />
        <span>Filter</span>
        <span className={cn(
          "ml-1 text-xs px-2 py-0.5 rounded-full font-semibold",
          activeTab === 'funnel'
            ? "bg-primary-foreground/20 text-primary-foreground"
            : "bg-primary/10 text-primary"
        )}>
          {funnelCount}
        </span>
      </button>
    </div>
  );
}
