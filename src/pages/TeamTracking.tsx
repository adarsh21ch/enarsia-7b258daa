import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subMonths, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Users, ArrowLeft, BarChart3, Info, Crown, ChevronDown, ChevronUp, Activity, Columns3, ListChecks, PanelLeftClose, PanelLeftOpen, Menu, Bell, Send, Zap, Edit3 } from 'lucide-react';
import { InboxDrawer } from '@/components/layout/InboxDrawer';
import { SendMessageDrawer } from '@/components/layout/SendMessageDrawer';
import { useInbox } from '@/hooks/useInbox';
import { ManualUpdateDrawer } from '@/components/trackup-v2/ManualUpdateDrawer';
import { QuickUpdateModal } from '@/components/team-tracking/QuickUpdateModal';
import { EyeViewSheet } from '@/components/team-tracking/EyeViewSheet';
import { CompulsoryActionsSheet } from '@/components/team-tracking/CompulsoryActionsSheet';
import { CallingTrackingBox } from '@/components/team-tracking/CallingTrackingBox';
import { FilterTrackingBox } from '@/components/team-tracking/FilterTrackingBox';
import { CompareColumnsSheet } from '@/components/team-tracking/CompareColumnsSheet';
import { endOfMonth, startOfMonth } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useIsMobile } from '@/hooks/use-mobile';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

const SIDEBAR_WIDTH_KEY = 'enarsia.teamtracking.sidebar.width';
const SIDEBAR_COLLAPSED_KEY = 'enarsia.teamtracking.sidebar.collapsed';
const DEFAULT_SIDEBAR_WIDTH = 280;
const MIN_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 480;
const COLLAPSED_WIDTH = 56;

export default function TeamTracking() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const isMobile = useIsMobile();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selected, setSelected] = useState<SelectedEntity>({ kind: 'self_total' });
  const [collapsedLevels, setCollapsedLevels] = useState<Record<string, boolean>>({});
  const [eyeViewOpen, setEyeViewOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compulsoryOpen, setCompulsoryOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [quickUpdateOpen, setQuickUpdateOpen] = useState(false);
  const [manualUpdateOpen, setManualUpdateOpen] = useState(false);
  const { unreadCount } = useInbox();

  // Mobile drawer
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Desktop sidebar persistence
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_SIDEBAR_WIDTH;
    const stored = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));
    return stored && stored >= MIN_SIDEBAR_WIDTH && stored <= MAX_SIDEBAR_WIDTH ? stored : DEFAULT_SIDEBAR_WIDTH;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  });

  useEffect(() => { window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth)); }, [sidebarWidth]);
  useEffect(() => { window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0'); }, [sidebarCollapsed]);

  // Resize drag
  const draggingRef = useRef(false);
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const w = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, e.clientX));
      setSidebarWidth(w);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const monthYear = format(currentMonth, 'yyyy-MM');
  const monthLabel = format(currentMonth, 'MMMM yyyy');

  useEffect(() => {
    if (!user && !authLoading) navigate('/auth');
  }, [user, authLoading, navigate]);

  const {
    leadsTrackingTags, stageTags, leadsTrackingTagNames, stageTagNames,
  } = useTrackingFormatContext();

  const { getEffectiveConfig } = useFunnelConfig();
  const effectiveConfig = getEffectiveConfig();

  const { viewType, setViewType, viewMode, viewModeOptions, setViewMode } = useTrackingModes();
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('table');

  const {
    members, levels, loading: teamLoading,
  } = useLeaderTeamMembers(user?.id, profile?.email, profile?.neverai_id);

  const targetUserId = useMemo(() => {
    if (selected.kind === 'member') return selected.userId;
    return user?.id ?? null;
  }, [selected, user?.id]);

  const { snapshots: personalSnapshots } = usePersonalSnapshotV2Read(
    monthYear, leadsTrackingTagNames, stageTagNames, undefined, targetUserId,
  );
  const { snapshots: totalSnapshots } = useTotalSnapshotV2Read(
    monthYear, leadsTrackingTagNames, stageTagNames, targetUserId,
  );

  const isPersonalView =
    selected.kind === 'self_personal' ||
    (selected.kind === 'member' && selected.isPersonal);
  const activeSnapshots = isPersonalView ? personalSnapshots : totalSnapshots;

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
    setMobileSidebarOpen(false);
  }, []);

  const selectSelfTotal = useCallback(() => {
    setSelected({ kind: 'self_total' });
    setMobileSidebarOpen(false);
  }, []);
  const selectSelfPersonal = useCallback(() => {
    setSelected({ kind: 'self_personal' });
    setMobileSidebarOpen(false);
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

  // Sidebar contents (used by desktop full / desktop rail / mobile drawer)
  const renderSidebarBody = (mode: 'full' | 'rail') => {
    if (mode === 'rail') {
      return (
        <TooltipProvider delayDuration={200}>
          <div className="flex flex-col items-center gap-1 overflow-y-auto py-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={selectSelfTotal}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
                    selected.kind === 'self_total' ? 'bg-primary/15 text-primary' : 'hover:bg-muted/60',
                  )}
                >
                  <Crown className="h-4 w-4 text-amber-500" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">My Team Total</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={selectSelfPersonal}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
                    selected.kind === 'self_personal' ? 'bg-primary/15 text-primary' : 'hover:bg-muted/60',
                  )}
                >
                  <BarChart3 className="h-4 w-4 text-primary" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">My Personal</TooltipContent>
            </Tooltip>
            {members.length > 0 && <div className="my-1 h-px w-6 bg-border/60" />}
            {members.map(m => {
              const name = m.display_name || m.email || 'Member';
              const initials = name.slice(0, 2).toUpperCase();
              const active = selected.kind === 'member' && selected.userId === m.user_id;
              return (
                <Tooltip key={m.user_id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => selectMember(m, false)}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold transition-colors',
                        active ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' : 'bg-primary/15 text-primary hover:bg-primary/25',
                      )}
                    >
                      {initials}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{name}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      );
    }

    return (
      <div className="flex flex-col overflow-y-auto p-2 text-sm">
        <SidebarItem
          active={selected.kind === 'self_total'}
          onClick={selectSelfTotal}
          icon={<Crown className="h-3.5 w-3.5 text-amber-500" />}
          label="My Team Total"
          badge={members.length > 0 ? `+${members.length}` : undefined}
          sub="You + downline"
        />
        <SidebarItem
          active={selected.kind === 'self_personal'}
          onClick={selectSelfPersonal}
          icon={<BarChart3 className="h-3.5 w-3.5 text-primary" />}
          label="My Personal"
          sub="Your activity only"
        />
        <div className="my-2 border-t border-border/40" />

        {teamLoading && <p className="px-2 py-3 text-xs text-muted-foreground">Loading team…</p>}
        {!teamLoading && members.length === 0 && (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            No team members yet. Members who connect to you (via your email or Leader ID) will appear here.
          </div>
        )}

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
                  onSelect={selectMember}
                />
              ))}
            </div>
          );
        })}

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
                onSelect={selectMember}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const desktopWidth = sidebarCollapsed ? COLLAPSED_WIDTH : sidebarWidth;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen w-full bg-background">
        {/* Desktop sidebar */}
        {!isMobile && (
          <aside
            style={{ width: desktopWidth }}
            className="relative flex flex-shrink-0 flex-col border-r border-border/40 bg-card/95 backdrop-blur"
          >
            <div className="flex h-12 flex-shrink-0 items-center justify-between gap-2 border-b border-border/40 px-2">
              {!sidebarCollapsed && (
                <div className="flex min-w-0 items-center gap-2">
                  <Users className="h-4 w-4 flex-shrink-0 text-primary" />
                  <span className="truncate text-sm font-semibold">Team Tracking</span>
                </div>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() => setSidebarCollapsed(v => !v)}
                  >
                    {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex-1 overflow-hidden">
              {renderSidebarBody(sidebarCollapsed ? 'rail' : 'full')}
            </div>

            {!sidebarCollapsed && (
              <div className="flex-shrink-0 border-t border-border/40 px-3 py-2 text-[11px] text-muted-foreground">
                Top leader sees your entire downline rolled up via server triggers.
              </div>
            )}

            {/* Resize handle (only when expanded) */}
            {!sidebarCollapsed && (
              <div
                onMouseDown={startResize}
                className="absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize hover:bg-primary/20"
                title="Drag to resize"
              />
            )}
          </aside>
        )}

        {/* Mobile drawer */}
        {isMobile && (
          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetContent side="left" className="w-[85vw] max-w-[320px] p-0">
              <div className="flex h-12 items-center gap-2 border-b border-border/40 px-3">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Team Tracking</span>
              </div>
              <div className="h-[calc(100vh-3rem)] overflow-y-auto">
                {renderSidebarBody('full')}
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="sticky top-0 z-30 border-b border-border/40 bg-card/80 px-3 py-2 backdrop-blur">
            <div className="mx-auto w-full max-w-[1400px]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {isMobile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setMobileSidebarOpen(true)}
                    >
                      <Menu className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => navigate('/tracking')}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <img src={nevoraLogo} alt="Enarsia" className="h-8 w-8 flex-shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h1 className="truncate text-base font-bold">{headerTitle}</h1>
                      {selected.kind === 'self_total' && (
                        <Badge variant="secondary" className="h-5 flex-shrink-0 px-1.5 text-[10px]">Rollup</Badge>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">{headerSubtitle}</p>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="relative h-8 px-2"
                        onClick={() => setInboxOpen(true)}
                        aria-label="Inbox"
                      >
                        <Bell className="h-3.5 w-3.5 text-primary" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-1">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Inbox</TooltipContent>
                  </Tooltip>
                  {members.length > 0 && (
                    <HeaderButton
                      icon={<Send className="h-3.5 w-3.5 text-sky-500" />}
                      label="Message"
                      onClick={() => setSendOpen(true)}
                    />
                  )}
                  <HeaderButton
                    icon={<Zap className="h-3.5 w-3.5 text-amber-500" />}
                    label="Quick"
                    onClick={() => setQuickUpdateOpen(true)}
                  />
                  <HeaderButton
                    icon={<Edit3 className="h-3.5 w-3.5 text-violet-500" />}
                    label="Update"
                    onClick={() => setManualUpdateOpen(true)}
                  />
                  <HeaderButton
                    icon={<ListChecks className="h-3.5 w-3.5 text-amber-500" />}
                    label="Checklist"
                    onClick={() => setCompulsoryOpen(true)}
                  />
                  <HeaderButton
                    icon={<Columns3 className="h-3.5 w-3.5 text-primary" />}
                    label="Compare"
                    onClick={() => setCompareOpen(true)}
                  />
                  <HeaderButton
                    icon={<Activity className="h-3.5 w-3.5 text-emerald-500" />}
                    label="Activity"
                    onClick={() => setEyeViewOpen(true)}
                  />
                </div>
              </div>


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

              <div className="mt-2">
                <ModeSelectors
                  dataMode="personal"
                  viewType={viewType}
                  onDataModeChange={() => {}}
                  onViewTypeChange={setViewType}
                  hidePersonalTotal
                />
              </div>
            </div>
          </header>

          {/* Body */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-2 pb-24">
            <div className="mx-auto w-full min-w-0 max-w-[1400px]">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="truncate text-sm font-semibold">{monthLabel}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-shrink-0">
                  <ViewSelector viewMode={viewMode} options={viewModeOptions} onViewModeChange={setViewMode} />
                </div>
              </div>

              <div className="mb-3 grid min-w-0 grid-cols-1 gap-2 lg:grid-cols-2">
                <div className="min-w-0">
                  <CallingTrackingBox kpi={kpiData} responseTagNames={responseTagNames} />
                </div>
                <div className="min-w-0">
                  <FilterTrackingBox kpi={kpiData} stageTagNames={computedStageNames} />
                </div>
              </div>

              <div className="mb-3 min-w-0">
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

              <div key={layoutMode} className="min-w-0 animate-in fade-in duration-150">
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
            </div>
          </main>

          <BottomNav />
        </div>

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

        <InboxDrawer open={inboxOpen} onOpenChange={setInboxOpen} />

        <SendMessageDrawer
          open={sendOpen}
          onOpenChange={setSendOpen}
          membersOverride={members.map(m => ({
            user_id: m.user_id,
            display_name: m.display_name,
            level_id: m.level_id,
            level_position: m.level_position,
          }))}
          levelsOverride={levels.map(l => ({ id: l.id, position: l.position, label: l.label }))}
          preselectedMemberId={selected.kind === 'member' ? selected.userId : null}
        />
      </div>
    </TooltipProvider>
  );
}

interface HeaderButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}
function HeaderButton({ icon, label, onClick }: HeaderButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs md:px-2.5"
          onClick={onClick}
          aria-label={label}
        >
          {icon}
          <span className="hidden md:inline">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="md:hidden">{label}</TooltipContent>
    </Tooltip>
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
      <div className="min-w-0 flex-1">
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
  onSelect: (m: TeamMemberProfile, isPersonal: boolean) => void;
}
function MemberRow({ member, activeUserId, onSelect }: MemberRowProps) {
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
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">{name}</div>
        {member.email && <div className="truncate text-[10px] text-muted-foreground">{member.email}</div>}
      </div>
    </button>
  );
}
