import { useFunnelTracking } from '@/hooks/useFunnelTracking';
import { EditableCell } from './EditableCell';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Sparkles, Plus } from 'lucide-react';
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

export function ManualFunnelPlanning() {
  const { rows, loading, updateCell, addRow, totals } = useFunnelTracking();

  if (loading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-amber-500/5 to-transparent">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold">Manual Funnel Planning</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Click any cell to edit. Changes save automatically. Use for targets/planning.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wide w-20">
                Funnel
              </th>
              {STAGES.map(stage => (
                <th 
                  key={stage} 
                  className="px-2 py-3 text-center text-xs font-bold text-foreground uppercase tracking-wide min-w-[80px]"
                >
                  {STAGE_LABELS[stage]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr 
                key={row.funnel_number} 
                className={cn(
                  "border-b border-border/20 transition-colors hover:bg-muted/20",
                  idx % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                )}
              >
                <td className="px-4 py-2">
                  <span className="text-sm font-semibold text-muted-foreground">{row.funnel_number}</span>
                </td>
                {STAGES.map(stage => (
                  <td key={stage} className="px-2 py-2">
                    <EditableCell
                      value={row[stage]}
                      onChange={(val) => updateCell(row.funnel_number, stage, val)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Row Button */}
      <div className="p-3 border-t border-border/30">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={addRow}
          className="text-xs text-muted-foreground hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add row
        </Button>
      </div>

      {/* Totals Row */}
      <div className="bg-amber-500/10 border-t border-amber-500/20">
        <table className="w-full">
          <tbody>
            <tr>
              <td className="px-4 py-3 w-20">
                <span className="text-sm font-bold text-foreground">TOTAL</span>
              </td>
              {STAGES.map(stage => (
                <td key={stage} className="px-2 py-3 text-center min-w-[80px]">
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{totals[stage]}</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
