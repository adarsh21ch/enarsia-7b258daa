import { useLeadLimit } from '@/hooks/useLeadLimit';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

interface LeadLimitCounterProps {
  onUpgrade?: () => void;
}

export function LeadLimitCounter({ onUpgrade }: LeadLimitCounterProps) {
  const { currentCount, limit, loading } = useLeadLimit();
  const { userTier } = useSubscription();

  // Only show for free/basic users
  if (loading || userTier === 'pro' || userTier === 'premium' || !limit) return null;

  const pct = Math.round((currentCount / limit) * 100);
  const isWarning = pct >= 80;
  const isMaxed = pct >= 100;
  const showUpgrade = pct >= 60;

  return (
    <div className={cn(
      "flex items-center justify-between px-3 py-1.5 text-xs rounded-lg mx-3 mt-1",
      isMaxed ? "bg-destructive/10 text-destructive" :
      isWarning ? "bg-orange-500/10 text-orange-600 dark:text-orange-400" :
      "bg-muted/60 text-muted-foreground"
    )}>
      <span className="font-medium">
        📊 {currentCount} / {maxLimit} free leads used
      </span>
      {showUpgrade && onUpgrade && (
        <button
          onClick={onUpgrade}
          className={cn(
            "flex items-center gap-1 font-semibold hover:underline",
            isMaxed ? "text-destructive" : "text-primary"
          )}
        >
          Upgrade for unlimited <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
