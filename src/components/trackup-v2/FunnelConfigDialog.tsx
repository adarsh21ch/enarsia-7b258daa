import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays, CalendarIcon, Layers, Lock } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useFunnelConfig } from '@/hooks/useFunnelConfig';

interface FunnelConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If true, dialog cannot be dismissed without saving (initial setup). */
  required?: boolean;
}

const FUNNEL_LENGTH_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 10, 14, 21, 30];

export function FunnelConfigDialog({ open, onOpenChange, required }: FunnelConfigDialogProps) {
  const { config, saveConfig, isReadOnly, leaderName, getEffectiveConfig } = useFunnelConfig();
  const effective = getEffectiveConfig();

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [length, setLength] = useState<number>(3);
  const [saving, setSaving] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setDate(config?.day_1_start ? new Date(config.day_1_start) : undefined);
      setLength(config?.funnel_length ?? 3);
    }
  }, [open, config?.day_1_start, config?.funnel_length]);

  const canSave = !!date && !!length && !isReadOnly;

  const handleSave = async () => {
    if (!date || !length) return;
    setSaving(true);
    const ok = await saveConfig({
      funnel_name: config?.funnel_name || 'My Funnel',
      funnel_length: length,
      day_1_start: format(date, 'yyyy-MM-dd'),
    });
    setSaving(false);
    if (ok) {
      toast.success('Funnel configuration saved');
      onOpenChange(false);
    } else {
      toast.error('Failed to save funnel configuration');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!required || o) onOpenChange(o); }}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => { if (required) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (required) e.preventDefault(); }}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>Funnel Configuration</DialogTitle>
          </div>
          <DialogDescription>
            {isReadOnly
              ? `Read-only — using ${leaderName || 'your leader'}'s funnel setup.`
              : 'Set when your funnel starts and how many days it runs so we can track your numbers correctly.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Day 1 Start */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-primary" />
              Funnel Day 1 Start Date
            </Label>
            {isReadOnly ? (
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                {effective?.day_1_start
                  ? format(new Date(effective.day_1_start), 'MMMM d, yyyy')
                  : 'Not set by leader'}
              </div>
            ) : (
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'MMMM d, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      setDate(d);
                      if (d) setDatePopoverOpen(false);
                    }}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Funnel Length */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              Days Per Funnel
            </Label>
            {isReadOnly ? (
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                {effective?.funnel_length
                  ? `${effective.funnel_length} ${effective.funnel_length === 1 ? 'day' : 'days'}`
                  : 'Not set'}
              </div>
            ) : (
              <Select value={String(length)} onValueChange={(v) => setLength(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select funnel length" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {FUNNEL_LENGTH_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 1 ? 'day' : 'days'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-[11px] text-muted-foreground">
              Total length of one funnel cycle. Tracking will group days from your Day 1 into funnels of this size.
            </p>
          </div>

          {date && length && !isReadOnly && (
            <div className="rounded-md bg-primary/5 border border-primary/15 px-3 py-2 text-[12px]">
              Day 1 starts <span className="font-semibold">{format(date, 'MMM d, yyyy')}</span> — each funnel runs{' '}
              <span className="font-semibold">{length} {length === 1 ? 'day' : 'days'}</span>.
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          {!required && (
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {isReadOnly ? 'Close' : 'Cancel'}
            </Button>
          )}
          {!isReadOnly && (
            <Button onClick={handleSave} disabled={!canSave || saving} className="flex-1">
              {saving ? 'Saving…' : 'Save & Continue'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
