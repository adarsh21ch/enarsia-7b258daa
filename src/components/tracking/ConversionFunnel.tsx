import { useState, useMemo } from 'react';
import { Prospect, FunnelStage, FUNNEL_STAGES, FUNNEL_STAGE_ORDER } from '@/types/prospect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversionFunnelProps {
  prospects: Prospect[];
}

interface ConversionMetric {
  fromStage: FunnelStage;
  toStage: FunnelStage;
  fromCount: number;
  toCount: number;
  rate: number;
}

export function ConversionFunnel({ prospects }: ConversionFunnelProps) {
  const [fromStage, setFromStage] = useState<FunnelStage | ''>('');
  const [toStage, setToStage] = useState<FunnelStage | ''>('');
  const [customMetric, setCustomMetric] = useState<ConversionMetric | null>(null);

  const stageCounts = useMemo(() => {
    const counts: Record<FunnelStage, number> = {
      'Enrollment': 0,
      'Day 1': 0,
      'Day 2': 0,
      'Day 3': 0,
      'Minimum Bill': 0,
      'Level Up': 0,
      '2CC': 0,
    };
    prospects.forEach((p) => {
      counts[p.funnel_stage]++;
    });
    return counts;
  }, [prospects]);

  const autoConversions = useMemo((): ConversionMetric[] => {
    const stages = FUNNEL_STAGES;
    const metrics: ConversionMetric[] = [];
    
    for (let i = 0; i < stages.length - 1; i++) {
      const from = stages[i];
      const to = stages[i + 1];
      
      // Count prospects at or past each stage
      const fromCount = prospects.filter(p => FUNNEL_STAGE_ORDER[p.funnel_stage] >= FUNNEL_STAGE_ORDER[from]).length;
      const toCount = prospects.filter(p => FUNNEL_STAGE_ORDER[p.funnel_stage] >= FUNNEL_STAGE_ORDER[to]).length;
      
      metrics.push({
        fromStage: from,
        toStage: to,
        fromCount,
        toCount,
        rate: fromCount > 0 ? (toCount / fromCount) * 100 : 0,
      });
    }

    // Overall conversion
    const enrollmentCount = prospects.filter(p => FUNNEL_STAGE_ORDER[p.funnel_stage] >= FUNNEL_STAGE_ORDER['Enrollment']).length;
    const levelUpCount = prospects.filter(p => p.funnel_stage === 'Level Up').length;
    
    metrics.push({
      fromStage: 'Enrollment',
      toStage: 'Level Up',
      fromCount: enrollmentCount,
      toCount: levelUpCount,
      rate: enrollmentCount > 0 ? (levelUpCount / enrollmentCount) * 100 : 0,
    });

    return metrics;
  }, [prospects]);

  const availableToStages = useMemo(() => {
    if (!fromStage) return [];
    return FUNNEL_STAGES.filter(s => FUNNEL_STAGE_ORDER[s] > FUNNEL_STAGE_ORDER[fromStage]);
  }, [fromStage]);

  const calculateCustomConversion = () => {
    if (!fromStage || !toStage) return;

    const fromCount = prospects.filter(p => FUNNEL_STAGE_ORDER[p.funnel_stage] >= FUNNEL_STAGE_ORDER[fromStage]).length;
    const toCount = prospects.filter(p => FUNNEL_STAGE_ORDER[p.funnel_stage] >= FUNNEL_STAGE_ORDER[toStage]).length;

    setCustomMetric({
      fromStage,
      toStage,
      fromCount,
      toCount,
      rate: fromCount > 0 ? (toCount / fromCount) * 100 : 0,
    });
  };

  const getRateColor = (rate: number) => {
    if (rate >= 50) return 'text-status-positive';
    if (rate >= 25) return 'text-status-neutral';
    return 'text-status-negative';
  };

  const getRateBgColor = (rate: number) => {
    if (rate >= 50) return 'bg-status-positive-bg';
    if (rate >= 25) return 'bg-status-neutral-bg';
    return 'bg-status-negative-bg';
  };

  const getRateIcon = (rate: number) => {
    if (rate >= 50) return TrendingUp;
    if (rate >= 25) return Minus;
    return TrendingDown;
  };

  return (
    <div className="space-y-6">
      {/* Auto Conversion Metrics */}
      <div>
        <h3 className="text-sm font-medium mb-3">Automatic Conversion Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {autoConversions.map((metric, index) => {
            const Icon = getRateIcon(metric.rate);
            const isOverall = metric.fromStage === 'Enrollment' && metric.toStage === 'Level Up';
            
            return (
              <div
                key={index}
                className={cn(
                  'bg-card rounded-lg border border-border p-4 card-shadow',
                  isOverall && 'md:col-span-2 lg:col-span-1 ring-2 ring-accent/20'
                )}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span className="font-medium">{metric.fromStage}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="font-medium">{metric.toStage}</span>
                  {isOverall && <span className="text-accent">(Overall)</span>}
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className={cn('text-2xl font-bold', getRateColor(metric.rate))}>
                      {metric.rate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {metric.toCount} of {metric.fromCount} prospects
                    </p>
                  </div>
                  <div className={cn('p-2 rounded-lg', getRateBgColor(metric.rate))}>
                    <Icon className={cn('h-4 w-4', getRateColor(metric.rate))} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Conversion Selector */}
      <div className="bg-card rounded-lg border border-border p-4 card-shadow">
        <h3 className="text-sm font-medium mb-4">Custom Conversion Calculator</h3>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">From Stage</Label>
            <Select value={fromStage} onValueChange={(v) => {
              setFromStage(v as FunnelStage);
              setToStage('');
              setCustomMetric(null);
            }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select start stage..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {FUNNEL_STAGES.slice(0, -1).map((stage) => (
                  <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground hidden sm:block mb-2" />
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">To Stage</Label>
            <Select value={toStage} onValueChange={(v) => {
              setToStage(v as FunnelStage);
              setCustomMetric(null);
            }} disabled={!fromStage}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select end stage..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {availableToStages.map((stage) => (
                  <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={calculateCustomConversion}
            disabled={!fromStage || !toStage}
            className="h-9"
          >
            Calculate
          </Button>
        </div>

        {customMetric && (
          <div className={cn(
            'mt-4 p-4 rounded-lg animate-scale-in',
            getRateBgColor(customMetric.rate)
          )}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <span>{customMetric.fromStage}</span>
                  <ArrowRight className="h-4 w-4" />
                  <span>{customMetric.toStage}</span>
                </div>
                <p className={cn('text-3xl font-bold', getRateColor(customMetric.rate))}>
                  {customMetric.rate.toFixed(1)}% conversion
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {customMetric.toCount} prospects reached {customMetric.toStage} out of {customMetric.fromCount} who reached {customMetric.fromStage}
                </p>
              </div>
              <div className={cn('p-3 rounded-full', getRateBgColor(customMetric.rate))}>
                {(() => {
                  const Icon = getRateIcon(customMetric.rate);
                  return <Icon className={cn('h-6 w-6', getRateColor(customMetric.rate))} />;
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
