import { Crown } from 'lucide-react';

export function FunnelsProBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-400 ${className}`}>
      <Crown className="h-3 w-3" />
      PRO
    </span>
  );
}
