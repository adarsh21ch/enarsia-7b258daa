import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subMonths, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Users, ArrowLeft, BarChart3, Info, Crown, ChevronDown, ChevronUp, Activity, Columns3, ListChecks } from 'lucide-react';
import { EyeViewSheet } from '@/components/team-tracking/EyeViewSheet';
import { CompulsoryActionsSheet } from '@/components/team-tracking/CompulsoryActionsSheet';
import { CallingTrackingBox } from '@/components/team-tracking/CallingTrackingBox';
import { FilterTrackingBox } from '@/components/team-tracking/FilterTrackingBox';
import { CompareColumnsSheet } from '@/components/team-tracking/CompareColumnsSheet';
import { endOfMonth, startOfMonth } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ModeSelectors } from '@/components/trackup-v2/ModeSelectors';
import { ViewSelector } from '@/components/trackup-v2/ViewSelector';
import { CollapsibleKPI } from '@/components/trackup-v2/CollapsibleKPI';
import { SummaryTable } from '@/components/trackup-v2/SummaryTable';
import { DateWiseTable } from '@/components/trackup-v2/DateWiseTable';
import { FunnelWiseTable } from '@/components/trackup-v2/FunnelWiseTable';
import { MonthlyTotalsTable } from '@/components/trackup-v2/MonthlyTotalsTable';
import { LayoutToggle, type LayoutMode } from '@/components/trackup-v2/LayoutToggle';
import { MetricCardView } from '@/components/trackup-v2/MetricCardView';
import { MetricChartView } from '@/components/trackup-v2/MetricChartView';
import { useTrackingModes } from '@/hooks/useTrackingModes';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { useFunnelConfig } from '@/hooks/useFunnelConfig';
import { usePersonalSnapshotV2Read } from '@/hooks/usePersonalSnapshotV2Read';
import { useTotalSnapshotV2Read } from '@/hooks/useTotalSnapshotV2Read';
import { useSnapshotV2ComputedData } from '@/hooks/useSnapshotV2ComputedData';
import { useLeaderTeamMembers, type TeamMemberProfile } from '@/hooks/useLeaderTeamMembers';
import nevoraLogo from '@/assets/nevorai-call-logo.png';

type SelectedEntity =
  | { kind: 'self_total' }
  | { kind: 'self_personal' }
  | { kind: 'member'; userId: string; displayName: string; isPersonal: boolean };

export default function TeamTracking() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selected, setSelected] = useState<SelectedEntity>({ kind: 'self_total' });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [collapsedLevels, setCollapsedLevels] = useState<Record<string, boolean>>({});
  const [eyeViewOpen, setEyeViewOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compulsoryOpen, setCompulsoryOpen] = useState(false);

  const monthYear = format(currentMonth, 'yyyy-MM');
  const monthLabel = format(currentMonth, 'MMMM yyyy');

  // Auth gate
  useEffect(() => {
    if (!user && !authLoading) navigate('/auth');
  }, [user, authLoading, navigate]);

  // Tracking format (tags from leader/own)
  const {
    leadsTrackingTags, stageTags, leadsTrackingTagNames, stageTagNames,
    leadsFinalTargetTag, stageFinalTargetTag,
  } = useTrackingFormatContext();

  const { getEffectiveConfig } = useFunnelConfig();
  const effectiveConfig = getEffectiveConfig();

  // View modes
  const { viewType, setViewType, viewMode, viewModeOptions, setViewMode } = useTrackingModes();
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('table');

  // Discover direct downline (dual-key)
  const {
    members, levels, loading: teamLoading,
  } = useLeaderTeamMembers(user?.id, profile?.email, profile?.neverai_id);

  // Resolve target user for snapshot reads
  const targetUserId = useMemo(() => {
    if (selected.kind === 'member') return selected.userId;
    return user?.id ?? null;
  }, [selected, user?.id]);

  // Read personal + total snapshots for the target user
  const { snapshots: personalSnapshots } = usePersonalSnapshotV2Read(
    monthYear, leadsTrackingTagNames, stageTagNames, undefined, targetUserId,
  );
  const { snapshots: totalSnapshots } = useTotalSnapshotV2Read(
    monthYear, leadsTrackingTagNames, stageTagNames, targetUserId,
  );

  // Pick which set to show based on selection mode
  const isPersonalView =
    selected.kind === 'self_personal' ||
    (selected.kind === 'member' && selected.isPersonal);
  const activeSnapshots = isPersonalView ? personalSnapshots : totalSnapshots;

  // Computed
  const {
    dailyMetrics, monthlyTotals, kpiData, funnelPeriods,
    responseTagNames, stageTagNames: computedStageNames, finalTagName,
  } = useSnapshotV2ComputedData(
    activeSnapshots,
    leadsTrackingTags,
    stageTags,
    effectiveConfig?.funnel_length ?? 3,
    effectiveConfig?.day_1_start ?? null,
    monthYear,
  );

  // Group members by level
  const membersByLevel = useMemo(() => {
    const groups = new Map<string, TeamMemberProfile[]>();
    const unleveled: TeamMemberProfile[] = [];
    members.forEach(m => {
      if (m.level_id) {
        if (!groups.has(m.level_id)) groups.set(m.level_id, []);
        groups.get(m.level_id)!.push(m);
      } else {
        unleveled.push(m);
      }
    });
    return { groups, unleveled };
  }, [members]);

  const toggleLevel = (id: string) =>
    setCollapsedLevels(s => ({ ...s, [id]: !s[id] }));

  const selectMember = useCallback((m: TeamMemberProfile, isPersonal: boolean) => {
    setSelected({
      kind: 'member',
      userId: m.user_id,
      displayName: m.display_name || m.email || 'Member',
      isPersonal,
    });
  }, []);

  if (!user) return null;

  const headerTitle =
    selected.kind === 'self_total' ? 'My Team Total' :
    selected.kind === 'self_personal' ? 'My Personal' :
    selected.displayName;

  const headerSubtitle =
    selected.kind === 'self_total' ? 'You + entire downline (rolled up)' :
    selected.kind === 'self_personal' ? 'Your own activity only' :
    selected.kind === 'member' && selected.isPersonal ? 'Member personal activity' :
    'Member + their downline (rolled up)';

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-72 border-r border-border/40 bg-card/95 backdrop-blur transition-transform md:relative md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-12 items-center justify-between border-b border-border/40 px-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Team Tracking</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex h-[calc(100vh-3rem-4rem)] flex-col overflow-y-auto p-2 text-sm">
          {/* My Totals */}
          <SidebarItem
            active={selected.kind === 'self_total'}
            onClick={() => setSelected({ kind: 'self_total' })}
            icon={<Crown className="h-3.5 w-3.5 text-amber-500" />}
            label="My Team Total"
            badge={members.length > 0 ? `+${members.length}` : undefined}
            sub="You + downline"
          />
          <SidebarItem
            active={selected.kind === 'self_personal'}
            onClick={() => setSelected({ kind: 'self_personal' })}
            icon={<BarChart3 className="h-3.5 w-3.5 text-primary" />}
            label="My Personal"
            sub="Your activity only"
          />

          <div className="my-2 border-t border-border/40" />

          {teamLoading && (
            <p className="px-2 py-3 text-xs text-muted-foreground">Loading team…</p>
          )}

          {!teamLoading && members.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground">
              No team members yet. Members who connect to you (via your email or Leader ID) will appear here.
            </div>
          )}

          {/* Level groups */}
          {levels.map(lv => {
            const group = membersByLevel.groups.get(lv.id) || [];
            if (group.length === 0) return null;
            const collapsed = collapsedLevels[lv.id];
            return (
              <div key={lv.id} className="mb-1">
                <button
                  className="flex w-full items-center justify-between rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted/50"
                  onClick={() => toggleLevel(lv.id)}
                >
                  <span className="truncate">{lv.label} <span className="opacity-50">· {group.length}</span></span>
                  {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                </button>
                {!collapsed && group.map(m => (
                  <MemberRow
                    key={m.user_id}
                    member={m}
                    activeUserId={selected.kind === 'member' ? selected.userId : null}
                    isPersonalSelected={selected.kind === 'member' && selected.isPersonal}
                    onSelect={selectMember}
                  />
                ))}
              </div>
            );
          })}

          {/* Unleveled members */}
          {membersByLevel.unleveled.length > 0 && (
            <div className="mb-1">
              {levels.length > 0 && (
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                  Other <span className="opacity-50">· {membersByLevel.unleveled.length}</span>
                </div>
              )}
              {membersByLevel.unleveled.map(m => (
                <MemberRow
                  key={m.user_id}
                  member={m}
                  activeUserId={selected.kind === 'member' ? selected.userId : null}
                  isPersonalSelected={selected.kind === 'member' && selected.isPersonal}
                  onSelect={selectMember}
                />
              ))}
            </div>
          )}
        </div>

        <div className="h-16 border-t border-border/40 px-3 py-2 text-[11px] text-muted-foreground">
          Top leader sees your entire downline rolled up via server triggers.
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col md:pl-0">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border/40 bg-card/80 px-3 py-2 backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Users className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigate('/tracking')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <img src={nevoraLogo} alt="Enarsia" className="h-8 w-8 rounded-lg object-cover" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-base font-bold">{headerTitle}</h1>
                  {selected.kind === 'self_total' && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">Rollup</Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{headerSubtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs"
                onClick={() => setCompulsoryOpen(true)}
              >
                <ListChecks className="h-3.5 w-3.5 text-amber-500" />
                <span className="hidden sm:inline">Checklist</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs"
                onClick={() => setCompareOpen(true)}
              >
                <Columns3 className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Compare</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs"
                onClick={() => setEyeViewOpen(true)}
              >
                <Activity className="h-3.5 w-3.5 text-emerald-500" />
                <span className="hidden sm:inline">Activity</span>
              </Button>
            </div>
          </div>

          {/* Personal/Total toggle for selected member */}
          {selected.kind === 'member' && (
            <div className="mt-2 flex gap-1 rounded-lg bg-muted p-0.5">
              <button
                onClick={() => setSelected({ ...selected, isPersonal: false })}
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  !selected.isPersonal ? 'bg-background shadow-sm' : 'text-muted-foreground',
                )}
              >
                Team Total
              </button>
              <button
                onClick={() => setSelected({ ...selected, isPersonal: true })}
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  selected.isPersonal ? 'bg-background shadow-sm' : 'text-muted-foreground',
                )}
              >
                Personal Only
              </button>
            </div>
          )}

          {/* Leads/Funnel selectors */}
          <div className="mt-2">
            <ModeSelectors
              dataMode="personal"
              viewType={viewType}
              onDataModeChange={() => {}}
              onViewTypeChange={setViewType}
              hidePersonalTotal
            />
          </div>
        </header>

        {/* Body */}
        <main className="flex-1 overflow-y-auto px-3 py-2 pb-24">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold">{monthLabel}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <ViewSelector viewMode={viewMode} options={viewModeOptions} onViewModeChange={setViewMode} />
          </div>

          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <CallingTrackingBox
              kpi={kpiData}
              responseTagNames={responseTagNames}
            />
            <FilterTrackingBox
              kpi={kpiData}
              stageTagNames={computedStageNames}
            />
          </div>

          <div className="mb-3">
            <CollapsibleKPI
              kpi={kpiData}
              responseTagNames={responseTagNames}
              stageTagNames={computedStageNames}
              viewType={viewType}
            />
          </div>

          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Activity</h3>
              <Info className="h-3 w-3 text-muted-foreground/60" />
            </div>
            <LayoutToggle value={layoutMode} onChange={setLayoutMode} />
          </div>

          <div key={layoutMode} className="animate-in fade-in duration-150">
            {layoutMode === 'table' && (
              <>
                {viewMode === 'summary' && (
                  <SummaryTable
                    dailyMetrics={dailyMetrics}
                    responseTagNames={responseTagNames}
                    stageTagNames={computedStageNames}
                    finalTagName={finalTagName}
                  />
                )}
                {viewMode === 'date-wise' && (
                  <DateWiseTable
                    dailyMetrics={dailyMetrics}
                    responseTagNames={responseTagNames}
                    finalTagName={finalTagName}
                  />
                )}
                {viewMode === 'funnel-wise' && (
                  <FunnelWiseTable
                    funnelPeriods={funnelPeriods}
                    stageTagNames={computedStageNames}
                    finalTagName={finalTagName}
                  />
                )}
                {viewMode === 'monthly-totals' && (
                  <MonthlyTotalsTable
                    totals={monthlyTotals}
                    responseTagNames={responseTagNames}
                    stageTagNames={computedStageNames}
                    finalTagName={finalTagName}
                    monthLabel={monthLabel}
                  />
                )}
              </>
            )}
            {layoutMode === 'card' && (
              <MetricCardView
                dailyMetrics={dailyMetrics}
                responseTagNames={responseTagNames}
                stageTagNames={computedStageNames}
                finalTagName={finalTagName}
              />
            )}
            {layoutMode === 'chart' && (
              <MetricChartView
                dailyMetrics={dailyMetrics}
                responseTagNames={responseTagNames}
                stageTagNames={computedStageNames}
                finalTagName={finalTagName}
              />
            )}
          </div>
        </main>

        <BottomNav />
      </div>

      {/* Backdrop for mobile drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <EyeViewSheet
        open={eyeViewOpen}
        onOpenChange={setEyeViewOpen}
        rootLeaderUserId={user.id}
        rootLeaderName={profile?.display_name || 'You'}
      />

      <CompareColumnsSheet
        open={compareOpen}
        onOpenChange={setCompareOpen}
        members={members}
        monthStart={format(startOfMonth(currentMonth), 'yyyy-MM-dd')}
        monthEnd={format(endOfMonth(currentMonth), 'yyyy-MM-dd')}
        monthLabel={monthLabel}
        responseTagNames={responseTagNames}
        stageTagNames={computedStageNames}
        finalTagName={finalTagName}
      />

      <CompulsoryActionsSheet
        open={compulsoryOpen}
        onOpenChange={setCompulsoryOpen}
        leaderUserId={user.id}
        members={members}
        levels={levels}
      />
    </div>
  );
}

interface SidebarItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub?: string;
  badge?: string;
}
function SidebarItem({ active, onClick, icon, label, sub, badge }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors',
        active ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50',
      )}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium">{label}</span>
          {badge && <span className="rounded bg-primary/15 px-1 text-[10px] text-primary">{badge}</span>}
        </div>
        {sub && <div className="truncate text-[10px] text-muted-foreground">{sub}</div>}
      </div>
    </button>
  );
}

interface MemberRowProps {
  member: TeamMemberProfile;
  activeUserId: string | null;
  isPersonalSelected: boolean;
  onSelect: (m: TeamMemberProfile, isPersonal: boolean) => void;
}
function MemberRow({ member, activeUserId, isPersonalSelected, onSelect }: MemberRowProps) {
  const active = activeUserId === member.user_id;
  const name = member.display_name || member.email || 'Unnamed';
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <button
      onClick={() => onSelect(member, false)}
      className={cn(
        'mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
        active ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50',
      )}
    >
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="truncate text-xs font-medium">{name}</div>
        {member.email && <div className="truncate text-[10px] text-muted-foreground">{member.email}</div>}
      </div>
    </button>
  );
}
