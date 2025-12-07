import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { useProspectFunnelStats, FunnelStats } from '@/hooks/useProspectFunnelStats';
import { useFunnelConfig } from '@/hooks/useFunnelConfig';
import { useProspects } from '@/hooks/useProspects';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronUp, Flame, TrendingUp, TrendingDown, Minus, Sparkles, Users, Grid3X3, Settings2, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ExportFunnelData } from './ExportFunnelData';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

const STAGES = ['enrollment', 'day_1', 'day_2', 'day_3', 'minimum_bill', 'level_up', 'two_cc'] as const;
type StageKey = typeof STAGES[number];

const STAGE_LABELS: Record<StageKey, string> = {
  enrollment: 'Enrollment',
  day_1: 'Day 1',
  day_2: 'Day 2',
  day_3: 'Day 3',
  minimum_bill: 'Min Bill',
  level_up: 'Level Up',
  two_cc: '2CC',
};

const STAGE_COLORS: Record<StageKey, string> = {
  enrollment: 'from-blue-500/20 to-blue-500/5',
  day_1: 'from-violet-500/20 to-violet-500/5',
  day_2: 'from-pink-500/20 to-pink-500/5',
  day_3: 'from-amber-500/20 to-amber-500/5',
  minimum_bill: 'from-emerald-500/20 to-emerald-500/5',
  level_up: 'from-cyan-500/20 to-cyan-500/5',
  two_cc: 'from-yellow-500/20 to-yellow-500/5',
};

const STAGE_ICONS_COLORS: Record<StageKey, string> = {
  enrollment: 'bg-blue-500',
  day_1: 'bg-violet-500',
  day_2: 'bg-pink-500',
  day_3: 'bg-amber-500',
  minimum_bill: 'bg-emerald-500',
  level_up: 'bg-cyan-500',
  two_cc: 'bg-yellow-500',
};

const STEP_CONVERSIONS = [
  { from: 'enrollment', to: 'day_1', label: 'Enrollment → Day 1' },
  { from: 'day_1', to: 'day_2', label: 'Day 1 → Day 2' },
  { from: 'day_2', to: 'day_3', label: 'Day 2 → Day 3' },
  { from: 'day_3', to: 'minimum_bill', label: 'Day 3 → Min Bill' },
  { from: 'minimum_bill', to: 'level_up', label: 'Min Bill → Level Up' },
  { from: 'level_up', to: 'two_cc', label: 'Level Up → 2CC' },
];

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

interface FunnelTrackerProps {
  isPro?: boolean;
}

export function FunnelTracker({ isPro = true }: FunnelTrackerProps) {
  const { prospects, loading: prospectsLoading } = useProspects();
  const { config, loading: configLoading, saveConfig } = useFunnelConfig();
  
  const [fromStage, setFromStage] = useState<StageKey>('enrollment');
  const [toStage, setToStage] = useState<StageKey>('day_1');
  const [stepConversionOpen, setStepConversionOpen] = useState(true);
  
  // Funnel setup state - always use 3-day funnel
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Initialize from saved config
  useEffect(() => {
    if (config) {
      setSelectedDate(new Date(config.day_1_start));
    }
  }, [config]);

  // Build funnel config for the hook - fixed 3-day funnel
  const funnelConfigForStats = useMemo(() => {
    if (!selectedDate) return null;
    return {
      day_1_start: format(selectedDate, 'yyyy-MM-dd'),
      funnel_length: 3, // Fixed 3-day funnel
    };
  }, [selectedDate]);

  // Pass config to hook for auto-calculated funnel rows
  const { totals, loading, totalProspects, funnelRows } = useProspectFunnelStats(funnelConfigForStats);

  // Save config when Day 1 date changes
  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setDatePickerOpen(false);
    await saveConfig({
      funnel_name: 'Default Funnel',
      funnel_length: 3, // Fixed 3-day funnel
      day_1_start: format(date, 'yyyy-MM-dd'),
    });
  };

  const fromValue = totals[fromStage] || 0;
  const toValue = totals[toStage] || 0;
  const conversionPercentage = fromValue > 0 ? Math.round((toValue / fromValue) * 100) : 0;

  const getStepConversion = (from: StageKey, to: StageKey) => {
    const fromVal = totals[from] || 0;
    const toVal = totals[to] || 0;
    const percentage = fromVal > 0 ? Math.round((toVal / fromVal) * 100) : 0;
    return { from: fromVal, to: toVal, percentage };
  };

  if (loading || configLoading || prospectsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  const maxCount = Math.max(...Object.values(totals), 1);

  return (
    <div className="space-y-6 animate-fade-in">
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

      {/* Funnel-wise Tracking Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Funnel Tracker</h3>
            </div>
            
            {/* Inline Funnel Setup - Day 1 Date Only */}
            <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-1.5">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              
              {/* Day 1 Date Picker */}
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-xs font-medium bg-background/60 hover:bg-background gap-1.5"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    {selectedDate ? `Day 1: ${format(selectedDate, 'MMM d')}` : 'Set Day 1'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">3-day funnel auto-calculated from Follow Up.</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="px-3 py-3 text-left font-medium text-muted-foreground w-20">Funnel</th>
                <th className="px-3 py-3 text-center font-medium text-muted-foreground">Day 1</th>
                <th className="px-3 py-3 text-center font-medium text-muted-foreground">Day 2</th>
                <th className="px-3 py-3 text-center font-medium text-muted-foreground">Day 3</th>
                <th className="px-3 py-3 text-center font-medium text-muted-foreground">Min Billing</th>
                <th className="px-3 py-3 text-center font-medium text-muted-foreground">Level Up</th>
                <th className="px-3 py-3 text-center font-medium text-muted-foreground">2CC</th>
              </tr>
            </thead>
            <tbody>
              {funnelRows.length > 0 ? (
                funnelRows.map((row) => (
                  <tr key={row.funnel_number} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2 font-semibold text-muted-foreground">{row.funnel_number}</td>
                    <td className="px-2 py-2 text-center">{isPro ? row.day_1 : '–'}</td>
                    <td className="px-2 py-2 text-center">{isPro ? row.day_2 : '–'}</td>
                    <td className="px-2 py-2 text-center">{isPro ? row.day_3 : '–'}</td>
                    <td className="px-2 py-2 text-center">{isPro ? row.minimum_bill : '–'}</td>
                    <td className="px-2 py-2 text-center">{isPro ? row.level_up : '–'}</td>
                    <td className="px-2 py-2 text-center">{isPro ? row.two_cc : '–'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    {selectedDate ? 'No prospects in funnel yet. Add prospects in Follow Up.' : 'Set a Day 1 date above to start tracking funnels.'}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-muted/40 font-semibold">
                <td className="px-3 py-3 text-muted-foreground">TOTAL</td>
                <td className="px-3 py-3 text-center">{isPro ? totals.day_1 : '–'}</td>
                <td className="px-3 py-3 text-center">{isPro ? totals.day_2 : '–'}</td>
                <td className="px-3 py-3 text-center">{isPro ? totals.day_3 : '–'}</td>
                <td className="px-3 py-3 text-center">{isPro ? totals.minimum_bill : '–'}</td>
                <td className="px-3 py-3 text-center">{isPro ? totals.level_up : '–'}</td>
                <td className="px-3 py-3 text-center">{isPro ? totals.two_cc : '–'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Funnel Stage Distribution */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Funnel Stage Distribution</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Prospect counts from your FollowUp list</p>
        </div>
        
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {STAGES.map((stage, idx) => {
            const count = isPro ? totals[stage] : 0;
            const percentage = isPro ? (count / maxCount) * 100 : 0;
            return (
              <div
                key={stage}
                className={cn(
                  "relative overflow-hidden rounded-xl p-4 bg-gradient-to-br border border-border/30",
                  STAGE_COLORS[stage]
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={cn("w-3 h-3 rounded-full", STAGE_ICONS_COLORS[stage])} />
                  <span className="text-2xl font-bold">{isPro ? count : '–'}</span>
                </div>
                <p className="text-xs font-medium text-muted-foreground">{STAGE_LABELS[stage]}</p>
                <div className="mt-2 h-1.5 bg-background/50 rounded-full overflow-hidden">
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

      {/* Conversion Analytics */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold">Conversion Rate</h3>
            </div>
            <div className="flex items-center gap-2">
              <Select value={fromStage} onValueChange={(v) => setFromStage(v as StageKey)}>
                <SelectTrigger className="w-28 h-8 text-xs bg-muted/50 border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  {STAGES.slice(0, -1).map(stage => (
                    <SelectItem key={stage} value={stage} className="text-xs">{STAGE_LABELS[stage]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">→</span>
              <Select value={toStage} onValueChange={(v) => setToStage(v as StageKey)}>
                <SelectTrigger className="w-28 h-8 text-xs bg-muted/50 border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  {STAGES.filter(s => STAGES.indexOf(s) > STAGES.indexOf(fromStage)).map(stage => (
                    <SelectItem key={stage} value={stage} className="text-xs">{STAGE_LABELS[stage]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{STAGE_LABELS[fromStage]} → {STAGE_LABELS[toStage]}</p>
              <p className={cn("text-sm mt-1", isPro ? getConversionTextColor(conversionPercentage) : 'text-muted-foreground')}>
                {isPro ? `${toValue} of ${fromValue} converted` : '– of – converted'}
              </p>
            </div>
            <span className={cn("text-4xl font-bold tracking-tight", isPro ? getConversionTextColor(conversionPercentage) : 'text-muted-foreground')}>
              {isPro ? `${conversionPercentage}%` : '–%'}
            </span>
          </div>
          
          <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted/50">
            <div
              className={cn("h-full transition-all duration-700 ease-out", getConversionColor(conversionPercentage))}
              style={{ width: isPro ? `${Math.min(conversionPercentage, 100)}%` : '0%' }}
            />
          </div>

          {/* Step by Step Conversion */}
          <Collapsible open={stepConversionOpen} onOpenChange={setStepConversionOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent h-10">
                <span className="text-sm font-medium">Step by Step Conversion</span>
                {stepConversionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              {STEP_CONVERSIONS.map((step, i) => {
                const conv = getStepConversion(step.from as StageKey, step.to as StageKey);
                const displayPercentage = isPro ? conv.percentage : 0;
                return (
                  <div
                    key={step.label}
                    className="p-3 rounded-xl bg-muted/30 space-y-2"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{step.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-lg font-bold", isPro ? getConversionTextColor(conv.percentage) : 'text-muted-foreground')}>
                          {isPro ? `${conv.percentage}%` : '–%'}
                        </span>
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {isPro ? `${conv.to}/${conv.from}` : '–/–'}
                        </span>
                        {isPro ? (
                          conv.percentage >= 70 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : conv.percentage >= 40 ? (
                            <Minus className="h-4 w-4 text-amber-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/50">
                      <div
                        className={cn("h-full transition-all duration-500", getConversionColor(displayPercentage))}
                        style={{ width: isPro ? `${Math.min(conv.percentage, 100)}%` : '0%' }}
                      />
                    </div>
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* Export Data Section */}
      <ExportFunnelData prospects={prospects} isPro={isPro} />
    </div>
  );
}
