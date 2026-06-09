import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { Settings } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useCalendarStrip } from '@/hooks/useCalendarStrip';
import { Badge } from '@/components/ui/badge';
import { usePersonalSnapshotV2Write } from '@/hooks/usePersonalSnapshotV2Write';
import { useTotalSnapshotV2Write } from '@/hooks/useTotalSnapshotV2Write';
import { useTrackingSourcePreferences } from '@/hooks/useTrackingSourcePreferences';
import type { SnapshotRow } from '@/lib/snapshotSlotUtils';

interface ManualUpdateDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  responseTagNames: string[];
  stageTagNames: string[];
  finalTagName: string | null;
  personalSnapshots: SnapshotRow[];
  totalSnapshots: SnapshotRow[];
  uplineLeaderId: string | null;
  /** Leader-on-behalf target. When set, writes go to this member's snapshot rows. */
  targetUserId?: string | null;
  targetUserName?: string | null;
}

type Category = 'leads' | 'funnel';

export function ManualUpdateDrawer({
  open,
  onOpenChange,
  responseTagNames,
  stageTagNames,
  finalTagName,
  personalSnapshots,
  totalSnapshots,
  uplineLeaderId,
  targetUserId = null,
  targetUserName = null,
}: ManualUpdateDrawerProps) {
  const calendar = useCalendarStrip({
    initialDate: new Date(),
    onDateChange: (d) => setSelectedDate(d),
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [category, setCategory] = useState<Category>('leads');
  const [personalValues, setPersonalValues] = useState<Record<string, string>>({});
  const [totalValues, setTotalValues] = useState<Record<string, string>>({});
  const prevOpen = useRef(false);

  const queryClient = useQueryClient();
  const { savePersonal, saving: savingPersonal } = usePersonalSnapshotV2Write();
  const { saveTotal, saving: savingTotal } = useTotalSnapshotV2Write();
  const { personalSource, teamSource, isLoading: prefsLoading } =
    useTrackingSourcePreferences();

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Force fresh hydration when drawer opens
  useEffect(() => {
    if (open && !prevOpen.current) {
      // Drawer just opened — hydrate from latest DB snapshots
      hydrateFromSnapshots();
    }
    prevOpen.current = open;
  }, [open]);

  // Hydrate helper — always loads BOTH categories to prevent overwriting
  const hydrateFromSnapshots = useCallback(() => {
    const pSnap = personalSnapshots.find((s) => s.date === dateStr);
    const tSnap = totalSnapshots.find((s) => s.date === dateStr);

    const pVals: Record<string, string> = {};
    const tVals: Record<string, string> = {};

    if (pSnap) {
      pVals['leads'] = pSnap.total_leads > 0 ? String(pSnap.total_leads) : '';
      pVals['responses'] = pSnap.total_responses > 0 ? String(pSnap.total_responses) : '';
      // Always hydrate BOTH response and stage tags so saving one tab doesn't zero out the other
      responseTagNames.forEach((name) => {
        const v = pSnap.response_tags[name];
        pVals[name] = v && v > 0 ? String(v) : '';
      });
      stageTagNames.forEach((name) => {
        const v = pSnap.stage_tags[name];
        pVals[name] = v && v > 0 ? String(v) : '';
      });
    }

    if (tSnap) {
      tVals['leads'] = tSnap.total_leads > 0 ? String(tSnap.total_leads) : '';
      tVals['responses'] = tSnap.total_responses > 0 ? String(tSnap.total_responses) : '';
      responseTagNames.forEach((name) => {
        const v = tSnap.response_tags[name];
        tVals[name] = v && v > 0 ? String(v) : '';
      });
      stageTagNames.forEach((name) => {
        const v = tSnap.stage_tags[name];
        tVals[name] = v && v > 0 ? String(v) : '';
      });
    }

    setPersonalValues(pVals);
    setTotalValues(tVals);
  }, [dateStr, personalSnapshots, totalSnapshots, responseTagNames, stageTagNames]);

  // Re-hydrate when date changes while drawer is open
  useEffect(() => {
    if (open) {
      hydrateFromSnapshots();
    }
  }, [dateStr, open, hydrateFromSnapshots]);

  // Use full month calendar strip

  const tagNames = category === 'leads' ? responseTagNames : stageTagNames;

  const isPersonalDisabled = prefsLoading || personalSource === 'AUTO';
  const isTotalDisabled = prefsLoading || teamSource === 'AUTO';

  const hasData = useMemo(() => {
    const checkPersonal = !isPersonalDisabled;
    const checkTotal = !isTotalDisabled;
    const pHasData = checkPersonal && Object.values(personalValues).some((v) => v !== '' && v !== undefined);
    const tHasData = checkTotal && Object.values(totalValues).some((v) => v !== '' && v !== undefined);
    return pHasData || tHasData;
  }, [personalValues, totalValues, isPersonalDisabled, isTotalDisabled]);

  const handleSave = async () => {
    const pLeads = parseInt(personalValues['leads'] || '0', 10) || 0;
    const pResponses = parseInt(personalValues['responses'] || '0', 10) || 0;
    const pResponseTags: Record<string, number> = {};
    const pStageTags: Record<string, number> = {};
    responseTagNames.forEach((n) => {
      const v = parseInt(personalValues[n] || '0', 10);
      if (!isNaN(v)) pResponseTags[n] = v;
    });
    stageTagNames.forEach((n) => {
      const v = parseInt(personalValues[n] || '0', 10);
      if (!isNaN(v)) pStageTags[n] = v;
    });

    const tLeads = parseInt(totalValues['leads'] || '0', 10) || 0;
    const tResponses = parseInt(totalValues['responses'] || '0', 10) || 0;
    const tResponseTags: Record<string, number> = {};
    const tStageTags: Record<string, number> = {};
    responseTagNames.forEach((n) => {
      const v = parseInt(totalValues[n] || '0', 10);
      if (!isNaN(v)) tResponseTags[n] = v;
    });
    stageTagNames.forEach((n) => {
      const v = parseInt(totalValues[n] || '0', 10);
      if (!isNaN(v)) tStageTags[n] = v;
    });

    const finalCount = pStageTags[finalTagName || ''] ?? 0;
    const tFinalCount = tStageTags[finalTagName || ''] ?? 0;

    // Only save modes that are in MANUAL mode
    const savePromises: Promise<boolean>[] = [];

    if (!isPersonalDisabled) {
      savePromises.push(
        savePersonal({
          date: dateStr,
          source: 'MANUAL',
          totalLeads: pLeads,
          totalResponses: pResponses,
          responseTags: pResponseTags,
          stageTags: pStageTags,
          finalTag: finalTagName,
          finalTagCount: finalCount,
          funnelTag: null,
          funnelTagCount: 0,
          funnelStartDate: null,
          funnelDay: null,
          uplineLeaderId,
          responseTagNames,
          stageTagNames,
        })
      );
    }

    if (!isTotalDisabled) {
      savePromises.push(
        saveTotal({
          date: dateStr,
          source: 'MANUAL',
          totalLeads: tLeads,
          totalResponses: tResponses,
          responseTags: tResponseTags,
          stageTags: tStageTags,
          finalTag: finalTagName,
          finalTagCount: tFinalCount,
          funnelTag: null,
          funnelTagCount: 0,
          funnelStartDate: null,
          funnelDay: null,
          uplineLeaderId,
          responseTagNames,
          stageTagNames,
        })
      );
    }

    if (savePromises.length === 0) return;

    await Promise.all(savePromises);

    // Wait for cache to refresh before closing so the user sees updated data immediately
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['personal-snapshot-v2'] }),
      queryClient.invalidateQueries({ queryKey: ['total-snapshot-v2'] }),
    ]);

    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[100dvh] h-[100dvh] flex flex-col">
        <DrawerHeader className="border-b border-border/50 pb-2">
          <DrawerTitle className="text-base font-bold">Update Tracking</DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {/* Full month calendar strip */}
          <CalendarStripCompact
            selectedDate={selectedDate}
            daysInMonth={calendar.daysInMonth}
            monthYearLabel={calendar.monthYearLabel}
            onSelectDate={(d) => {
              setSelectedDate(d);
              calendar.selectDate(d);
            }}
            onPreviousMonth={calendar.goToPreviousMonth}
            onNextMonth={calendar.goToNextMonth}
          />

          {/* Today button */}
          {!isToday(selectedDate) && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs mx-4"
              style={{ width: 'calc(100% - 2rem)' }}
              onClick={() => {
                const today = new Date();
                setSelectedDate(today);
                calendar.selectDate(today);
              }}
            >
              Go to Today
            </Button>
          )}

          {/* Category tabs */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg mx-4">
            <button
              onClick={() => setCategory('leads')}
              className={cn(
                'flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors',
                category === 'leads'
                   ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground'
              )}
            >
              Leads
            </button>
            <button
              onClick={() => setCategory('funnel')}
              className={cn(
                'flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors',
                category === 'funnel'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground'
              )}
            >
              Funnel
            </button>
          </div>

          {/* Two-column input grid */}
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-x-2 gap-y-1 text-xs mx-4">
            {/* Header row */}
            <div className="font-medium text-accent-foreground py-1.5 bg-accent px-2 rounded text-center">Metric</div>
            <div className="text-center font-semibold py-1.5 bg-accent text-accent-foreground rounded flex items-center justify-center gap-1">
              Personal
              {prefsLoading ? (
                <Settings className="h-3 w-3 text-accent-foreground/60 animate-spin" />
              ) : personalSource === 'AUTO' ? (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-medium">Auto</Badge>
              ) : null}
            </div>
            <div className="text-center font-semibold py-1.5 bg-accent text-accent-foreground rounded flex items-center justify-center gap-1">
              Total
              {prefsLoading ? (
                <Settings className="h-3 w-3 text-accent-foreground/60 animate-spin" />
              ) : teamSource === 'AUTO' ? (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-medium">Auto</Badge>
              ) : null}
            </div>

            {/* Leads & Responses rows - only show in Leads tab */}
            {category === 'leads' && (
              <>
                {/* Leads row */}
                <div className="py-2 font-medium bg-accent/15 px-2 rounded">Leads</div>
                <div className="py-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={personalValues['leads'] || ''}
                    onChange={(e) =>
                      setPersonalValues((p) => ({ ...p, leads: e.target.value.replace(/\D/g, '') }))
                    }
                    placeholder="0"
                    disabled={isPersonalDisabled}
                    className={cn(
                      "w-full text-center bg-transparent border-b border-border/50 py-1 outline-none focus:border-primary text-sm placeholder:text-muted-foreground/40",
                      isPersonalDisabled && "opacity-50 cursor-not-allowed"
                    )}
                  />
                </div>
                <div className="py-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={totalValues['leads'] || ''}
                    onChange={(e) =>
                      setTotalValues((p) => ({ ...p, leads: e.target.value.replace(/\D/g, '') }))
                    }
                    placeholder="0"
                    disabled={isTotalDisabled}
                    className={cn(
                      "w-full text-center bg-transparent border-b border-border/50 py-1 outline-none focus:border-primary text-sm placeholder:text-muted-foreground/40",
                      isTotalDisabled && "opacity-50 cursor-not-allowed"
                    )}
                  />
                </div>

                {/* Responses row */}
                <div className="py-2 font-medium bg-accent/15 px-2 rounded">Responses</div>
                <div className="py-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={personalValues['responses'] || ''}
                    onChange={(e) =>
                      setPersonalValues((p) => ({
                        ...p,
                        responses: e.target.value.replace(/\D/g, ''),
                      }))
                    }
                    placeholder="0"
                    disabled={isPersonalDisabled}
                    className={cn(
                      "w-full text-center bg-transparent border-b border-border/50 py-1 outline-none focus:border-primary text-sm placeholder:text-muted-foreground/40",
                      isPersonalDisabled && "opacity-50 cursor-not-allowed"
                    )}
                  />
                </div>
                <div className="py-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={totalValues['responses'] || ''}
                    onChange={(e) =>
                      setTotalValues((p) => ({
                        ...p,
                        responses: e.target.value.replace(/\D/g, ''),
                      }))
                    }
                    placeholder="0"
                    disabled={isTotalDisabled}
                    className={cn(
                      "w-full text-center bg-transparent border-b border-border/50 py-1 outline-none focus:border-primary text-sm placeholder:text-muted-foreground/40",
                      isTotalDisabled && "opacity-50 cursor-not-allowed"
                    )}
                  />
                </div>
              </>
            )}

            {/* Tag rows */}
            {tagNames.map((name) => (
              <TagInputRow
                key={name}
                name={name}
                personalValue={personalValues[name] || ''}
                totalValue={totalValues[name] || ''}
                personalDisabled={isPersonalDisabled}
                totalDisabled={isTotalDisabled}
                onPersonalChange={(v) =>
                  setPersonalValues((p) => ({ ...p, [name]: v }))
                }
                onTotalChange={(v) =>
                  setTotalValues((p) => ({ ...p, [name]: v }))
                }
              />
            ))}
          </div>
        </div>

        {/* Save button */}
        <div className="p-4 border-t border-border/50">
          <Button
            onClick={handleSave}
            disabled={!hasData || savingPersonal || savingTotal}
            className="w-full"
          >
            {savingPersonal || savingTotal ? 'Saving...' : 'Save and Update'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ── Sub-components ────────────────────────────────── */

function TagInputRow({
  name,
  personalValue,
  totalValue,
  personalDisabled,
  totalDisabled,
  onPersonalChange,
  onTotalChange,
}: {
  name: string;
  personalValue: string;
  totalValue: string;
  personalDisabled?: boolean;
  totalDisabled?: boolean;
  onPersonalChange: (v: string) => void;
  onTotalChange: (v: string) => void;
}) {
  return (
    <>
      <div className="py-2 font-medium truncate bg-accent/15 px-2 rounded">{name}</div>
      <div className="py-1">
        <input
          type="text"
          inputMode="numeric"
          value={personalValue}
          onChange={(e) => onPersonalChange(e.target.value.replace(/\D/g, ''))}
          placeholder="0"
          disabled={personalDisabled}
          className={cn(
            "w-full text-center bg-transparent border-b border-border/50 py-1 outline-none focus:border-primary text-sm placeholder:text-muted-foreground/40",
            personalDisabled && "opacity-50 cursor-not-allowed"
          )}
        />
      </div>
      <div className="py-1">
        <input
          type="text"
          inputMode="numeric"
          value={totalValue}
          onChange={(e) => onTotalChange(e.target.value.replace(/\D/g, ''))}
          placeholder="0"
          disabled={totalDisabled}
          className={cn(
            "w-full text-center bg-transparent border-b border-border/50 py-1 outline-none focus:border-primary text-sm placeholder:text-muted-foreground/40",
            totalDisabled && "opacity-50 cursor-not-allowed"
          )}
        />
      </div>
    </>
  );
}

/* ── Compact calendar strip for full month view ── */
import { useRef as useRefCalendar } from 'react';
import { isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function CalendarStripCompact({
  selectedDate,
  daysInMonth,
  monthYearLabel,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
}: {
  selectedDate: Date;
  daysInMonth: Date[];
  monthYearLabel: string;
  onSelectDate: (d: Date) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}) {
  const scrollRef = useRefCalendar<HTMLDivElement>(null);
  const selectedRef = useRefCalendar<HTMLButtonElement>(null);

  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = selectedRef.current;
      container.scrollTo({
        left: el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2,
        behavior: 'smooth',
      });
    }
  }, [selectedDate, daysInMonth]);

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPreviousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs font-semibold">{monthYearLabel}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={scrollRef}
        className="flex overflow-x-auto px-2 pb-2 gap-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {daysInMonth.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          return (
            <button
              key={format(day, 'yyyy-MM-dd')}
              ref={isSelected ? selectedRef : null}
              onClick={() => onSelectDate(day)}
              className={cn(
                'flex flex-col items-center min-w-[40px] py-1.5 px-1 rounded-lg text-xs transition-colors',
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : isTodayDate
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted'
              )}
            >
              <span className={cn('text-[10px] font-medium', isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                {format(day, 'EEE')}
              </span>
              <span className="font-bold">{format(day, 'd')}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
