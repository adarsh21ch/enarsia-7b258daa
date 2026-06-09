/**
 * QuickUpdateModal — fast Personal-snapshot update for today (or chosen date).
 * - Leader-on-behalf when targetUserId is set, else self-update.
 * - Routes writes through usePersonalSnapshotV2Write (Enarsia's update-tracking
 *   edge function), which honors onBehalfOfUserId and lets the rollup trigger
 *   cascade ancestors automatically.
 * - All tag writes go through snapshotSlotUtils via responseTagNames/stageTagNames.
 */
import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Zap } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { usePersonalSnapshotV2Write } from '@/hooks/usePersonalSnapshotV2Write';
import type { SnapshotRow } from '@/lib/snapshotSlotUtils';

interface QuickUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  responseTagNames: string[];
  stageTagNames: string[];
  finalTagName: string | null;
  personalSnapshots: SnapshotRow[];
  uplineLeaderId: string | null;
  /** When set, leader writes on this member's behalf. */
  targetUserId?: string | null;
  targetUserName?: string | null;
  /** Date to update. Defaults to today. */
  date?: string;
}

export function QuickUpdateModal({
  open,
  onOpenChange,
  responseTagNames,
  stageTagNames,
  finalTagName,
  personalSnapshots,
  uplineLeaderId,
  targetUserId = null,
  targetUserName = null,
  date,
}: QuickUpdateModalProps) {
  const isMobile = useIsMobile();
  const { savePersonal, saving } = usePersonalSnapshotV2Write();
  const dateStr = date ?? format(new Date(), 'yyyy-MM-dd');

  const [leads, setLeads] = useState('');
  const [responses, setResponses] = useState('');
  const [tagValues, setTagValues] = useState<Record<string, string>>({});

  // Hydrate on open
  useEffect(() => {
    if (!open) return;
    const snap = personalSnapshots.find((s) => s.date === dateStr);
    setLeads(snap && snap.total_leads > 0 ? String(snap.total_leads) : '');
    setResponses(snap && snap.total_responses > 0 ? String(snap.total_responses) : '');
    const next: Record<string, string> = {};
    [...responseTagNames, ...stageTagNames].forEach((n) => {
      const v = snap?.response_tags?.[n] ?? snap?.stage_tags?.[n];
      next[n] = v && v > 0 ? String(v) : '';
    });
    setTagValues(next);
  }, [open, dateStr, personalSnapshots, responseTagNames, stageTagNames]);

  const parsedTags = useMemo(() => {
    const r: Record<string, number> = {};
    const s: Record<string, number> = {};
    responseTagNames.forEach((n) => {
      const v = parseInt(tagValues[n] || '0', 10);
      if (!isNaN(v)) r[n] = v;
    });
    stageTagNames.forEach((n) => {
      const v = parseInt(tagValues[n] || '0', 10);
      if (!isNaN(v)) s[n] = v;
    });
    return { r, s };
  }, [tagValues, responseTagNames, stageTagNames]);

  const handleSave = async () => {
    const pLeads = parseInt(leads || '0', 10) || 0;
    const pResponses = parseInt(responses || '0', 10) || 0;
    const finalCount = finalTagName ? parsedTags.s[finalTagName] ?? 0 : 0;

    const ok = await savePersonal({
      date: dateStr,
      source: 'MANUAL',
      totalLeads: pLeads,
      totalResponses: pResponses,
      responseTags: parsedTags.r,
      stageTags: parsedTags.s,
      finalTag: finalTagName,
      finalTagCount: finalCount,
      funnelTag: null,
      funnelTagCount: 0,
      funnelStartDate: null,
      funnelDay: null,
      uplineLeaderId,
      responseTagNames,
      stageTagNames,
      onBehalfOfUserId: targetUserId,
    });
    if (ok) onOpenChange(false);
  };

  const headerTitle = (
    <span className="flex items-center gap-2 text-base font-bold">
      <Zap className="h-4 w-4 text-amber-500" />
      Quick Update{targetUserName ? ` — ${targetUserName}` : ''}
    </span>
  );
  const headerDesc = `Personal · ${dateStr}`;

  const body = (
    <div className="space-y-3 p-4 overflow-y-auto">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Leads</Label>
          <Input
            inputMode="numeric"
            value={leads}
            onChange={(e) => setLeads(e.target.value.replace(/\D/g, ''))}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Responses</Label>
          <Input
            inputMode="numeric"
            value={responses}
            onChange={(e) => setResponses(e.target.value.replace(/\D/g, ''))}
            placeholder="0"
          />
        </div>
      </div>

      {responseTagNames.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Response tags</Label>
          <div className="grid grid-cols-2 gap-2">
            {responseTagNames.map((n) => (
              <div key={n} className="flex items-center gap-2">
                <span className="flex-1 truncate text-xs">{n}</span>
                <Input
                  className="h-8 w-16 text-center"
                  inputMode="numeric"
                  value={tagValues[n] || ''}
                  onChange={(e) => setTagValues((p) => ({ ...p, [n]: e.target.value.replace(/\D/g, '') }))}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {stageTagNames.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Stage tags</Label>
          <div className="grid grid-cols-2 gap-2">
            {stageTagNames.map((n) => (
              <div key={n} className="flex items-center gap-2">
                <span className="flex-1 truncate text-xs">{n}</span>
                <Input
                  className="h-8 w-16 text-center"
                  inputMode="numeric"
                  value={tagValues[n] || ''}
                  onChange={(e) => setTagValues((p) => ({ ...p, [n]: e.target.value.replace(/\D/g, '') }))}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Save'}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="border-b border-border/50 pb-2">
            <DrawerTitle asChild>{headerTitle}</DrawerTitle>
            <DrawerDescription>{headerDesc}</DrawerDescription>
          </DrawerHeader>
          {body}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="border-b border-border/50 p-4 pb-2">
          <DialogTitle asChild>{headerTitle}</DialogTitle>
          <DialogDescription>{headerDesc}</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
