import { useState, useCallback, useMemo, useEffect } from 'react';
import { format, addDays, subDays, startOfWeek, isToday, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { usePersonalSnapshotV2Write } from '@/hooks/usePersonalSnapshotV2Write';
import { useTotalSnapshotV2Write } from '@/hooks/useTotalSnapshotV2Write';
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

  const { savePersonal, saving: savingPersonal } = usePersonalSnapshotV2Write();
  const { saveTotal, saving: savingTotal } = useTotalSnapshotV2Write();

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Load existing snapshot data when date changes
  useEffect(() => {
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

    await Promise.all([
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
      }),
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
            <div className="font-medium text-muted-foreground py-1">Field</div>
            <div className="text-center font-semibold py-1 flex items-center justify-center gap-1">
              Personal
            </div>
            <div className="text-center font-semibold py-1 flex items-center justify-center gap-1">
              Total
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
                placeholder="--"
                className="w-full text-center bg-transparent border-b border-border/50 py-1 outline-none focus:border-primary text-sm"
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
                placeholder="--"
                className="w-full text-center bg-transparent border-b border-border/50 py-1 outline-none focus:border-primary text-sm"
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
                placeholder="--"
                className="w-full text-center bg-transparent border-b border-border/50 py-1 outline-none focus:border-primary text-sm"
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
                placeholder="--"
                className="w-full text-center bg-transparent border-b border-border/50 py-1 outline-none focus:border-primary text-sm"
              />
            </div>

            {/* Tag rows */}
            {tagNames.map((name) => (
              <>
                <div key={`label-${name}`} className="py-2 font-medium truncate">
                  {name}
                </div>
                <div key={`personal-${name}`} className="py-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={personalValues[name] || ''}
                    onChange={(e) =>
                      setPersonalValues((p) => ({
                        ...p,
                        [name]: e.target.value.replace(/\D/g, ''),
                      }))
                    }
                    placeholder="--"
                    className="w-full text-center bg-transparent border-b border-border/50 py-1 outline-none focus:border-primary text-sm"
                  />
                </div>
                <div key={`total-${name}`} className="py-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={totalValues[name] || ''}
                    onChange={(e) =>
                      setTotalValues((p) => ({
                        ...p,
                        [name]: e.target.value.replace(/\D/g, ''),
                      }))
                    }
                    placeholder="--"
                    className="w-full text-center bg-transparent border-b border-border/50 py-1 outline-none focus:border-primary text-sm"
                  />
                </div>
              </>
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
