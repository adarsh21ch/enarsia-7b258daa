import { BarChart3, Sparkles, Lightbulb, Flame, RefreshCw, Loader2 } from 'lucide-react';
import { CreatorTabLayout, CreatorEmptyState } from '@/components/creator/CreatorTabLayout';
import { Button } from '@/components/ui/button';
import { useNevInsights } from '@/hooks/useNevInsights';
import { useCreatorAccount } from '@/contexts/CreatorAccountContext';
import { cn } from '@/lib/utils';

export default function Insights() {
  const { activeAccountId } = useCreatorAccount();
  const { data, isLoading, isFetching, refresh } = useNevInsights(activeAccountId);

  return (
    <CreatorTabLayout title="Insights" subtitle="What's winning">
      {/* Nev Insights strip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold tracking-wide">Nev Insights</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] text-muted-foreground"
          onClick={() => refresh()}
          disabled={isFetching}
        >
          {isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        </Button>
      </div>

      <div className="-mx-4 px-4 overflow-x-auto scrollbar-none">
        <div className="flex gap-2.5 pb-1 snap-x">
          <InsightCard
            tint="amber"
            icon={Flame}
            headline={
              isLoading
                ? '…'
                : data?.bestFormat
                ? capitalize(data.bestFormat.format)
                : `${data?.postedCount ?? 0}/3`
            }
            body={
              isLoading
                ? 'Crunching your data…'
                : data?.bestFormat
                ? `Your ${data.bestFormat.format} posts lead — ${data.bestFormat.count} shipped, your top format.`
                : 'Post at least 3 pieces to unlock format insights.'
            }
            label="Best format"
          />
          <InsightCard
            tint="violet"
            icon={Lightbulb}
            headline={isLoading ? '…' : `${data?.untappedTotal ?? 0}`}
            body={
              isLoading
                ? 'Scanning your topics…'
                : data?.untappedTopCategory
                ? `You have ${data.untappedTopCategory.count} unscripted ideas in ${data.untappedTopCategory.name} — your most stocked category.`
                : "You're on top of your ideas — nothing sitting idle."
            }
            label="Untapped topics"
          />
          <InsightCard
            tint="emerald"
            icon={BarChart3}
            headline={isLoading ? '…' : `${data?.consistencyDays ?? 0}/30`}
            body={
              isLoading
                ? 'Measuring consistency…'
                : consistencyCopy(data?.consistencyDays ?? 0)
            }
            label="Consistency"
          />
        </div>
      </div>

      {/* Below — existing metrics empty state */}
      <CreatorEmptyState
        icon={BarChart3}
        headline="Know what's working"
        body="Log a post's numbers and get a Nev Score from the metrics that actually move reach in 2026. Winners feed Nev AI so tomorrow's ideas get smarter."
        bullets={[
          'Sends/shares + saves + retention + 3-sec hook hold-rate',
          'Screenshot → AI parse — upload your IG insights, auto-fill the row',
          'Manual entry — fast form fallback',
          'Each post gets a Nev Score; winners flagged for Nev AI',
        ]}
        cta="Add a post's insights"
      />
    </CreatorTabLayout>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function consistencyCopy(n: number) {
  if (n >= 20) return `Elite consistency — ${n}/30 days posted this month.`;
  if (n >= 10) return `Building momentum — ${n}/30 days posted. Aim for daily.`;
  return `${n}/30 days this month — small daily actions compound fast.`;
}

const TINTS = {
  amber: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
  violet: 'bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400',
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
} as const;

function InsightCard({
  tint,
  icon: Icon,
  headline,
  body,
  label,
}: {
  tint: keyof typeof TINTS;
  icon: React.ComponentType<{ className?: string }>;
  headline: string;
  body: string;
  label: string;
}) {
  return (
    <div className={cn('snap-start shrink-0 w-[240px] rounded-2xl border p-3', TINTS[tint])}>
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</span>
      </div>
      <p className="mt-1.5 text-xl font-bold leading-tight text-foreground">{headline}</p>
      <p className="mt-1 text-[11px] leading-snug text-foreground/80 line-clamp-3">{body}</p>
    </div>
  );
}
