import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useRefresh } from '@/hooks/useRefresh';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function HeaderRefreshIcon() {
  const { softRefresh } = useRefresh();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await softRefresh();
    } finally {
      // Keep spinning for a brief moment for visual feedback
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="relative p-2 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50"
            aria-label="Refresh data"
          >
            <RefreshCw 
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                isRefreshing && "animate-spin"
              )} 
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Refresh</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

