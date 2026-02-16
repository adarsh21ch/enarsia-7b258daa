import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subMonths, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, ExternalLink, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { TrialBanner } from '@/components/subscription/TrialBanner';
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
import { useTrackingModes } from '@/hooks/useTrackingModes';
import { usePersonalSnapshotV2Read } from '@/hooks/usePersonalSnapshotV2Read';
import { useTotalSnapshotV2Read } from '@/hooks/useTotalSnapshotV2Read';
import { useSnapshotV2ComputedData } from '@/hooks/useSnapshotV2ComputedData';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { useTrackingSourcePreferences } from '@/hooks/useTrackingSourcePreferences';
import { useApplicationTotalSnapshots } from '@/hooks/useApplicationTotalSnapshots';
import { useApplicationSnapshots } from '@/hooks/useApplicationSnapshots';
import { useFunnelConfig } from '@/hooks/useFunnelConfig';
import { NEVORAI_WEBSITE_URL } from '@/config/siteUrl';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

export default function Tracking() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showUpdateDrawer, setShowUpdateDrawer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  

  const monthYear = format(currentMonth, 'yyyy-MM');
  const monthLabel = format(currentMonth, 'MMMM yyyy');

  // Tracking modes (Personal/Total, Leads/Funnel, view mode)
  const {
    dataMode, viewType, viewMode, viewModeOptions,
    setDataMode, setViewType, setViewMode,
  } = useTrackingModes();

  // Tracking format (tags from leader/own)
  const {
    leadsTrackingTags, stageTags, leadsTrackingTagNames, stageTagNames,
    leadsFinalTargetTag, stageFinalTargetTag, directLeaderUserId,
  } = useTrackingFormatContext();

  // Source preference
  const { personalSource, teamSource } = useTrackingSourcePreferences();

  // Funnel config
  const { getEffectiveConfig } = useFunnelConfig();
  const effectiveConfig = getEffectiveConfig();

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

  // Open team tracking on website
  const handleOpenDashboard = useCallback(() => {
    window.open(`${NEVORAI_WEBSITE_URL}/trackup`, '_blank', 'noopener');
  }, []);

  if (!user) return null;

  return (
    <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={nevoraLogo} alt="NevorAI Logo" className="h-10 w-10 rounded-xl object-cover shadow-md" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Track Up</h1>
              <p className="text-xs text-muted-foreground font-medium">Track Your Numbers</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenDashboard}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Team Tracking
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

        {/* Mode selectors */}
        <div className="px-4 pb-3">
          <ModeSelectors
            dataMode={dataMode}
            viewType={viewType}
            onDataModeChange={setDataMode}
            onViewTypeChange={setViewType}
          />
        </div>

        {/* Active mode status strip */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-4 pb-2">
          <span>Personal: {personalSource === 'AUTO' ? 'Automatic' : 'Manual'}</span>
          <span className="text-border">|</span>
          <span>Total: {teamSource === 'AUTO' ? 'Automatic' : 'Manual'}</span>
        </div>
      </header>

      <main className="scrollable-content">
        <div className="container py-2 px-3 pb-24">
          <TrialBanner tabId="tracking" className="mb-3" />

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

          {/* Active table view */}
          <div>
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
      <TrackingSettingsDialog open={showSettings} onOpenChange={setShowSettings} />

      <BottomNav />
    </div>
  );
}
