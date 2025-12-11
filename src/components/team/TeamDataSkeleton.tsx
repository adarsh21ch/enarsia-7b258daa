import { Skeleton } from '@/components/ui/skeleton';

export function TeamDataSkeleton() {
  return (
    <div className="space-y-2 animate-in fade-in duration-300">
      {/* Row skeletons matching table structure */}
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div 
          key={i} 
          className="flex items-center gap-3 px-3 py-3 border-b border-border/50"
          style={{ animationDelay: `${i * 30}ms` }}
        >
          <Skeleton className="h-4 w-6 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function TeamCardSkeleton() {
  return (
    <div className="p-4 border border-border rounded-xl space-y-3 animate-in fade-in duration-300">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}

export function ActivitySkeleton() {
  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {[1, 2, 3, 4, 5].map((i) => (
        <div 
          key={i} 
          className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

export function ProspectTableSkeleton() {
  return (
    <div className="space-y-0 animate-in fade-in duration-200">
      {/* Table rows */}
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
        <div 
          key={i} 
          className="flex items-center gap-2 px-2 py-3 border-b border-border/40"
          style={{ animationDelay: `${i * 25}ms` }}
        >
          <Skeleton className="h-4 w-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-5 rounded" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function FunnelStageSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 animate-in fade-in duration-300">
      {[1, 2, 3].map((col) => (
        <div key={col} className="space-y-2">
          <Skeleton className="h-8 w-full rounded-lg" />
          {[1, 2, 3].map((row) => (
            <Skeleton 
              key={row} 
              className="h-6 w-full" 
              style={{ animationDelay: `${(col * 3 + row) * 30}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
