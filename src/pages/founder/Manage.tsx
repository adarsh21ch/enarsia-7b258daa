import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Megaphone, TrendingUp, SlidersHorizontal, Wallet, Scale, Users, AlertTriangle, ChevronRight, LayoutGrid } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { FOUNDER_FUNCTIONS, useFounderFunctions, type FounderFunctionKey, type FounderStatus } from '@/hooks/useFounderFunctions';
import { cn } from '@/lib/utils';

const ICONS: Record<FounderFunctionKey, React.ComponentType<{ className?: string }>> = {
  management: Compass,
  marketing: Megaphone,
  sales: TrendingUp,
  operations: SlidersHorizontal,
  accounts: Wallet,
  legal: Scale,
  hr: Users,
};

const STATUS_STYLES: Record<FounderStatus, { label: string; cls: string }> = {
  missing: { label: 'Missing', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
  inconsistent: { label: 'Inconsistent', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  consistent: { label: 'Consistent', cls: 'bg-primary/10 text-primary border-primary/30' },
};

export default function Manage() {
  const navigate = useNavigate();
  const { data } = useFounderFunctions();

  const counts = useMemo(() => {
    const c = { missing: 0, inconsistent: 0, consistent: 0 };
    if (!data) return c;
    for (const f of FOUNDER_FUNCTIONS) c[data[f.key].status]++;
    return c;
  }, [data]);

  const total = FOUNDER_FUNCTIONS.length;
  const health = Math.round(((counts.consistent + counts.inconsistent * 0.5) / total) * 100);

  return (
    <div className="h-screen min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><LayoutGrid className="h-4.5 w-4.5 text-primary" /></div>
        <div>
          <h1 className="text-lg font-bold leading-tight">Manage</h1>
          <p className="text-[11px] text-muted-foreground">Your business at a glance</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 space-y-5">
        {/* Business health */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">Business health</h2>
            <span className="text-2xl font-bold">{health}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${health}%` }} />
          </div>
          <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />{counts.consistent} consistent</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" />{counts.inconsistent} inconsistent</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" />{counts.missing} missing</span>
          </div>
        </section>

        {/* Today's focus = missing + inconsistent */}
        <section>
          <h3 className="text-sm font-semibold mb-2 px-1">Today's focus</h3>
          <div className="space-y-2">
            {FOUNDER_FUNCTIONS
              .filter((f) => data && data[f.key].status !== 'consistent')
              .slice(0, 6)
              .map((f) => {
                const Icon = ICONS[f.key];
                const status = data?.[f.key].status ?? 'missing';
                return (
                  <button
                    key={f.key}
                    onClick={() => navigate(`/manage/${f.key}`)}
                    className="w-full flex items-center gap-3 rounded-xl bg-card border border-border px-3 py-3 hover:bg-muted/40 transition"
                  >
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-medium">{f.label}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Needs attention
                      </div>
                    </div>
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', STATUS_STYLES[status].cls)}>
                      {STATUS_STYLES[status].label}
                    </span>
                  </button>
                );
              })}
          </div>
        </section>

        {/* All functions */}
        <section>
          <h3 className="text-sm font-semibold mb-2 px-1">Business functions</h3>
          <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
            {FOUNDER_FUNCTIONS.map((f) => {
              const Icon = ICONS[f.key];
              const status = data?.[f.key].status ?? 'missing';
              return (
                <button
                  key={f.key}
                  onClick={() => navigate(`/manage/${f.key}`)}
                  className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted/40 transition text-left"
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{f.label}</span>
                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border', STATUS_STYLES[status].cls)}>
                        {STATUS_STYLES[status].label}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{f.tagline}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
