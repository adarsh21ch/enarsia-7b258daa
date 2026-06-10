import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subMonths, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Users, Settings, Info, BarChart3, HelpCircle, Sparkles } from 'lucide-react';
import { AIInsightsSettings } from '@/components/ai/AIInsightsSettings';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { TrialBanner } from '@/components/subscription/TrialBanner';
import { UpgradeButton } from '@/components/subscription/UpgradeButton';
import { SubscriptionStatusBanner } from '@/components/subscription/SubscriptionStatusBanner';
import { Button } from '@/components/ui/button';
import { ModeSelectors } from '@/components/trackup-v2/ModeSelectors';
import { ViewSelector } from '@/components/trackup-v2/ViewSelector';
import { CollapsibleKPI } from '@/components/trackup-v2/CollapsibleKPI';
import { SummaryTable } from '@/components/trackup-v2/SummaryTable';
import { DateWiseTable } from '@/components/trackup-v2/DateWiseTable';
import { FunnelWiseTable } from '@/components/trackup-v2/FunnelWiseTable';
import { MonthlyTotalsTable } from '@/components/trackup-v2/MonthlyTotalsTable';
import { ManualUpdateDrawer } from '@/components/trackup-v2/ManualUpdateDrawer';
import { FloatingUpdateButton } from '@/components/trackup-v2/FloatingUpdateButton';
import { TrackingSettingsDialog } from '@/components/trackup-v2/TrackingSettingsDialog';
import { FunnelConfigDialog } from '@/components/trackup-v2/FunnelConfigDialog';
import { LayoutToggle, type LayoutMode } from '@/components/trackup-v2/LayoutToggle';
import { MetricCardView } from '@/components/trackup-v2/MetricCardView';
import { MetricChartView } from '@/components/trackup-v2/MetricChartView';
import { TrackingGuideSheet } from '@/components/tracking/TrackingGuideSheet';
import { usePersonalTagMetrics } from '@/hooks/usePersonalTagMetrics';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTrackingModes } from '@/hooks/useTrackingModes';
import { usePersonalSnapshotV2Read } from '@/hooks/usePersonalSnapshotV2Read';
import { useTotalSnapshotV2Read } from '@/hooks/useTotalSnapshotV2Read';
import { useSnapshotV2ComputedData } from '@/hooks/useSnapshotV2ComputedData';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { useTrackingSourcePreferences } from '@/hooks/useTrackingSourcePreferences';
import { useApplicationTotalSnapshots } from '@/hooks/useApplicationTotalSnapshots';
import { useApplicationSnapshots } from '@/hooks/useApplicationSnapshots';
import { useFunnelConfig } from '@/hooks/useFunnelConfig';
import { useProfile } from '@/hooks/useProfile';
import { useLeaderTeamMembers } from '@/hooks/useLeaderTeamMembers';

import nevoraLogo from '@/assets/nevorai-call-logo.png';

export default function Tracking() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  // Direct-downline count for the Team Tracking entry badge in the header.
  // Dual-key discovery is identical to the Team Tracking page itself, so the
  // react-query/state cache is shared and warm by the time the user opens it.
  const { members: teamMembers } = useLeaderTeamMembers(
    user?.id,
    profile?.email,
    profile?.neverai_id,
  );
  const downlineCount = teamMembers?.length ?? 0;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showUpdateDrawer, setShowUpdateDrawer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [showFunnelConfig, setShowFunnelConfig] = useState(false);

  // Layout mode (Table / Card / Chart) — persisted per data mode (personal vs total)
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(() => {
    if (typeof window === 'undefined') return 'table';
    const stored = window.localStorage.getItem('nevorai-trackup-layout');
    return stored === 'card' || stored === 'chart' || stored === 'table' ? stored : 'table';
  });
  const setLayoutMode = useCallback((m: LayoutMode) => {
    setLayoutModeState(m);
    try {
      window.localStorage.setItem('nevorai-trackup-layout', m);
    } catch {
      /* ignore storage errors */
    }
  }, []);


  const monthYear = format(currentMonth, 'yyyy-MM');
  const personalTagData = usePersonalTagMetrics(monthYear);
  const monthLabel = format(currentMonth, 'MMMM yyyy');

  // Tracking modes (Personal/Total, Leads/Funnel, view mode)
  const {
    dataMode, viewType, viewMode, viewModeOptions,
    setDataMode, setViewType, setViewMode,
  } = useTrackingModes();

  // Mobile single-user view: force Personal mode (Total is for team/upline only)
  useEffect(() => {
    if (dataMode !== 'personal') setDataMode('personal');
  }, [dataMode, setDataMode]);

  // Tracking format (tags from leader/own)
  const {
    leadsTrackingTags, stageTags, leadsTrackingTagNames, stageTagNames,
    leadsFinalTargetTag, stageFinalTargetTag, directLeaderUserId,
  } = useTrackingFormatContext();

  // Source preference
  const { personalSource, teamSource } = useTrackingSourcePreferences();

  // Funnel config
  const { config: ownFunnelConfig, loading: funnelConfigLoading, getEffectiveConfig, isReadOnly: funnelConfigReadOnly } = useFunnelConfig();
  const effectiveConfig = getEffectiveConfig();

  // Auto-prompt when user switches to Funnel view and hasn't configured their funnel yet.
  // Skip when read-only (leader-controlled) — the leader's config is inherited.
  const funnelNotConfigured = !funnelConfigReadOnly && (!ownFunnelConfig?.day_1_start || !ownFunnelConfig?.funnel_length);
  useEffect(() => {
    if (viewType === 'funnel' && !funnelConfigLoading && funnelNotConfigured) {
      setShowFunnelConfig(true);
    }
  }, [viewType, funnelConfigLoading, funnelNotConfigured]);

  // Read snapshots — when source is AUTO, compute from prospects table directly
  const { snapshots: manualSnapshots } = usePersonalSnapshotV2Read(monthYear, leadsTrackingTagNames, stageTagNames);
  const { snapshots: appSnapshots } = useApplicationSnapshots(
    monthYear, leadsTrackingTagNames, stageTagNames, leadsFinalTargetTag, stageFinalTargetTag,
  );
  const personalSnapshots = personalSource === 'AUTO' ? appSnapshots : manualSnapshots;

  const { snapshots: manualTotalSnapshots } = useTotalSnapshotV2Read(monthYear, leadsTrackingTagNames, stageTagNames);
  const { snapshots: autoTotalSnapshots } = useApplicationTotalSnapshots(
    monthYear, leadsTrackingTagNames, stageTagNames, leadsFinalTargetTag, stageFinalTargetTag,
  );
  const totalSnapshots = teamSource === 'AUTO' ? autoTotalSnapshots : manualTotalSnapshots;

  // Pick active snapshots based on data mode
  const activeSnapshots = dataMode === 'personal' ? personalSnapshots : totalSnapshots;

  // Pick tags based on view type
  const activeResponseTags = leadsTrackingTags;
  const activeStageTags = stageTags;
  const activeTagNames = viewType === 'leads' ? leadsTrackingTagNames : stageTagNames;
  const activeFinalTag = viewType === 'leads' ? leadsFinalTargetTag : stageFinalTargetTag;

  // Computed data
  const {
    dailyMetrics, monthlyTotals, kpiData, funnelPeriods,
    responseTagNames, stageTagNames: computedStageNames, finalTagName,
  } = useSnapshotV2ComputedData(
    activeSnapshots,
    activeResponseTags,
    activeStageTags,
    effectiveConfig?.funnel_length ?? 3,
    effectiveConfig?.day_1_start ?? null,
    monthYear,
  );

  // Auth redirect
  useEffect(() => {
    if (!user && !authLoading) navigate('/auth');
  }, [user, authLoading, navigate]);

  // Open in-app Team Tracking
  const handleOpenDashboard = useCallback(() => {
    navigate('/team-tracking');
  }, [navigate]);

  if (!user) return null;

  return (
    <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <img src={nevoraLogo} alt="Enarsia Logo" className="h-9 w-9 rounded-xl object-cover shadow-sm" />
            <div>
              <h1 className="text-lg font-bold tracking-tight">Tracking</h1>
              <p className="text-[11px] text-muted-foreground font-medium">Track Your Numbers</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenDashboard}
              className="h-8 gap-1.5 text-xs font-medium"
              aria-label={downlineCount > 0 ? `Open Team Tracking — ${downlineCount} downline member${downlineCount === 1 ? '' : 's'}` : 'Open Team Tracking'}
            >
              <Users className="h-3.5 w-3.5" />
              Team Tracking
              {downlineCount > 0 && (
                <span
                  className="ml-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold bg-primary/15 text-primary"
                  aria-hidden="true"
                >
                  {downlineCount}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowGuide(true)}
              className="h-8 w-8"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
              className="h-8 w-8"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mode selectors — Personal/Total hidden on mobile (single-user view); only Leads/Funnel shown */}
        <div className="px-4 pb-3">
          <ModeSelectors
            dataMode={dataMode}
            viewType={viewType}
            onDataModeChange={setDataMode}
            onViewTypeChange={setViewType}
            hidePersonalTotal
          />
        </div>
      </header>

      <main className="scrollable-content">
        <div className="container py-2 px-3 pb-24">
          <SubscriptionStatusBanner className="mb-3" />
          <TrialBanner tabId="tracking" className="mb-3" />
          <UpgradeButton tabId="tracking" variant="prominent" />

          {/* View header row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold">{monthLabel}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <ViewSelector viewMode={viewMode} options={viewModeOptions} onViewModeChange={setViewMode} />
          </div>

          {/* Collapsible KPI */}
          <div className="mb-3">
            <CollapsibleKPI kpi={kpiData} responseTagNames={responseTagNames} stageTagNames={computedStageNames} viewType={viewType} />
          </div>

          {/* Total Activity Section Header + Layout Toggle */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Activity
              </h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    Shows total actions done in selected period.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <LayoutToggle value={layoutMode} onChange={setLayoutMode} />
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">All actions done so far</p>

          {/* Active view — table sub-views, or card/chart layouts */}
          <div data-onboarding="trackup-table" key={layoutMode} className="animate-in fade-in slide-in-from-bottom-1 duration-150">
            {layoutMode === 'table' && (
              <>
                {viewMode === 'summary' && (
                  <SummaryTable
                    dailyMetrics={dailyMetrics}
                    responseTagNames={responseTagNames}
                    stageTagNames={computedStageNames}
                    finalTagName={finalTagName}
                    personalTagData={personalTagData}
                  />
                )}
                {viewMode === 'date-wise' && (
                  <DateWiseTable
                    dailyMetrics={dailyMetrics}
                    responseTagNames={responseTagNames}
                    finalTagName={finalTagName}
                    personalTagData={personalTagData}
                  />
                )}
                {viewMode === 'funnel-wise' && (
                  <FunnelWiseTable
                    funnelPeriods={funnelPeriods}
                    stageTagNames={computedStageNames}
                    finalTagName={finalTagName}
                    personalTagData={personalTagData}
                  />
                )}
                {viewMode === 'monthly-totals' && (
                  <MonthlyTotalsTable
                    totals={monthlyTotals}
                    responseTagNames={responseTagNames}
                    stageTagNames={computedStageNames}
                    finalTagName={finalTagName}
                    monthLabel={monthLabel}
                    personalTagData={personalTagData}
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
                personalTagData={personalTagData}
              />
            )}
            {layoutMode === 'chart' && (
              <MetricChartView
                dailyMetrics={dailyMetrics}
                responseTagNames={responseTagNames}
                stageTagNames={computedStageNames}
                finalTagName={finalTagName}
                personalTagData={personalTagData}
              />
            )}
          </div>

          {/* AI Insights — relocated from Profile */}
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">AI Insights</h3>
            </div>
            <button
              onClick={() => setShowAIInsights(true)}
              className="w-full rounded-xl px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-between transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <span className="font-medium text-sm block">Trackers & AI Coaching</span>
                  <span className="text-[11px] text-muted-foreground">Configure metrics tracked by AI on your data</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <p className="text-[11px] text-muted-foreground mt-2">
              Notification preferences live in Profile → App Notifications.
            </p>
          </div>

        </div>
      </main>

      {/* FAB */}
      <FloatingUpdateButton onClick={() => setShowUpdateDrawer(true)} />

      {/* Manual Update Drawer */}
      <ManualUpdateDrawer
        open={showUpdateDrawer}
        onOpenChange={setShowUpdateDrawer}
        responseTagNames={leadsTrackingTagNames}
        stageTagNames={stageTagNames}
        finalTagName={stageFinalTargetTag}
        personalSnapshots={personalSnapshots}
        totalSnapshots={totalSnapshots}
        uplineLeaderId={directLeaderUserId}
      />

      {/* Tracking Settings Dialog */}
      <TrackingSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        onEditFunnelConfig={() => { setShowSettings(false); setShowFunnelConfig(true); }}
      />
      <FunnelConfigDialog
        open={showFunnelConfig}
        onOpenChange={setShowFunnelConfig}
        required={viewType === 'funnel' && funnelNotConfigured}
      />
      <TrackingGuideSheet open={showGuide} onOpenChange={setShowGuide} />
      <AIInsightsSettings open={showAIInsights} onOpenChange={setShowAIInsights} hideGlobalToggles />

      <BottomNav />
    </div>
  );
}
