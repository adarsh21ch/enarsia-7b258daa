import { cn } from '@/lib/utils';

interface ProspectLimitBadgeProps {
  count: number;
  limit: number;
  isPro: boolean;
  isNearLimit: boolean;
}

export function ProspectLimitBadge({ count, limit, isPro, isNearLimit }: ProspectLimitBadgeProps) {
  if (isPro) {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
        Pro: Unlimited
      </span>
    );
  }

  return (
    <span
      className={cn(
        "text-xs px-2 py-1 rounded-full font-medium",
        isNearLimit
          ? "bg-amber-500/10 text-amber-600"
          : "bg-muted text-muted-foreground"
      )}
    >
      {count} / {limit} prospects
    </span>
  );
}
