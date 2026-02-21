import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTrackingValue } from '@/lib/snapshotSlotUtils';

interface PersonalTagExpandableRowsProps {
  tagNames: string[];
  /** For date-wise views: array of values per date column */
  tagRows?: { label: string; values: number[] }[];
  /** For monthly-totals view: single value per tag */
  tagTotals?: { label: string; value: number }[];
  /** Number of data columns (dates or funnel periods) */
  columnCount: number;
  /** Whether date columns have today highlight */
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
          className="sticky left-0 z-10 bg-muted/60 px-2 py-2 font-medium whitespace-nowrap text-xs"
          style={{ width: '90px' }}
        >
          <div className="flex items-center gap-1">
            <ChevronRight
              className={cn(
                'h-3.5 w-3.5 shrink-0 text-primary transition-transform duration-200',
                expanded && 'rotate-90'
              )}
            />
            <span className="text-foreground/80 text-[11px] truncate">Personal Tags</span>
          </div>
        </td>
        {/* Fill remaining columns with empty cells to maintain alignment */}
        {Array.from({ length: columnCount }).map((_, i) => (
          <td key={i} className="bg-muted/60 px-2 py-2" />
        ))}
      </tr>

      {/* Expanded content */}
      {expanded && (
        <>
          {/* Helper text row */}
          <tr className="border-t border-border/20">
            <td
              colSpan={columnCount + 1}
              className="bg-muted/20 px-2 py-1 text-[10px] text-muted-foreground italic"
            >
              Personal tags are workflow labels and do not affect funnel performance.
            </td>
          </tr>

          {/* Tag data rows */}
          {isMonthlyMode && tagTotals
            ? tagTotals.map((tag) => (
                <tr key={tag.label} className="border-t border-border/20">
                  <td className="sticky left-0 z-10 bg-muted/20 px-2 py-2 text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                    {tag.label}
                    <span className="text-[10px] text-muted-foreground/60 ml-1 font-normal">(Personal)</span>
                  </td>
                  {/* Render individual cells matching column count */}
                  {Array.from({ length: columnCount }).map((_, i) => (
                    <td
                      key={i}
                      className={cn(
                        'px-2 py-2 text-center text-xs bg-muted/10',
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
                  <td className="sticky left-0 z-10 bg-muted/20 px-2 py-2 text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                    {row.label}
                    <span className="text-[10px] text-muted-foreground/60 ml-1 font-normal">(Personal)</span>
                  </td>
                  {row.values.map((val, i) => (
                    <td
                      key={i}
                      className={cn(
                        'px-2 py-2 text-center text-xs bg-muted/10',
                        todayIndices.includes(i) && 'bg-muted/20',
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
