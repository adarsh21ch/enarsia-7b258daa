import { Skeleton } from '@/components/ui/skeleton';

export function TeamDataSkeleton() {
  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Table header skeleton */}
      <div className="flex gap-2 px-2 py-3 bg-muted/30 rounded-lg">
        <Skeleton className="h-4 w-8" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-24" />
      </div>
      
      {/* Row skeletons */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div 
          key={i} 
          className="flex gap-2 px-2 py-3 border-b border-border/50"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <Skeleton className="h-4 w-6" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
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
