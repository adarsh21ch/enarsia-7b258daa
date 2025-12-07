import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  isRefreshing: boolean;
  pullDistance: number;
  showIndicator: boolean;
}

export function PullToRefreshIndicator({ isRefreshing, pullDistance, showIndicator }: PullToRefreshIndicatorProps) {
  if (!showIndicator) return null;

  return (
    <div 
      className={cn(
        "absolute left-0 right-0 flex justify-center transition-all duration-200 z-10 pointer-events-none",
        isRefreshing ? "top-2" : "top-0"
      )}
      style={{ 
        transform: isRefreshing ? 'none' : `translateY(${Math.min(pullDistance - 30, 30)}px)`,
        opacity: isRefreshing ? 1 : Math.min(pullDistance / 80, 1)
      }}
    >
      <div className={cn(
        "bg-card border border-border/50 rounded-full p-2 shadow-lg",
        isRefreshing && "animate-pulse"
      )}>
        <Loader2 className={cn(
          "h-5 w-5 text-primary",
          isRefreshing && "animate-spin"
        )} />
      </div>
    </div>
  );
}
