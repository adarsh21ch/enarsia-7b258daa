import { useState } from 'react';
import { AutoFunnelTracker } from './AutoFunnelTracker';
import { ManualFunnelPlanning } from './ManualFunnelPlanning';
import { useFunnelTracking } from '@/hooks/useFunnelTracking';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGES = ['day_1', 'day_2', 'minimum_billing', 'level_up', 'two_cc'] as const;
type StageKey = typeof STAGES[number];

const STAGE_LABELS: Record<StageKey, string> = {
  day_1: 'Day 1',
  day_2: 'Day 2',
  minimum_billing: 'Min Billing',
  level_up: 'Level Up',
  two_cc: '2CC',
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

export function FunnelTracker() {
  const { totals } = useFunnelTracking();
  const [fromStage, setFromStage] = useState<StageKey>('day_1');
  const [toStage, setToStage] = useState<StageKey>('day_2');

  const fromValue = totals[fromStage] || 0;
  const toValue = totals[toStage] || 0;
  const conversionPercentage = fromValue > 0 ? Math.round((toValue / fromValue) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Live Auto Funnel Tracker */}
      <AutoFunnelTracker />

      {/* Manual Funnel Planning */}
      <ManualFunnelPlanning />

      {/* Conversion Rate */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold">Conversion Rate</h3>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Stage Selectors */}
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={fromStage} onValueChange={(v) => setFromStage(v as StageKey)}>
              <SelectTrigger className="w-28 h-9 text-xs bg-muted/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                {STAGES.slice(0, -1).map(stage => (
                  <SelectItem key={stage} value={stage} className="text-xs">{STAGE_LABELS[stage]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground font-medium">→</span>
            <Select value={toStage} onValueChange={(v) => setToStage(v as StageKey)}>
              <SelectTrigger className="w-28 h-9 text-xs bg-muted/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                {STAGES.filter(s => STAGES.indexOf(s) > STAGES.indexOf(fromStage)).map(stage => (
                  <SelectItem key={stage} value={stage} className="text-xs">{STAGE_LABELS[stage]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conversion Display */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{STAGE_LABELS[fromStage]} → {STAGE_LABELS[toStage]}</p>
              <p className={cn("text-sm mt-1", getConversionTextColor(conversionPercentage))}>
                {toValue} of {fromValue} converted
              </p>
            </div>
            <span className={cn("text-4xl font-bold tracking-tight", getConversionTextColor(conversionPercentage))}>
              {conversionPercentage}%
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted/50">
            <div
              className={cn("h-full transition-all duration-700 ease-out", getConversionColor(conversionPercentage))}
              style={{ width: `${Math.min(conversionPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
