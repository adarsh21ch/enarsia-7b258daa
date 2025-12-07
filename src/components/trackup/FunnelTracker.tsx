import { useState, useMemo } from 'react';
import { useProspectFunnelStats, FunnelStats, ProspectWithDate } from '@/hooks/useProspectFunnelStats';
import { useFunnelTracking } from '@/hooks/useFunnelTracking';
import { useProspects } from '@/hooks/useProspects';
import { useFunnelConfigs, FunnelConfig } from '@/hooks/useFunnelConfigs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronUp, Flame, TrendingUp, Sparkles, Users, Settings2, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ExportFunnelData } from './ExportFunnelData';
import { AddFunnelDialog } from './AddFunnelDialog';
import { FunnelConfigList } from './FunnelConfigList';
import { format } from 'date-fns';

const STAGES = ['day_1', 'day_2', 'day_3', 'minimum_bill', 'level_up', 'two_cc'] as const;
type StageKey = typeof STAGES[number];

const STAGE_LABELS: Record<StageKey, string> = {
  day_1: 'D1',
  day_2: 'D2',
  day_3: 'D3',
  minimum_bill: 'MB',
  level_up: 'LU',
  two_cc: '2CC',
};

const STAGE_FULL_LABELS: Record<StageKey, string> = {
  day_1: 'Day 1',
  day_2: 'Day 2',
  day_3: 'Day 3',
  minimum_bill: 'Min Bill',
  level_up: 'Level Up',
  two_cc: '2CC',
};

const STAGE_COLORS: Record<StageKey, string> = {
  day_1: 'from-violet-500/20 to-violet-500/5',
  day_2: 'from-pink-500/20 to-pink-500/5',
  day_3: 'from-amber-500/20 to-amber-500/5',
  minimum_bill: 'from-emerald-500/20 to-emerald-500/5',
  level_up: 'from-cyan-500/20 to-cyan-500/5',
  two_cc: 'from-yellow-500/20 to-yellow-500/5',
};

const STAGE_ICONS_COLORS: Record<StageKey, string> = {
  day_1: 'bg-violet-500',
  day_2: 'bg-pink-500',
  day_3: 'bg-amber-500',
  minimum_bill: 'bg-emerald-500',
  level_up: 'bg-cyan-500',
  two_cc: 'bg-yellow-500',
};

function getConversionColor(percentage: number) {
  if (percentage >= 70) return 'bg-gradient-to-r from-green-400 to-green-500';
  if (percentage >= 40) return 'bg-gradient-to-r from-amber-400 to-amber-500';
  return 'bg-gradient-to-r from-red-400 to-red-500';
}

function getConversionTextColor(percentage: number) {
  if (percentage >= 70) return 'text-green-500';
  if (percentage >= 40) return 'text-amber-500';
  return 'text-red-500';
}

function getConversionBgColor(percentage: number) {
  if (percentage >= 70) return 'bg-green-500/10 text-green-600';
  if (percentage >= 40) return 'bg-amber-500/10 text-amber-600';
  return 'bg-red-500/10 text-red-600';
}

interface FunnelTrackerProps {
  isPro?: boolean;
}

// Map database funnel_stage values to stat keys
const STAGE_MAP: Record<string, StageKey> = {
  'Day 1': 'day_1',
  'Day 2': 'day_2',
  'Day 3': 'day_3',
  'Minimum Bill': 'minimum_bill',
  'Level Up': 'level_up',
  '2CC': 'two_cc',
};

// Calculate stats from prospects array
function calculateStats(prospects: ProspectWithDate[]): FunnelStats {
  const stats: FunnelStats = {
    enrollment: 0,
    day_1: 0,
    day_2: 0,
    day_3: 0,
    minimum_bill: 0,
    level_up: 0,
    two_cc: 0,
  };
  prospects.forEach(p => {
    const stage = p.funnel_stage;
    if (stage && STAGE_MAP[stage]) {
      stats[STAGE_MAP[stage]]++;
    }
  });
  return stats;
}

export function FunnelTracker({ isPro = true }: FunnelTrackerProps) {
  const { totals, loading, totalProspects, prospects: funnelProspects } = useProspectFunnelStats();
  const { rows, loading: funnelLoading } = useFunnelTracking();
  const { prospects, loading: prospectsLoading } = useProspects();
  const { 
    configs, 
    loading: configsLoading, 
    addConfig, 
    updateConfig, 
    deleteConfig,
    getCurrentCycle,
    getCycleDates,
    getProspectsForFunnel
  } = useFunnelConfigs();
  const [setupOpen, setSetupOpen] = useState(false);
  const [conversionFromStage, setConversionFromStage] = useState<StageKey>('day_1');
  const [selectedCycles, setSelectedCycles] = useState<Record<string, number | 'all'>>({});

  // Get selected cycle for a config (default to current cycle)
  const getSelectedCycle = (config: FunnelConfig) => {
    if (selectedCycles[config.id] !== undefined) return selectedCycles[config.id];
    return getCurrentCycle(config) || 1;
  };

  // Calculate per-funnel stats with cycle awareness
  const perFunnelStats = useMemo(() => {
    if (!funnelProspects.length) return {};
    
    const result: Record<string, { 
      stats: FunnelStats; 
      currentCycle: number | null;
      prospectCount: number;
      cycleDates: { start: Date; end: Date } | null;
    }> = {};

    configs.forEach(config => {
      const cycle = getSelectedCycle(config);
      const cycleNumber = cycle === 'all' ? undefined : cycle;
      const filteredProspects = getProspectsForFunnel(config, funnelProspects, cycleNumber);
      const currentCycle = getCurrentCycle(config);
      const cycleDates = cycleNumber ? getCycleDates(config, cycleNumber) : null;
      
      result[config.id] = {
        stats: calculateStats(filteredProspects),
        currentCycle,
        prospectCount: filteredProspects.length,
        cycleDates,
      };
    });

    return result;
  }, [configs, funnelProspects, selectedCycles, getCurrentCycle, getCycleDates, getProspectsForFunnel]);

  // Calculate conversion from selected stage to 2CC (global)
  const fromValue = totals[conversionFromStage] || 0;
  const twoCCValue = totals.two_cc || 0;
  const conversionTo2CC = fromValue > 0 ? Math.round((twoCCValue / fromValue) * 100) : 0;

  // Calculate step-by-step conversions from stats
  const getStepConversion = (stats: FunnelStats, from: StageKey, to: StageKey) => {
    const fromVal = stats[from] || 0;
    const toVal = stats[to] || 0;
    return fromVal > 0 ? Math.round((toVal / fromVal) * 100) : 0;
  };

  // Overall conversion: D1 -> 2CC
  const getOverallConversion = (stats: FunnelStats) => {
    return (stats.day_1 || 0) > 0 
      ? Math.round(((stats.two_cc || 0) / (stats.day_1 || 0)) * 100) 
      : 0;
  };

  const overallConversion = getOverallConversion(totals);

  // Generate cycle options for a config
  const getCycleOptions = (config: FunnelConfig) => {
    const currentCycle = getCurrentCycle(config);
    if (!currentCycle) return [];
    const options: { value: number | 'all'; label: string }[] = [
      { value: 'all', label: 'All Cycles' }
    ];
    for (let i = 1; i <= currentCycle; i++) {
      const dates = getCycleDates(config, i);
      const label = `C${i}: ${format(dates.start, 'MMM d')} - ${format(dates.end, 'MMM d')}`;
      options.push({ value: i, label });
    }
    return options;
  };

  if (loading || funnelLoading || prospectsLoading || configsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const maxCount = Math.max(...Object.values(totals), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Funnel Setup Section */}
      <Collapsible open={setupOpen} onOpenChange={setSetupOpen}>
        <div className="glass-card rounded-2xl overflow-hidden">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full p-4 flex items-center justify-between hover:bg-muted/20 rounded-none">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                <span className="font-semibold">Funnel Setup</span>
                <span className="text-xs text-muted-foreground">({configs.length} configured)</span>
              </div>
              {setupOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-4">
              <div className="flex justify-end">
                <AddFunnelDialog onAdd={addConfig} />
              </div>
              <FunnelConfigList 
                configs={configs} 
                onUpdate={updateConfig} 
                onDelete={deleteConfig} 
              />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Total Prospects Card */}
      <div className="glass-card rounded-2xl p-4 bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/20">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Prospects</p>
              <p className="text-3xl font-bold">{isPro ? totalProspects : '–'}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Auto-synced from FollowUp</p>
        </div>
      </div>

      {/* Manual Conversion Rate Selector */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <span className="font-semibold">Conversion to 2CC</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">From:</span>
            <Select value={conversionFromStage} onValueChange={(v) => setConversionFromStage(v as StageKey)}>
              <SelectTrigger className="w-28 h-9 bg-muted/50 border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                {STAGES.slice(0, -1).map(stage => (
                  <SelectItem key={stage} value={stage}>{STAGE_FULL_LABELS[stage]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">→ 2CC:</span>
            <span className={cn(
              "text-2xl font-bold px-3 py-1 rounded-lg",
              isPro ? getConversionBgColor(conversionTo2CC) : 'bg-muted text-muted-foreground'
            )}>
              {isPro ? `${conversionTo2CC}%` : '–%'}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {isPro ? `${twoCCValue} of ${fromValue} prospects converted from ${STAGE_FULL_LABELS[conversionFromStage]} to 2CC` : 'Upgrade to see conversion data'}
        </p>
      </div>

      {/* Funnel Tracker Table with Conversions */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Funnel Tracker</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Lifetime totals with stage-to-stage conversion rates</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="px-2 py-3 text-left font-medium text-muted-foreground">Funnel</th>
                <th className="px-2 py-3 text-center font-medium text-muted-foreground">D1</th>
                <th className="px-2 py-3 text-center font-medium text-muted-foreground">D2</th>
                <th className="px-2 py-3 text-center font-medium text-muted-foreground">D3</th>
                <th className="px-2 py-3 text-center font-medium text-muted-foreground">MB</th>
                <th className="px-2 py-3 text-center font-medium text-muted-foreground">LU</th>
                <th className="px-2 py-3 text-center font-medium text-muted-foreground">2CC</th>
                <th className="px-2 py-3 text-center font-medium text-muted-foreground bg-muted/20">D1→D2</th>
                <th className="px-2 py-3 text-center font-medium text-muted-foreground bg-muted/20">D2→D3</th>
                <th className="px-2 py-3 text-center font-medium text-muted-foreground bg-muted/20">D3→MB</th>
                <th className="px-2 py-3 text-center font-medium text-muted-foreground bg-muted/20">MB→LU</th>
                <th className="px-2 py-3 text-center font-medium text-muted-foreground bg-primary/10">Overall</th>
              </tr>
            </thead>
            <tbody>
              {/* Show configured funnels with cycle-aware stats */}
              {configs.length > 0 ? (
                configs.map((config) => {
                  const funnelData = perFunnelStats[config.id];
                  const stats = funnelData?.stats || totals;
                  const cycleOptions = getCycleOptions(config);
                  const selectedCycle = getSelectedCycle(config);
                  const funnelConversion = getOverallConversion(stats);
                  
                  return (
                    <tr key={config.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-2 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{config.funnel_name}</span>
                          {cycleOptions.length > 0 && (
                            <Select 
                              value={String(selectedCycle)} 
                              onValueChange={(v) => setSelectedCycles(prev => ({ ...prev, [config.id]: v === 'all' ? 'all' : Number(v) }))}
                            >
                              <SelectTrigger className="h-6 text-[10px] w-32 bg-muted/30 border-0">
                                <CalendarDays className="h-3 w-3 mr-1" />
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border border-border z-50">
                                {cycleOptions.map(opt => (
                                  <SelectItem key={String(opt.value)} value={String(opt.value)} className="text-xs">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center">{isPro ? stats.day_1 : '–'}</td>
                      <td className="px-2 py-3 text-center">{isPro ? (config.funnel_length >= 2 ? stats.day_2 : '–') : '–'}</td>
                      <td className="px-2 py-3 text-center">{isPro ? (config.funnel_length >= 3 ? stats.day_3 : '–') : '–'}</td>
                      <td className="px-2 py-3 text-center">{isPro ? stats.minimum_bill : '–'}</td>
                      <td className="px-2 py-3 text-center">{isPro ? stats.level_up : '–'}</td>
                      <td className="px-2 py-3 text-center">{isPro ? stats.two_cc : '–'}</td>
                      <td className={cn("px-2 py-3 text-center bg-muted/10", isPro && getConversionTextColor(getStepConversion(stats, 'day_1', 'day_2')))}>
                        {isPro ? `${getStepConversion(stats, 'day_1', 'day_2')}%` : '–'}
                      </td>
                      <td className={cn("px-2 py-3 text-center bg-muted/10", isPro && getConversionTextColor(getStepConversion(stats, 'day_2', 'day_3')))}>
                        {isPro ? (config.funnel_length >= 3 ? `${getStepConversion(stats, 'day_2', 'day_3')}%` : '–') : '–'}
                      </td>
                      <td className={cn("px-2 py-3 text-center bg-muted/10", isPro && getConversionTextColor(getStepConversion(stats, 'day_3', 'minimum_bill')))}>
                        {isPro ? `${getStepConversion(stats, 'day_3', 'minimum_bill')}%` : '–'}
                      </td>
                      <td className={cn("px-2 py-3 text-center bg-muted/10", isPro && getConversionTextColor(getStepConversion(stats, 'minimum_bill', 'level_up')))}>
                        {isPro ? `${getStepConversion(stats, 'minimum_bill', 'level_up')}%` : '–'}
                      </td>
                      <td className={cn("px-2 py-3 text-center font-bold bg-primary/5", isPro && getConversionTextColor(funnelConversion))}>
                        {isPro ? `${funnelConversion}%` : '–'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="px-2 py-3 font-medium text-muted-foreground">All Prospects</td>
                  <td className="px-2 py-3 text-center">{isPro ? totals.day_1 : '–'}</td>
                  <td className="px-2 py-3 text-center">{isPro ? totals.day_2 : '–'}</td>
                  <td className="px-2 py-3 text-center">{isPro ? totals.day_3 : '–'}</td>
                  <td className="px-2 py-3 text-center">{isPro ? totals.minimum_bill : '–'}</td>
                  <td className="px-2 py-3 text-center">{isPro ? totals.level_up : '–'}</td>
                  <td className="px-2 py-3 text-center">{isPro ? totals.two_cc : '–'}</td>
                  <td className={cn("px-2 py-3 text-center bg-muted/10", isPro && getConversionTextColor(getStepConversion(totals, 'day_1', 'day_2')))}>
                    {isPro ? `${getStepConversion(totals, 'day_1', 'day_2')}%` : '–'}
                  </td>
                  <td className={cn("px-2 py-3 text-center bg-muted/10", isPro && getConversionTextColor(getStepConversion(totals, 'day_2', 'day_3')))}>
                    {isPro ? `${getStepConversion(totals, 'day_2', 'day_3')}%` : '–'}
                  </td>
                  <td className={cn("px-2 py-3 text-center bg-muted/10", isPro && getConversionTextColor(getStepConversion(totals, 'day_3', 'minimum_bill')))}>
                    {isPro ? `${getStepConversion(totals, 'day_3', 'minimum_bill')}%` : '–'}
                  </td>
                  <td className={cn("px-2 py-3 text-center bg-muted/10", isPro && getConversionTextColor(getStepConversion(totals, 'minimum_bill', 'level_up')))}>
                    {isPro ? `${getStepConversion(totals, 'minimum_bill', 'level_up')}%` : '–'}
                  </td>
                  <td className={cn("px-2 py-3 text-center font-bold bg-primary/5", isPro && getConversionTextColor(overallConversion))}>
                    {isPro ? `${overallConversion}%` : '–'}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-muted/40 font-semibold">
                <td className="px-2 py-3 text-muted-foreground">TOTAL (Lifetime)</td>
                <td className="px-2 py-3 text-center">{isPro ? totals.day_1 : '–'}</td>
                <td className="px-2 py-3 text-center">{isPro ? totals.day_2 : '–'}</td>
                <td className="px-2 py-3 text-center">{isPro ? totals.day_3 : '–'}</td>
                <td className="px-2 py-3 text-center">{isPro ? totals.minimum_bill : '–'}</td>
                <td className="px-2 py-3 text-center">{isPro ? totals.level_up : '–'}</td>
                <td className="px-2 py-3 text-center">{isPro ? totals.two_cc : '–'}</td>
                <td className={cn("px-2 py-3 text-center bg-muted/20", isPro && getConversionTextColor(getStepConversion(totals, 'day_1', 'day_2')))}>
                  {isPro ? `${getStepConversion(totals, 'day_1', 'day_2')}%` : '–'}
                </td>
                <td className={cn("px-2 py-3 text-center bg-muted/20", isPro && getConversionTextColor(getStepConversion(totals, 'day_2', 'day_3')))}>
                  {isPro ? `${getStepConversion(totals, 'day_2', 'day_3')}%` : '–'}
                </td>
                <td className={cn("px-2 py-3 text-center bg-muted/20", isPro && getConversionTextColor(getStepConversion(totals, 'day_3', 'minimum_bill')))}>
                  {isPro ? `${getStepConversion(totals, 'day_3', 'minimum_bill')}%` : '–'}
                </td>
                <td className={cn("px-2 py-3 text-center bg-muted/20", isPro && getConversionTextColor(getStepConversion(totals, 'minimum_bill', 'level_up')))}>
                  {isPro ? `${getStepConversion(totals, 'minimum_bill', 'level_up')}%` : '–'}
                </td>
                <td className={cn("px-2 py-3 text-center font-bold bg-primary/10", isPro && getConversionTextColor(overallConversion))}>
                  {isPro ? `${overallConversion}%` : '–'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Funnel Stage Distribution */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Stage Distribution</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Prospect counts from your FollowUp list</p>
        </div>
        
        <div className="p-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
          {STAGES.map((stage, idx) => {
            const count = isPro ? totals[stage] : 0;
            const percentage = isPro ? (count / maxCount) * 100 : 0;
            return (
              <div
                key={stage}
                className={cn(
                  "relative overflow-hidden rounded-xl p-3 bg-gradient-to-br border border-border/30",
                  STAGE_COLORS[stage]
                )}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className={cn("w-2 h-2 rounded-full", STAGE_ICONS_COLORS[stage])} />
                  <span className="text-xl font-bold">{isPro ? count : '–'}</span>
                </div>
                <p className="text-[10px] font-medium text-muted-foreground">{STAGE_FULL_LABELS[stage]}</p>
                <div className="mt-1.5 h-1 bg-background/50 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", STAGE_ICONS_COLORS[stage])}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export Data Section */}
      <ExportFunnelData prospects={prospects} isPro={isPro} />
    </div>
  );
}
