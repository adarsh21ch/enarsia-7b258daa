import { Phone, MessageSquare, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KPIData } from '@/hooks/useSnapshotV2ComputedData';

interface CallingTrackingBoxProps {
  kpi: KPIData;
  responseTagNames: string[];
  className?: string;
}

/**
 * Compact "Calling" KPI box — totals + per-response-tag breakdown.
 * Read-only. Mirrors website's CallingTrackingBox layout.
 */
export function CallingTrackingBox({ kpi, responseTagNames, className }: CallingTrackingBoxProps) {
  return (
    <div className={cn(
      'rounded-xl border border-border/40 bg-card/60 p-3',
      className,
    )}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 text-primary" />
          <h4 className="text-xs font-semibold">Calling</h4>
        </div>
        <span className="text-[10px] text-muted-foreground">{kpi.daysWithData}d data</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <Stat label="Total Leads" value={kpi.totalLeads} accent="primary" icon={<Phone className="h-3 w-3" />} />
        <Stat label="Responses" value={kpi.totalResponses} accent="emerald" icon={<MessageSquare className="h-3 w-3" />} />
      </div>

      {responseTagNames.length > 0 && (
        <div className="space-y-0.5 border-t border-border/30 pt-1.5">
          {responseTagNames.map(name => (
            <div key={name} className="flex items-center justify-between rounded px-1.5 py-0.5 text-[11px] hover:bg-muted/40">
              <span className="truncate text-muted-foreground">{name}</span>
              <span className="font-semibold tabular-nums">{kpi.responseTagTotals[name] ?? 0}</span>
            </div>
          ))}
        </div>
      )}

      {kpi.finalTagName && (
        <div className="mt-2 flex items-center justify-between rounded-md bg-amber-500/10 px-2 py-1 text-[11px]">
          <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
            <Trophy className="h-3 w-3" /> {kpi.finalTagName}
          </span>
          <span className="font-bold tabular-nums">{kpi.finalTagTotal}</span>
        </div>
      )}
    </div>
  );
}

function Stat({
  label, value, accent, icon,
}: { label: string; value: number; accent: 'primary' | 'emerald'; icon: React.ReactNode }) {
  return (
    <div className={cn(
      'rounded-lg px-2 py-1.5',
      accent === 'primary' && 'bg-primary/10',
      accent === 'emerald' && 'bg-emerald-500/10',
    )}>
      <div className={cn(
        'flex items-center gap-1 text-[10px]',
        accent === 'primary' && 'text-primary',
        accent === 'emerald' && 'text-emerald-700 dark:text-emerald-400',
      )}>
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="text-base font-bold tabular-nums">{value}</div>
    </div>
  );
}
