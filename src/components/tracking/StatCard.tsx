import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  colorClass?: string;
}

export function StatCard({ title, value, icon: Icon, description, colorClass }: StatCardProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 card-shadow hover:card-shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className={cn('text-2xl font-semibold mt-1', colorClass)}>{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className={cn('p-2 rounded-lg bg-muted', colorClass && 'bg-opacity-10')}>
          <Icon className={cn('h-5 w-5 text-muted-foreground', colorClass)} />
        </div>
      </div>
    </div>
  );
}
