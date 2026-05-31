import { useMemo } from 'react';
import { BarChart3, Sparkles, Lightbulb, Flame, RefreshCw, Loader2, FileText, PenLine, Send, CalendarDays, CheckCircle2, Target } from 'lucide-react';
import { CreatorTabLayout } from '@/components/creator/CreatorTabLayout';
import { Button } from '@/components/ui/button';
import { useNevInsights } from '@/hooks/useNevInsights';
import { useCreatorAccount } from '@/contexts/CreatorAccountContext';
import { useContentIdeas } from '@/hooks/useContentIdeas';
import { useContentPieces } from '@/hooks/useContentPieces';
import { useContentCategories } from '@/hooks/useContentCategories';
import { usePostingWeeklyStats } from '@/hooks/usePostingTasks';
import { cn } from '@/lib/utils';

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function Insights() {
  const { activeAccountId } = useCreatorAccount();
  const { data, isLoading, isFetching, refresh } = useNevInsights(activeAccountId);
  const { ideas } = useContentIdeas(activeAccountId);
  const { pieces } = useContentPieces(activeAccountId);
  const { categories } = useContentCategories();
  const posting = usePostingWeeklyStats();

  const stats = useMemo(() => {
    const totalTopics = ideas.length;
    const totalScripted = ideas.filter((i) => i.status === 'scripted' || i.status === 'done').length;
    const totalPosted = pieces.filter((p) => p.stage === 'posted').length;

    // posts this week (last 7 days)
    const sevenAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const postsThisWeek = pieces.filter((p) => {
      if (p.stage !== 'posted') return false;
      const ts = p.posted_date
        ? new Date(p.posted_date).getTime()
        : p.posted_at ? new Date(p.posted_at).getTime() : 0;
      return ts >= sevenAgo;
    }).length;

    // current streak from posted_date
    const postedSet = new Set<string>();
    for (const p of pieces) {
      if (p.stage !== 'posted') continue;
      const d = p.posted_date || (p.posted_at ? toLocalISO(new Date(p.posted_at)) : null);
      if (d) postedSet.add(d);
    }
    let currentStreak = 0;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() - i);
      if (postedSet.has(toLocalISO(d))) currentStreak++;
      else break;
    }

    // by category
    const catCounts = new Map<string | null, number>();
    for (const i of ideas) catCounts.set(i.category_id ?? null, (catCounts.get(i.category_id ?? null) || 0) + 1);
    const byCategory = [...catCounts.entries()]
      .map(([id, count]) => ({
        name: id ? (categories.find((c) => c.id === id)?.name || 'Uncategorized') : 'Uncategorized',
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return { totalTopics, totalScripted, totalPosted, postsThisWeek, currentStreak, byCategory };
  }, [ideas, pieces, categories]);

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
            tint="amber" icon={Flame} label="Best format"
            headline={isLoading ? '…' : data?.bestFormat ? capitalize(data.bestFormat.format) : `${data?.postedCount ?? 0}/3`}
            body={
              isLoading ? 'Crunching your data…'
                : data?.bestFormat
                  ? `Your ${data.bestFormat.format} posts lead — ${data.bestFormat.count} shipped, your top format.`
                  : 'Post at least 3 pieces to unlock format insights.'
            }
          />
          <InsightCard
            tint="violet" icon={Lightbulb} label="Untapped topics"
            headline={isLoading ? '…' : `${data?.untappedTotal ?? 0}`}
            body={
              isLoading ? 'Scanning your topics…'
                : data?.untappedTopCategory
                  ? `You have ${data.untappedTopCategory.count} unscripted ideas in ${data.untappedTopCategory.name} — your most stocked category.`
                  : "You're on top of your ideas — nothing sitting idle."
            }
          />
          <InsightCard
            tint="emerald" icon={BarChart3} label="Consistency"
            headline={isLoading ? '…' : `${data?.consistencyDays ?? 0}/30`}
            body={isLoading ? 'Measuring consistency…' : consistencyCopy(data?.consistencyDays ?? 0)}
          />
        </div>
      </div>

      {/* Real stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard icon={Lightbulb} label="Total topics" value={stats.totalTopics} />
        <StatCard icon={PenLine} label="Scripted" value={stats.totalScripted} />
        <StatCard icon={Send} label="Posted" value={stats.totalPosted} />
        <StatCard icon={CalendarDays} label="Posts this week" value={stats.postsThisWeek} />
        <StatCard icon={Flame} label="Current streak" value={`${stats.currentStreak}d`} tint="emerald" />
        <StatCard icon={FileText} label="Categories" value={categories.length} />
        <StatCard
          icon={CheckCircle2}
          label="Daily tasks done (7d)"
          value={posting.loading ? '…' : `${posting.done}${posting.expected ? `/${posting.expected}` : ''}`}
          tint="emerald"
        />
        <StatCard
          icon={Target}
          label="Completion rate"
          value={posting.loading ? '…' : posting.expected ? `${posting.rate}%` : '—'}
          tint="violet"
        />
      </div>

      {/* Topics by category */}
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2.5">Topics by category</p>
        {stats.byCategory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No topics yet.</p>
        ) : (
          <div className="space-y-2">
            {stats.byCategory.map((c) => {
              const pct = stats.totalTopics ? Math.round((c.count / stats.totalTopics) * 100) : 0;
              return (
                <div key={c.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium truncate">{c.name}</span>
                    <span className="text-muted-foreground tabular-nums">{c.count} · {pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CreatorTabLayout>
  );
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
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
  tint, icon: Icon, headline, body, label,
}: {
  tint: keyof typeof TINTS;
  icon: React.ComponentType<{ className?: string }>;
  headline: string; body: string; label: string;
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

function StatCard({
  icon: Icon, label, value, tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number | string; tint?: keyof typeof TINTS;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-3">
      <div className="flex items-center gap-1.5">
        <Icon className={cn('h-3.5 w-3.5', tint ? TINTS[tint].split(' ').slice(-2).join(' ') : 'text-muted-foreground')} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold leading-tight tabular-nums">{value}</p>
    </div>
  );
}
