import { useState } from 'react';
import { ChevronDown, ChevronUp, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTrackingValue } from '@/lib/snapshotSlotUtils';
import type { KPIData } from '@/hooks/useSnapshotV2ComputedData';

interface CollapsibleKPIProps {
  kpi: KPIData;
  responseTagNames: string[];
  stageTagNames: string[];
}

export function CollapsibleKPI({ kpi, responseTagNames, stageTagNames }: CollapsibleKPIProps) {
  const [expanded, setExpanded] = useState(false);

  const compactItems = [
    { label: 'Leads', value: kpi.totalLeads },
    { label: 'Responses', value: kpi.totalResponses },
    ...(kpi.finalTagName
      ? [{ label: kpi.finalTagName, value: kpi.finalTagTotal, isStar: true }]
      : []),
  ];

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Collapsed compact row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground overflow-hidden">
          {compactItems.map((item, i) => (
            <span key={item.label} className="flex items-center gap-1 whitespace-nowrap">
              {i > 0 && <span className="text-border mx-1">·</span>}
              {item.isStar && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
              <span className="text-foreground font-semibold">
                {formatTrackingValue(item.value)}
              </span>
              <span>{item.label}</span>
            </span>
          ))}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Expanded grid */}
      {expanded && (
        <div className="px-3 pb-3 grid grid-cols-3 gap-2">
          <KPICard label="Leads" value={kpi.totalLeads} />
          <KPICard label="Responses" value={kpi.totalResponses} />
          {responseTagNames.map((name) => (
            <KPICard key={name} label={name} value={kpi.responseTagTotals[name] ?? 0} />
          ))}
          {stageTagNames.map((name) => {
            const isFinal = kpi.finalTagName === name;
            return (
              <KPICard
                key={name}
                label={name}
                value={kpi.stageTagTotals[name] ?? 0}
                isStar={isFinal}
              />
            );
          })}
          <KPICard label="Days Active" value={kpi.daysWithData} />
        </div>
      )}
    </div>
  );
}

function KPICard({
  label,
  value,
  isStar,
}: {
  label: string;
  value: number;
  isStar?: boolean;
}) {
  return (
    <div className="rounded-lg bg-muted/50 px-2.5 py-2 text-center">
      <div className="flex items-center justify-center gap-1">
        {isStar && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
        <span className="text-lg font-bold text-foreground">
          {formatTrackingValue(value)}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">
        {label}
      </p>
    </div>
  );
}
