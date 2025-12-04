import { useState } from 'react';
import { useFunnelTracking, FunnelRow } from '@/hooks/useFunnelTracking';
import { EditableCell } from './EditableCell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ChevronDown, ChevronUp, Flame, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const STAGES = ['day_1', 'day_2', 'minimum_billing', 'level_up', 'two_cc'] as const;
const STAGE_LABELS: Record<string, string> = {
  day_1: 'Day 1',
  day_2: 'Day 2',
  minimum_billing: 'Minimum Billing',
  level_up: 'Level Up',
  two_cc: '2CC',
};

const STEP_CONVERSIONS = [
  { from: 'start', to: 'day_1', label: 'Start → Day 1' },
  { from: 'day_1', to: 'day_2', label: 'Day 1 → Day 2' },
  { from: 'day_2', to: 'minimum_billing', label: 'Day 2 → Minimum Billing' },
  { from: 'minimum_billing', to: 'level_up', label: 'Minimum Billing → Level Up' },
  { from: 'level_up', to: 'two_cc', label: 'Level Up → 2CC' },
];

function getConversionColor(percentage: number) {
  if (percentage >= 70) return 'bg-green-500';
  if (percentage >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getConversionTextColor(percentage: number) {
  if (percentage >= 70) return 'text-green-600';
  if (percentage >= 40) return 'text-yellow-600';
  return 'text-red-500';
}

export function FunnelTracker() {
  const { rows, loading, updateCell, addRow, totals } = useFunnelTracking();
  const [fromStage, setFromStage] = useState<string>('day_1');
  const [toStage, setToStage] = useState<string>('day_2');
  const [stepConversionOpen, setStepConversionOpen] = useState(true);

  const handleCellChange = (funnelNumber: number, field: keyof FunnelRow, value: number) => {
    updateCell(funnelNumber, field, value);
  };

  // Calculate custom conversion
  const fromValue = fromStage === 'start' ? rows.length * 10 : totals[fromStage as keyof typeof totals] || 0;
  const toValue = totals[toStage as keyof typeof totals] || 0;
  const conversionPercentage = fromValue > 0 ? Math.round((toValue / fromValue) * 100) : 0;

  // Calculate step-by-step conversions
  const getStepConversion = (from: string, to: string) => {
    const fromVal = from === 'start' ? totals.day_1 + 1 : totals[from as keyof typeof totals] || 0;
    const toVal = totals[to as keyof typeof totals] || 0;
    // Special case: Start → Day 1 is always 100% if there's any data
    if (from === 'start') {
      const total = totals.day_1;
      return { from: total, to: total, percentage: total > 0 ? 100 : 0 };
    }
    const percentage = fromVal > 0 ? Math.round((toVal / fromVal) * 100) : 0;
    return { from: fromVal, to: toVal, percentage };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Funnel Table */}
      <Card className="border-0 shadow-sm bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Funnel Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 px-2 text-left text-xs font-medium text-muted-foreground">Funnel</th>
                  {STAGES.map(stage => (
                    <th key={stage} className="py-3 px-2 text-center text-xs font-medium text-muted-foreground">
                      {STAGE_LABELS[stage]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.funnel_number} className="border-b border-border/50">
                    <td className="py-2 px-2 text-sm font-medium">{row.funnel_number}</td>
                    {STAGES.map(stage => (
                      <td key={stage} className="py-2 px-2">
                        <EditableCell
                          value={row[stage]}
                          onChange={(value) => handleCellChange(row.funnel_number, stage, value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td colSpan={6} className="py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={addRow}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add row
                    </Button>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td className="py-3 px-2 text-sm font-bold">TOTAL</td>
                  {STAGES.map(stage => (
                    <td key={stage} className="py-3 px-2">
                      <div className={cn(
                        "h-8 flex items-center justify-center text-sm font-bold rounded",
                        "bg-gradient-to-r from-primary/10 to-primary/5"
                      )}>
                        {totals[stage]}
                      </div>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Analytics */}
      <Card className="border-0 shadow-sm bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              Conversion Rate <Flame className="h-5 w-5 text-orange-500" />
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={fromStage} onValueChange={setFromStage}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  {STAGES.slice(0, -1).map(stage => (
                    <SelectItem key={stage} value={stage} className="text-xs">
                      {STAGE_LABELS[stage]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={toStage} onValueChange={setToStage}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  {STAGES.filter(s => STAGES.indexOf(s) > STAGES.indexOf(fromStage as any)).map(stage => (
                    <SelectItem key={stage} value={stage} className="text-xs">
                      {STAGE_LABELS[stage]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {STAGE_LABELS[fromStage]} → {STAGE_LABELS[toStage]}
            </span>
            <span className={cn("text-3xl font-bold", getConversionTextColor(conversionPercentage))}>
              {conversionPercentage}%
            </span>
          </div>
          
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn("h-full transition-all", getConversionColor(conversionPercentage))}
              style={{ width: `${Math.min(conversionPercentage, 100)}%` }}
            />
          </div>
          
          <p className={cn("text-sm", getConversionTextColor(conversionPercentage))}>
            {toValue} of {fromValue} converted
          </p>

          {/* Step by Step Conversion */}
          <Collapsible open={stepConversionOpen} onOpenChange={setStepConversionOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
                <span className="text-sm font-medium">Step by Step Conversion Rate</span>
                {stepConversionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              {STEP_CONVERSIONS.map(step => {
                const conv = getStepConversion(step.from, step.to);
                return (
                  <div key={step.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{step.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn("font-semibold", getConversionTextColor(conv.percentage))}>
                          {conv.percentage}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({conv.to}/{conv.from})
                        </span>
                        {conv.percentage >= 70 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : conv.percentage >= 40 ? (
                          <Minus className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn("h-full transition-all", getConversionColor(conv.percentage))}
                        style={{ width: `${Math.min(conv.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
}
