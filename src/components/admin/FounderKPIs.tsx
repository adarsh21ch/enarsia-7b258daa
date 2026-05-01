import { useRetentionAnalytics, AdminAnalytics } from '@/hooks/useAdminAnalytics';
import { Activity, Database, Upload, Phone, TrendingUp, Users, Sparkles } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface FounderKPIsProps {
  analytics: AdminAnalytics;
}

export function FounderKPIs({ analytics }: FounderKPIsProps) {
  const { data: retention, isLoading } = useRetentionAnalytics();

  const dau = retention?.dau ?? analytics.neveraiTodayActive;
  const wau = retention?.wau ?? analytics.neveraiWeekActive;
  const mau = retention?.mau ?? 0;
  const dauMauRatio = mau > 0 ? Math.round((dau / mau) * 100) : 0;

  const todayLeads = analytics.todayLeads;
  const weekLeads = analytics.weekLeads;
  const monthLeads = analytics.monthLeads;
  const importersToday = analytics.activeUsage.leadsImportersToday;
  const importersWeek = analytics.activeUsage.leadsImportersWeek;
  const callersToday = analytics.activeUsage.activeCallersToday;

  const leadsPerImporter = importersToday > 0 ? Math.round(todayLeads / importersToday) : 0;
  const callerImporterRatio = importersToday > 0 ? Math.round((callersToday / importersToday) * 100) : 0;

  return (
    <div className="space-y-2">
      {/* Hero Founder KPIs - 2 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* MAU hero card */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 to-primary/4 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-wide">Active Users</span>
            </div>
            <span className="text-[10px] text-muted-foreground">DAU / WAU / MAU</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold font-heading text-foreground tabular-nums">
                  {dau.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">DAU</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/50">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Weekly</p>
                  <p className="text-lg font-bold tabular-nums">{wau.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Monthly</p>
                  <p className="text-lg font-bold tabular-nums">{mau.toLocaleString()}</p>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground mt-2">
                Stickiness (DAU/MAU): <span className="font-semibold text-foreground">{dauMauRatio}%</span>
                {dauMauRatio >= 20 && <span className="text-emerald-600 ml-1">healthy</span>}
                {dauMauRatio < 20 && dauMauRatio > 0 && <span className="text-amber-600 ml-1">low</span>}
              </p>
            </>
          )}
        </div>

        {/* Lead imports hero card */}
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 to-emerald-500/4 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                Leads Added
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">Today / Wk / Mo</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold font-heading text-foreground tabular-nums">
              {todayLeads.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">today</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/50">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">This Week</p>
              <p className="text-lg font-bold tabular-nums">{weekLeads.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">This Month</p>
              <p className="text-lg font-bold tabular-nums">{monthLeads.toLocaleString()}</p>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground mt-2">
            All-time total: <span className="font-semibold text-foreground tabular-nums">
              {analytics.totalLeads.toLocaleString()}
            </span>
          </p>
        </div>
      </div>

      {/* Activity Strip - importers, callers, ratios */}
      <div className="grid grid-cols-3 gap-2">
        <ActivityCell
          icon={<Upload className="h-3.5 w-3.5 text-blue-500" />}
          label="Importers today"
          value={importersToday}
          sub={`${importersWeek} this wk`}
        />
        <ActivityCell
          icon={<Phone className="h-3.5 w-3.5 text-green-500" />}
          label="Callers today"
          value={callersToday}
          sub={`${analytics.activeUsage.activeCallersWeek} this wk`}
        />
        <ActivityCell
          icon={<TrendingUp className="h-3.5 w-3.5 text-purple-500" />}
          label="Leads / importer"
          value={leadsPerImporter}
          sub={`${callerImporterRatio}% also call`}
        />
      </div>

      {/* Founder Insight Strip */}
      <FounderInsight
        analytics={analytics}
        dau={dau}
        mau={mau}
        importersToday={importersToday}
        callersToday={callersToday}
        todayLeads={todayLeads}
      />
    </div>
  );
}

function ActivityCell({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-muted-foreground truncate">{label}</span>
      </div>
      <p className="text-base font-bold tabular-nums leading-tight">{value.toLocaleString?.() ?? value}</p>
      <p className="text-[9px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function FounderInsight({
  analytics,
  dau,
  mau,
  importersToday,
  callersToday,
  todayLeads,
}: {
  analytics: AdminAnalytics;
  dau: number;
  mau: number;
  importersToday: number;
  callersToday: number;
  todayLeads: number;
}) {
  // Generate the most actionable insight
  const insights: string[] = [];

  const totalUsers = analytics.totalSignups;
  const activationRate = totalUsers > 0 ? Math.round((mau / totalUsers) * 100) : 0;
  const importActivation = dau > 0 ? Math.round((importersToday / dau) * 100) : 0;

  if (totalUsers > 0 && activationRate < 15) {
    insights.push(
      `Only ${activationRate}% of signups (${mau}/${totalUsers}) are active monthly — activation is your biggest leak.`
    );
  }
  if (dau > 0 && importActivation < 30) {
    insights.push(
      `${importActivation}% of today's active users imported leads — push first-import onboarding harder.`
    );
  }
  if (importersToday > 0 && callersToday < importersToday * 0.5) {
    insights.push(
      `${callersToday} callers vs ${importersToday} importers today — users add leads but don't call. Send a "start calling" nudge.`
    );
  }
  if (todayLeads > 0 && analytics.activeProUsers > 0 && analytics.totalLeads > 0) {
    const proRatio = Math.round((analytics.activeProUsers / totalUsers) * 100);
    if (proRatio < 3) {
      insights.push(
        `Pro conversion is ${proRatio}% — your free→pro funnel needs better upgrade triggers near the 100-lead limit.`
      );
    }
  }
  if (insights.length === 0) {
    insights.push('All key ratios look healthy. Focus next on increasing daily lead imports per active user.');
  }

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
      <div className="flex items-start gap-2">
        <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">
            Founder Insight
          </p>
          <ul className="space-y-1">
            {insights.slice(0, 2).map((insight, i) => (
              <li key={i} className="text-[11px] text-foreground/90 leading-relaxed">
                • {insight}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
