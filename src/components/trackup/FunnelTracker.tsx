import { useState, useMemo } from 'react';
import { useProspectFunnelStats, FunnelStats, ProspectWithDate } from '@/hooks/useProspectFunnelStats';
import { useFunnelTracking } from '@/hooks/useFunnelTracking';
import { useProspects } from '@/hooks/useProspects';
import { useFunnelConfigs, FunnelConfig } from '@/hooks/useFunnelConfigs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronUp, Settings2, CalendarDays, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ExportFunnelData } from './ExportFunnelData';
import { AddFunnelDialog } from './AddFunnelDialog';
import { format } from 'date-fns';

const STAGES = ['day_1', 'day_2', 'day_3', 'minimum_bill', 'level_up', 'two_cc'] as const;
type StageKey = typeof STAGES[number];

function getConversionTextColor(percentage: number) {
  if (percentage >= 70) return 'text-green-600';
  if (percentage >= 40) return 'text-amber-600';
  return 'text-red-600';
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
      { value: 'all', label: 'All' }
    ];
    for (let i = 1; i <= currentCycle; i++) {
      const dates = getCycleDates(config, i);
      const label = `C${i}`;
      options.push({ value: i, label });
    }
    return options;
  };

  if (loading || funnelLoading || prospectsLoading || configsLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Compact Funnel Setup */}
      <Collapsible open={setupOpen} onOpenChange={setSetupOpen}>
        <div className="border border-border/50 rounded-lg bg-card/50">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full h-9 px-3 flex items-center justify-between hover:bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-xs">
                <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">Funnel Setup</span>
                <span className="text-muted-foreground">({configs.length})</span>
              </div>
              {setupOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 pb-3 border-t border-border/30">
              {/* Compact funnel list */}
              {configs.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {configs.map(config => (
                    <div key={config.id} className="flex items-center justify-between text-xs py-1.5 px-2 bg-muted/20 rounded">
                      <span className="font-medium">{config.funnel_name}</span>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>{config.funnel_length} days</span>
                        <span>•</span>
                        <span>Start: {format(new Date(config.day_1_start + 'T00:00:00'), 'MMM d')}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-5 px-1.5 text-xs text-destructive hover:text-destructive"
                          onClick={() => deleteConfig(config.id)}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">No funnels configured</p>
              )}
              <div className="mt-2">
                <AddFunnelDialog onAdd={addConfig} />
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Clean Funnel Tracker Table */}
      <div className="border border-border/50 rounded-lg overflow-hidden bg-card/50">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border/50">
                <th className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Funnel</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground">D1</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground">D2</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground">D3</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground">MB</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground">LU</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground">2CC</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground border-l border-border/30">D1→D2</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground">D2→D3</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground">D3→MB</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground">MB→LU</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground border-l border-border/30">Overall</th>
              </tr>
            </thead>
            <tbody>
              {/* Configured funnels */}
              {configs.length > 0 ? (
                configs.map((config) => {
                  const funnelData = perFunnelStats[config.id];
                  const stats = funnelData?.stats || totals;
                  const cycleOptions = getCycleOptions(config);
                  const selectedCycle = getSelectedCycle(config);
                  const funnelConversion = getOverallConversion(stats);
                  
                  return (
                    <tr key={config.id} className="border-b border-border/30 hover:bg-muted/10">
                      <td className="px-2 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{config.funnel_name}</span>
                          {cycleOptions.length > 1 && (
                            <Select 
                              value={String(selectedCycle)} 
                              onValueChange={(v) => setSelectedCycles(prev => ({ ...prev, [config.id]: v === 'all' ? 'all' : Number(v) }))}
                            >
                              <SelectTrigger className="h-5 text-[10px] w-12 px-1 bg-muted/30 border-0">
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
                      <td className="px-2 py-2 text-center">{isPro ? stats.day_1 : '–'}</td>
                      <td className="px-2 py-2 text-center">{isPro ? (config.funnel_length >= 2 ? stats.day_2 : '–') : '–'}</td>
                      <td className="px-2 py-2 text-center">{isPro ? (config.funnel_length >= 3 ? stats.day_3 : '–') : '–'}</td>
                      <td className="px-2 py-2 text-center">{isPro ? stats.minimum_bill : '–'}</td>
                      <td className="px-2 py-2 text-center">{isPro ? stats.level_up : '–'}</td>
                      <td className="px-2 py-2 text-center">{isPro ? stats.two_cc : '–'}</td>
                      <td className={cn("px-2 py-2 text-center border-l border-border/30", isPro && getConversionTextColor(getStepConversion(stats, 'day_1', 'day_2')))}>
                        {isPro ? `${getStepConversion(stats, 'day_1', 'day_2')}%` : '–'}
                      </td>
                      <td className={cn("px-2 py-2 text-center", isPro && getConversionTextColor(getStepConversion(stats, 'day_2', 'day_3')))}>
                        {isPro ? (config.funnel_length >= 3 ? `${getStepConversion(stats, 'day_2', 'day_3')}%` : '–') : '–'}
                      </td>
                      <td className={cn("px-2 py-2 text-center", isPro && getConversionTextColor(getStepConversion(stats, 'day_3', 'minimum_bill')))}>
                        {isPro ? `${getStepConversion(stats, 'day_3', 'minimum_bill')}%` : '–'}
                      </td>
                      <td className={cn("px-2 py-2 text-center", isPro && getConversionTextColor(getStepConversion(stats, 'minimum_bill', 'level_up')))}>
                        {isPro ? `${getStepConversion(stats, 'minimum_bill', 'level_up')}%` : '–'}
                      </td>
                      <td className={cn("px-2 py-2 text-center font-semibold border-l border-border/30", isPro && getConversionTextColor(funnelConversion))}>
                        {isPro ? `${funnelConversion}%` : '–'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr className="border-b border-border/30 hover:bg-muted/10">
                  <td className="px-2 py-2 text-muted-foreground">All Prospects</td>
                  <td className="px-2 py-2 text-center">{isPro ? totals.day_1 : '–'}</td>
                  <td className="px-2 py-2 text-center">{isPro ? totals.day_2 : '–'}</td>
                  <td className="px-2 py-2 text-center">{isPro ? totals.day_3 : '–'}</td>
                  <td className="px-2 py-2 text-center">{isPro ? totals.minimum_bill : '–'}</td>
                  <td className="px-2 py-2 text-center">{isPro ? totals.level_up : '–'}</td>
                  <td className="px-2 py-2 text-center">{isPro ? totals.two_cc : '–'}</td>
                  <td className={cn("px-2 py-2 text-center border-l border-border/30", isPro && getConversionTextColor(getStepConversion(totals, 'day_1', 'day_2')))}>
                    {isPro ? `${getStepConversion(totals, 'day_1', 'day_2')}%` : '–'}
                  </td>
                  <td className={cn("px-2 py-2 text-center", isPro && getConversionTextColor(getStepConversion(totals, 'day_2', 'day_3')))}>
                    {isPro ? `${getStepConversion(totals, 'day_2', 'day_3')}%` : '–'}
                  </td>
                  <td className={cn("px-2 py-2 text-center", isPro && getConversionTextColor(getStepConversion(totals, 'day_3', 'minimum_bill')))}>
                    {isPro ? `${getStepConversion(totals, 'day_3', 'minimum_bill')}%` : '–'}
                  </td>
                  <td className={cn("px-2 py-2 text-center", isPro && getConversionTextColor(getStepConversion(totals, 'minimum_bill', 'level_up')))}>
                    {isPro ? `${getStepConversion(totals, 'minimum_bill', 'level_up')}%` : '–'}
                  </td>
                  <td className={cn("px-2 py-2 text-center font-semibold border-l border-border/30", isPro && getConversionTextColor(overallConversion))}>
                    {isPro ? `${overallConversion}%` : '–'}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 font-medium">
                <td className="px-2 py-2 text-muted-foreground">TOTAL</td>
                <td className="px-2 py-2 text-center">{isPro ? totals.day_1 : '–'}</td>
                <td className="px-2 py-2 text-center">{isPro ? totals.day_2 : '–'}</td>
                <td className="px-2 py-2 text-center">{isPro ? totals.day_3 : '–'}</td>
                <td className="px-2 py-2 text-center">{isPro ? totals.minimum_bill : '–'}</td>
                <td className="px-2 py-2 text-center">{isPro ? totals.level_up : '–'}</td>
                <td className="px-2 py-2 text-center">{isPro ? totals.two_cc : '–'}</td>
                <td className={cn("px-2 py-2 text-center border-l border-border/30", isPro && getConversionTextColor(getStepConversion(totals, 'day_1', 'day_2')))}>
                  {isPro ? `${getStepConversion(totals, 'day_1', 'day_2')}%` : '–'}
                </td>
                <td className={cn("px-2 py-2 text-center", isPro && getConversionTextColor(getStepConversion(totals, 'day_2', 'day_3')))}>
                  {isPro ? `${getStepConversion(totals, 'day_2', 'day_3')}%` : '–'}
                </td>
                <td className={cn("px-2 py-2 text-center", isPro && getConversionTextColor(getStepConversion(totals, 'day_3', 'minimum_bill')))}>
                  {isPro ? `${getStepConversion(totals, 'day_3', 'minimum_bill')}%` : '–'}
                </td>
                <td className={cn("px-2 py-2 text-center", isPro && getConversionTextColor(getStepConversion(totals, 'minimum_bill', 'level_up')))}>
                  {isPro ? `${getStepConversion(totals, 'minimum_bill', 'level_up')}%` : '–'}
                </td>
                <td className={cn("px-2 py-2 text-center font-semibold border-l border-border/30", isPro && getConversionTextColor(overallConversion))}>
                  {isPro ? `${overallConversion}%` : '–'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Compact info row */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
        <span>Total: {isPro ? totalProspects : '–'} prospects • Auto-synced from Follow Up</span>
        <ExportFunnelData prospects={prospects} isPro={isPro} />
      </div>
    </div>
  );
}