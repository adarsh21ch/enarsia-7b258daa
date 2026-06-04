import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Crown, Download, Loader2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useGlobalProspects } from '@/contexts/ProspectsContext';
import { useSheets } from '@/hooks/useSheets';
import { runExport, type GroupingMode } from './exportEngine';

type Range = 'all' | '7d' | '30d' | '90d' | 'this_month' | 'last_month' | 'custom';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  // Pre-select a sheet (e.g. when launched from a specific sheet tab)
  initialSheetId?: string | null;
}

export function ExportDialog({ open, onOpenChange, initialSheetId }: Props) {
  const { checkFeature } = usePermissions();
  const isPro = checkFeature('export_data');
  const { prospects } = useGlobalProspects();
  const { sheets } = useSheets();

  const [scope, setScope] = useState<'all' | 'current' | 'pick'>(initialSheetId ? 'current' : 'all');
  const [pickedSheets, setPickedSheets] = useState<string[]>(initialSheetId ? [initialSheetId] : []);
  const [range, setRange] = useState<Range>('all');
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [grouping, setGrouping] = useState<GroupingMode>('combined');
  const [busy, setBusy] = useState(false);

  const dateRange = useMemo(() => {
    const now = new Date();
    const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
    const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };
    switch (range) {
      case 'all': return {};
      case '7d': return { from: startOfDay(new Date(now.getTime() - 7*86400000)), to: endOfDay(now) };
      case '30d': return { from: startOfDay(new Date(now.getTime() - 30*86400000)), to: endOfDay(now) };
      case '90d': return { from: startOfDay(new Date(now.getTime() - 90*86400000)), to: endOfDay(now) };
      case 'this_month': return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
      case 'last_month': {
        const f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const t = new Date(now.getFullYear(), now.getMonth(), 0, 23,59,59,999);
        return { from: f, to: t };
      }
      case 'custom': return { from, to };
    }
  }, [range, from, to]);

  const requiresPro = grouping !== 'combined' || range === 'custom' || (range !== 'all' && range !== '30d') || scope === 'pick';

  const handleExport = async () => {
    if (requiresPro && !isPro) {
      toast.error('Upgrade to Pro to use advanced export options');
      return;
    }
    setBusy(true);
    try {
      const sheetIds = scope === 'current'
        ? (initialSheetId ? [initialSheetId] : [])
        : scope === 'pick' ? pickedSheets : undefined;

      const { count, bucketCount } = runExport({
        prospects,
        sheets,
        scope: scope === 'all' ? 'all' : 'sheets',
        sheetIds,
        dateRange,
        grouping,
      });
      if (count === 0) {
        toast.error('No leads match the selected filters');
      } else {
        toast.success(`Exported ${count} leads across ${bucketCount} tab${bucketCount === 1 ? '' : 's'}`);
        onOpenChange(false);
      }
    } catch (e) {
      console.error(e);
      toast.error('Export failed');
    } finally {
      setBusy(false);
    }
  };

  const ProBadge = () => (
    <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
      <Crown className="h-2.5 w-2.5" /> PRO
    </span>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export Leads
          </DialogTitle>
          <DialogDescription className="text-xs">
            Download your leads as an Excel file. Pro users can split by sheet, month, or week.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Scope */}
          <div>
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Which leads</Label>
            <RadioGroup value={scope} onValueChange={(v: any) => setScope(v)} className="mt-2 space-y-1.5">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="all" /> All leads ({prospects.length})
              </label>
              {initialSheetId && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="current" /> Current sheet only
                </label>
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="pick" /> Pick sheets {!isPro && <ProBadge />}
              </label>
            </RadioGroup>
            {scope === 'pick' && (
              <div className="mt-2 max-h-32 overflow-y-auto rounded-md border border-border/50 p-2 space-y-1">
                {sheets.length === 0 && <p className="text-xs text-muted-foreground">No sheets yet.</p>}
                {sheets.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={pickedSheets.includes(s.id)}
                      onCheckedChange={(c) => {
                        setPickedSheets((prev) => c ? [...prev, s.id] : prev.filter((x) => x !== s.id));
                      }}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Date range */}
          <div>
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Date range</Label>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {([
                ['all', 'All time', false],
                ['30d', 'Last 30 days', false],
                ['7d', 'Last 7 days', true],
                ['90d', 'Last 90 days', true],
                ['this_month', 'This month', true],
                ['last_month', 'Last month', true],
                ['custom', 'Custom range', true],
              ] as [Range, string, boolean][]).map(([val, lbl, pro]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRange(val)}
                  className={cn(
                    'text-xs px-2.5 py-1.5 rounded-md border transition-colors text-left flex items-center justify-between',
                    range === val ? 'bg-primary text-primary-foreground border-primary' : 'border-border/60 hover:bg-muted/60'
                  )}
                >
                  <span>{lbl}</span>
                  {pro && !isPro && <Crown className="h-3 w-3 opacity-70" />}
                </button>
              ))}
            </div>
            {range === 'custom' && (
              <div className="mt-2 flex gap-2">
                {([
                  ['From', from, setFrom],
                  ['To', to, setTo],
                ] as const).map(([lbl, val, setter]) => (
                  <Popover key={lbl}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 justify-start text-xs font-normal">
                        <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                        {val ? format(val, 'dd MMM yyyy') : lbl}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start">
                      <Calendar mode="single" selected={val} onSelect={setter as any} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                ))}
              </div>
            )}
          </div>

          {/* Grouping */}
          <div>
            <Label className="text-xs font-semibold uppercase text-muted-foreground">How to organize the file</Label>
            <RadioGroup value={grouping} onValueChange={(v: any) => setGrouping(v)} className="mt-2 space-y-1.5">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="combined" /> One combined sheet
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="sheet" /> One tab per existing Sheet {!isPro && <ProBadge />}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="month" /> One tab per month {!isPro && <ProBadge />}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="week" /> One tab per week {!isPro && <ProBadge />}
              </label>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleExport} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export to Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
