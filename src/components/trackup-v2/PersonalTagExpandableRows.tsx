import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTrackingValue } from '@/lib/snapshotSlotUtils';

interface PersonalTagExpandableRowsProps {
  tagNames: string[];
  tagRows?: { label: string; values: number[] }[];
  tagTotals?: { label: string; value: number }[];
  columnCount: number;
  todayIndices?: number[];
}

export function PersonalTagExpandableRows({
  tagNames,
  tagRows,
  tagTotals,
  columnCount,
  todayIndices = [],
}: PersonalTagExpandableRowsProps) {
  const [expanded, setExpanded] = useState(false);

  if (tagNames.length === 0) return null;

  const isMonthlyMode = !!tagTotals;

  return (
    <>
      {/* Collapsible trigger row */}
      <tr
        className="border-t-2 border-border/40 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <td
          className="sticky left-0 z-10 bg-accent text-accent-foreground px-2 py-2 font-medium whitespace-nowrap text-xs overflow-hidden text-ellipsis"
          style={{ width: '1px' }}
        >
          <div className="flex items-center gap-1.5">
            <ChevronDown
              className={cn(
                'h-3 w-3 text-accent-foreground/70 transition-transform duration-200',
                !expanded && '-rotate-90'
              )}
            />
            <span className="text-accent-foreground text-[11px]">Personal Tags</span>
          </div>
        </td>
        {Array.from({ length: columnCount }).map((_, i) => (
          <td key={i} className="bg-accent/40 px-2 py-2" />
        ))}
      </tr>

      {/* Expanded content */}
      {expanded && (
        <>
          {isMonthlyMode && tagTotals
            ? tagTotals.map((tag) => (
                <tr key={tag.label} className="border-t border-border/20">
                  <td
                    className="sticky left-0 z-10 bg-accent text-accent-foreground px-2 py-2 text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis"
                    style={{ width: '1px' }}
                  >
                    {tag.label}
                  </td>
                  {Array.from({ length: columnCount }).map((_, i) => (
                    <td
                      key={i}
                      className={cn(
                        'px-2 py-2 text-center text-xs',
                        i === 0
                          ? (tag.value > 0 ? 'text-foreground font-medium' : 'text-muted-foreground')
                          : 'text-muted-foreground'
                      )}
                    >
                      {i === 0 ? formatTrackingValue(tag.value) : ''}
                    </td>
                  ))}
                </tr>
              ))
            : tagRows?.map((row) => (
                <tr key={row.label} className="border-t border-border/20">
                  <td
                    className="sticky left-0 z-10 bg-accent text-accent-foreground px-2 py-2 text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis"
                    style={{ width: '1px' }}
                  >
                    {row.label}
                  </td>
                  {row.values.map((val, i) => (
                    <td
                      key={i}
                      className={cn(
                        'px-2 py-2 text-center text-xs',
                        todayIndices.includes(i) && 'bg-accent/10',
                        val > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                      )}
                    >
                      {formatTrackingValue(val)}
                    </td>
                  ))}
                </tr>
              ))}
        </>
      )}
    </>
  );
}
