import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Crown, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useGlobalProspects } from '@/contexts/ProspectsContext';
import { useSheets } from '@/hooks/useSheets';
import { runExport, type GroupingMode } from './exportEngine';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: Props) {
  const { checkFeature } = usePermissions();
  const isPro = checkFeature('export_data');
  const { prospects } = useGlobalProspects();
  const { sheets } = useSheets();

  const [grouping, setGrouping] = useState<GroupingMode>('combined');
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (grouping !== 'combined' && !isPro) {
      toast.error('Upgrade to Pro to split your export by sheet or month');
      return;
    }
    setBusy(true);
    try {
      const { count, bucketCount } = runExport({ prospects, sheets, grouping });
      if (count === 0) {
        toast.error('No leads to export yet');
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
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export Leads
          </DialogTitle>
          <DialogDescription className="text-xs">
            Download all your leads ({prospects.length}) as an Excel file. Pro users can split the file by sheet or by month.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">How to organize</Label>
          <RadioGroup value={grouping} onValueChange={(v: any) => setGrouping(v)} className="mt-2 space-y-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer p-2.5 rounded-md border border-border/60 hover:bg-muted/40">
              <RadioGroupItem value="combined" />
              <div className="flex-1">
                <div className="font-medium">One file (all leads together)</div>
                <div className="text-[11px] text-muted-foreground">Everything in a single sheet — simple and quick.</div>
              </div>
            </label>
            <label className={`flex items-center gap-2 text-sm cursor-pointer p-2.5 rounded-md border border-border/60 hover:bg-muted/40 ${!isPro ? 'opacity-90' : ''}`}>
              <RadioGroupItem value="sheet" />
              <div className="flex-1">
                <div className="font-medium flex items-center">Split by sheet {!isPro && <ProBadge />}</div>
                <div className="text-[11px] text-muted-foreground">One tab per existing sheet inside the Excel file.</div>
              </div>
            </label>
            <label className={`flex items-center gap-2 text-sm cursor-pointer p-2.5 rounded-md border border-border/60 hover:bg-muted/40 ${!isPro ? 'opacity-90' : ''}`}>
              <RadioGroupItem value="month" />
              <div className="flex-1">
                <div className="font-medium flex items-center">Split by month {!isPro && <ProBadge />}</div>
                <div className="text-[11px] text-muted-foreground">One tab per month (newest first). Inside each tab, leads are sorted by date.</div>
              </div>
            </label>
          </RadioGroup>
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
