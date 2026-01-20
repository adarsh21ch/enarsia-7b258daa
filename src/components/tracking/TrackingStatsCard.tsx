import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface TrackingStatsCardProps {
  label: string;
  value: number;
  icon?: LucideIcon;
  isFinalTarget?: boolean;
  variant?: 'default' | 'highlight' | 'muted';
  className?: string;
}

export function TrackingStatsCard({ 
  label, 
  value, 
  icon: Icon,
  isFinalTarget = false,
  variant = 'default',
  className 
}: TrackingStatsCardProps) {
  return (
    <div 
      className={cn(
        "p-4 rounded-xl border transition-all",
        variant === 'default' && "bg-card border-border/50",
        variant === 'highlight' && "bg-primary/5 border-primary/20",
        variant === 'muted' && "bg-muted/50 border-border/30",
        isFinalTarget && "ring-2 ring-primary/30 bg-primary/5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {Icon && (
            <Icon className={cn(
              "h-4 w-4 flex-shrink-0",
              isFinalTarget ? "text-primary" : "text-muted-foreground"
            )} />
          )}
          <span className={cn(
            "text-sm font-medium truncate",
            isFinalTarget ? "text-primary" : "text-muted-foreground"
          )}>
            {label}
            {isFinalTarget && <span className="ml-1">🎯</span>}
          </span>
        </div>
        <span className={cn(
          "text-2xl font-bold tabular-nums",
          isFinalTarget ? "text-primary" : "text-foreground"
        )}>
          {value}
        </span>
      </div>
    </div>
  );
}

interface TrackingStatsGridProps {
  children: React.ReactNode;
  className?: string;
}

export function TrackingStatsGrid({ children, className }: TrackingStatsGridProps) {
  return (
    <div className={cn("grid gap-3", className)}>
      {children}
    </div>
  );
}
