import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { format, addDays, subDays, startOfWeek, isToday, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
}: ManualUpdateDrawerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [category, setCategory] = useState<Category>('leads');
  const [personalValues, setPersonalValues] = useState<Record<string, string>>({});
  const [totalValues, setTotalValues] = useState<Record<string, string>>({});
  const prevOpen = useRef(false);

  const { savePersonal, saving: savingPersonal } = usePersonalSnapshotV2Write();
  const { saveTotal, saving: savingTotal } = useTotalSnapshotV2Write();
  const { personalSource, teamSource, setPersonalSource, setTeamSource } =
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

  // Hydrate helper
  const hydrateFromSnapshots = useCallback(() => {
    const pSnap = personalSnapshots.find((s) => s.date === dateStr);
    const tSnap = totalSnapshots.find((s) => s.date === dateStr);

    const pVals: Record<string, string> = {};
    const tVals: Record<string, string> = {};

    if (pSnap) {
      pVals['leads'] = pSnap.total_leads > 0 ? String(pSnap.total_leads) : '';
      pVals['responses'] = pSnap.total_responses > 0 ? String(pSnap.total_responses) : '';
      const tags = category === 'leads' ? responseTagNames : stageTagNames;
      const source = category === 'leads' ? pSnap.response_tags : pSnap.stage_tags;
      tags.forEach((name) => {
        const v = source[name];
        pVals[name] = v && v > 0 ? String(v) : '';
      });
    }

    if (tSnap) {
      tVals['leads'] = tSnap.total_leads > 0 ? String(tSnap.total_leads) : '';
      tVals['responses'] = tSnap.total_responses > 0 ? String(tSnap.total_responses) : '';
      const tags = category === 'leads' ? responseTagNames : stageTagNames;
      const source = category === 'leads' ? tSnap.response_tags : tSnap.stage_tags;
      tags.forEach((name) => {
        const v = source[name];
        tVals[name] = v && v > 0 ? String(v) : '';
      });
    }

    setPersonalValues(pVals);
    setTotalValues(tVals);
  }, [dateStr, personalSnapshots, totalSnapshots, category, responseTagNames, stageTagNames]);

  // Re-hydrate when date or category changes while drawer is open
  useEffect(() => {
    if (open) {
      hydrateFromSnapshots();
    }
  }, [dateStr, category, open, hydrateFromSnapshots]);

  // Date strip
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const tagNames = category === 'leads' ? responseTagNames : stageTagNames;

  const hasData = useMemo(() => {
    const allVals = { ...personalValues, ...totalValues };
    return Object.values(allVals).some((v) => v !== '' && v !== undefined);
  }, [personalValues, totalValues]);

  const isPersonalDisabled = personalSource === 'AUTO';
  const isTotalDisabled = teamSource === 'AUTO';

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

    // Map source preferences to write hook params
    const pSource = personalSource === 'AUTO' ? 'APPLICATION' : 'MANUAL';
    const tSource = teamSource === 'AUTO' ? 'TEAM_MEMBERS' : 'MANUAL';

    await Promise.all([
      savePersonal({
        date: dateStr,
        source: pSource as 'MANUAL' | 'APPLICATION',
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
      }),
      saveTotal({
        date: dateStr,
        source: tSource as 'MANUAL' | 'TEAM_MEMBERS',
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
      }),
    ]);

    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[100dvh] h-[100dvh] flex flex-col">
        <DrawerHeader className="border-b border-border/50 pb-2">
          <DrawerTitle className="text-base font-bold">Update Tracking</DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Date strip */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSelectedDate((d) => subDays(d, 7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 flex gap-1">
              {weekDays.map((d) => {
                const isSelected = format(d, 'yyyy-MM-dd') === dateStr;
                const isTodayDate = isToday(d);
                return (
                  <button
                    key={format(d, 'yyyy-MM-dd')}
                    onClick={() => setSelectedDate(d)}
                    className={cn(
                      'flex-1 flex flex-col items-center py-1.5 rounded-lg text-xs transition-colors',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : isTodayDate
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    )}
                  >
                    <span className="text-[10px] font-medium">
                      {format(d, 'EEE')}
                    </span>
                    <span className="font-bold">{format(d, 'd')}</span>
                  </button>
                );
              })}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSelectedDate((d) => addDays(d, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Today button */}
          {!isToday(selectedDate) && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => setSelectedDate(new Date())}
            >
              Go to Today
            </Button>
          )}

          {/* Category tabs */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
            <button
              onClick={() => setCategory('leads')}
              className={cn(
                'flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors',
                category === 'leads'
                  ? 'bg-background shadow-sm text-foreground'
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
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              Funnel
            </button>
          </div>

          {/* Two-column input grid */}
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-x-2 gap-y-1 text-xs">
            {/* Header row */}
            <div className="font-medium text-muted-foreground py-1 bg-muted/30 px-2 rounded">Metric</div>
            <div className="text-center font-semibold py-1 bg-primary/10 flex items-center justify-center gap-1">
              Personal
              <SourceGear
                value={personalSource}
                options={[
                  { label: 'Manual', value: 'MANUAL' },
                  { label: 'Application', value: 'AUTO' },
                ]}
                onChange={(v) => setPersonalSource(v as any)}
              />
            </div>
            <div className="text-center font-semibold py-1 bg-primary/10 flex items-center justify-center gap-1">
              Total
              <SourceGear
                value={teamSource}
                options={[
                  { label: 'Manual', value: 'MANUAL' },
                  { label: 'Automated', value: 'AUTO' },
                ]}
                onChange={(v) => setTeamSource(v as any)}
              />
            </div>

            {/* Leads row */}
            <div className="py-2 font-medium">Leads</div>
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
            <div className="py-2 font-medium">Responses</div>
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

function SourceGear({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="p-0.5 rounded hover:bg-muted transition-colors">
          <Settings className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-1" align="center" side="bottom">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'w-full text-left px-2 py-1.5 text-xs rounded transition-colors',
              value === opt.value
                ? 'bg-primary/10 text-primary font-semibold'
                : 'hover:bg-muted text-foreground'
            )}
          >
            {opt.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

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
      <div className="py-2 font-medium truncate bg-muted/30 px-2 rounded">{name}</div>
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
