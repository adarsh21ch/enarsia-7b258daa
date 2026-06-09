import { useState, useEffect, useMemo } from 'react';
import {
  Prospect,
  FUNNEL_STAGES,
  ACTIONS,
  STATUSES,
  FunnelStage,
  ActionTaken,
  ProspectStatus,
} from '@/types/prospect';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { StageBadge, StatusBadge, ActionBadge } from './StatusBadge';
import {
  X,
  Phone,
  ChevronDown,
  Instagram,
  Trash2,
  MessageSquareText,
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/ActionIcons';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { logCallMade } from '@/lib/callLog';
import { cn } from '@/lib/utils';
import { useTrackingTags } from '@/hooks/useTrackingTags';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProspectDetailModalProps {
  prospect: Prospect;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
  onDelete: (id: string) => Promise<boolean | Prospect | null>;
}

function EditableTag<T extends string>({
  value,
  options,
  onChange,
  renderBadge,
  placeholder = 'Select',
  title = 'Select',
}: {
  value: T | null | undefined;
  options: readonly T[];
  onChange: (val: T | null) => void;
  renderBadge: (val: T) => React.ReactNode;
  placeholder?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
      >
        {value ? (
          renderBadge(value)
        ) : (
          <span className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-0.5">
            {placeholder}
          </span>
        )}
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[88vw] max-w-[360px] max-h-[75vh] p-0 gap-0 overflow-hidden rounded-2xl [&>button]:hidden border border-border/60 shadow-2xl">
          <div className="px-3.5 pt-3 pb-2.5 border-b border-border/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[55vh]">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={cn(
                  'w-full text-left px-3 py-2.5 text-sm rounded-xl hover:bg-muted/60 transition-colors min-h-[44px] flex items-center',
                  value === opt && 'bg-primary/10 text-primary font-medium',
                )}
              >
                {opt}
              </button>
            ))}
            {value && (
              <button
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 text-sm rounded-xl hover:bg-destructive/10 text-muted-foreground min-h-[44px]"
              >
                Clear
              </button>
            )}
          </div>
          <div className="border-t border-border/40 p-2.5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full min-h-[44px] rounded-xl bg-muted/60 hover:bg-muted text-sm font-semibold border border-border/60"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 min-h-[44px]">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <div className="flex-1 flex justify-end min-w-0">{children}</div>
    </div>
  );
}

function InlineInput({
  value,
  onChange,
  onCommit,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      className="w-full bg-transparent text-right text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:bg-muted/40 rounded-md px-2 py-1 -mr-2 transition-colors"
    />
  );
}

function Section({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {title && (
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
          {title}
        </h4>
      )}
      <div className="bg-muted/30 rounded-2xl divide-y divide-border/40 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function ProspectDetailBody({
  prospect,
  onUpdate,
  onDelete,
  onClose,
}: {
  prospect: Prospect;
  onUpdate: ProspectDetailModalProps['onUpdate'];
  onDelete: ProspectDetailModalProps['onDelete'];
  onClose: () => void;
}) {
  const { callingTrackingTags, stageTrackingTags } = useTrackingTags();
  const actionOptions =
    callingTrackingTags.length > 0 ? callingTrackingTags : ACTIONS;
  const stageOptions =
    stageTrackingTags.length > 0 ? stageTrackingTags : FUNNEL_STAGES;

  const [data, setData] = useState<Record<string, any>>({});
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setData({
      name: prospect.name,
      phone: prospect.phone,
      phone2: (prospect as any).phone2 || '',
      address: prospect.address || '',
      age_or_dob: prospect.age_or_dob || '',
      gender: prospect.gender || '',
      profession: prospect.profession || '',
      instagram: prospect.instagram || '',
      email: prospect.email || '',
      why_need: prospect.why_need || '',
      notes: prospect.notes || '',
      funnel_stage: prospect.funnel_stage,
      action_taken: prospect.action_taken,
      prospect_status: prospect.prospect_status,
    });
  }, [prospect.id]);

  const set = (k: string, v: any) => setData((p) => ({ ...p, [k]: v }));

  const commit = async (field: string) => {
    const current = data[field];
    const original = (prospect as any)[field];
    const a = current === '' ? null : current;
    const b = original === '' ? null : original;
    if (a !== b) {
      try {
        await onUpdate(prospect.id, { [field]: a } as any);
      } catch {
        toast.error('Failed to save');
      }
    }
  };

  const commitTag = async (field: string, val: any) => {
    set(field, val);
    try {
      await onUpdate(prospect.id, { [field]: val } as any);
    } catch {
      toast.error('Failed to save');
    }
  };

  const cleanPhone = (p: string) => p.replace(/[^0-9+]/g, '');
  const phone = cleanPhone(prospect.phone || '');

  const initials = useMemo(() => {
    const n = (prospect.name || '?').trim();
    const parts = n.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?';
  }, [prospect.name]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await onDelete(prospect.id);
      if (res) {
        toast.success('Lead deleted');
        onClose();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-border/40 shrink-0">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground font-semibold text-lg shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-foreground truncate">
            {data.name || prospect.name}
          </h2>
          <p className="text-xs text-muted-foreground">
            Added {format(parseISO(prospect.date_added), 'MMM d, yyyy')}
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              title="Delete lead"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove <strong>{prospect.name}</strong>{' '}
                and their data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-full shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>


      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2">
          <a
            href={`tel:${phone}`}
            onClick={() => logCallMade({ prospectId: prospect.id, name: prospect.name, phone: prospect.phone })}
            className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors active:scale-[0.97]"
          >
            <Phone className="h-5 w-5 text-accent" />
            <span className="text-xs font-medium">Call</span>
          </a>
          <a
            href={`sms:${phone}`}
            className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors active:scale-[0.97]"
          >
            <MessageSquareText className="h-5 w-5 text-blue-500" />
            <span className="text-xs font-medium">Text</span>
          </a>
          <a
            href={`https://wa.me/${phone}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors active:scale-[0.97]"
          >
            <WhatsAppIcon className="h-5 w-5 text-green-600" />
            <span className="text-xs font-medium">WhatsApp</span>
          </a>
        </div>

        {/* Personal Info */}
        <Section title="Personal Info">
          <Row label="Name">
            <InlineInput
              value={data.name || ''}
              onChange={(v) => set('name', v)}
              onCommit={() => commit('name')}
              placeholder="Full name"
            />
          </Row>
          <Row label="Phone 1">
            <InlineInput
              value={data.phone || ''}
              onChange={(v) => set('phone', v)}
              onCommit={() => commit('phone')}
              placeholder="Primary"
              type="tel"
            />
          </Row>
          <Row label="Phone 2">
            <InlineInput
              value={data.phone2 || ''}
              onChange={(v) => set('phone2', v)}
              onCommit={() => commit('phone2')}
              placeholder="Alternate"
              type="tel"
            />
          </Row>
          <Row label="Address">
            <InlineInput
              value={data.address || ''}
              onChange={(v) => set('address', v)}
              onCommit={() => commit('address')}
              placeholder="City, State"
            />
          </Row>
          <Row label="Age / DOB">
            <InlineInput
              value={data.age_or_dob || ''}
              onChange={(v) => set('age_or_dob', v)}
              onCommit={() => commit('age_or_dob')}
              placeholder="25 or 14-03-1995"
            />
          </Row>
          <Row label="Gender">
            <InlineInput
              value={data.gender || ''}
              onChange={(v) => set('gender', v)}
              onCommit={() => commit('gender')}
              placeholder="M / F"
            />
          </Row>
          <Row label="Profession">
            <InlineInput
              value={data.profession || ''}
              onChange={(v) => set('profession', v)}
              onCommit={() => commit('profession')}
              placeholder="Student / Job"
            />
          </Row>
        </Section>

        {/* Social */}
        <Section title="Social">
          <Row label="Instagram">
            <div className="flex items-center gap-1 w-full">
              <InlineInput
                value={data.instagram || ''}
                onChange={(v) => set('instagram', v)}
                onCommit={() => commit('instagram')}
                placeholder="@username"
              />
              {data.instagram && (
                <button
                  onClick={() => {
                    const u = data.instagram.replace('@', '').trim();
                    if (u) window.open(`https://instagram.com/${u}`, '_blank');
                  }}
                  className="text-pink-500 hover:text-pink-600 p-1 shrink-0"
                >
                  <Instagram className="h-4 w-4" />
                </button>
              )}
            </div>
          </Row>
          <Row label="Email">
            <InlineInput
              value={data.email || ''}
              onChange={(v) => set('email', v)}
              onCommit={() => commit('email')}
              placeholder="email@example.com"
              type="email"
            />
          </Row>
        </Section>

        {/* Status */}
        <Section title="Status">
          <Row label="Response">
            <EditableTag
              value={data.action_taken as ActionTaken}
              options={actionOptions as readonly ActionTaken[]}
              onChange={(v) => commitTag('action_taken', v)}
              renderBadge={(v) => <ActionBadge action={v} />}
              placeholder="Set response"
            />
          </Row>
          <Row label="Stage">
            <EditableTag
              value={data.funnel_stage as FunnelStage}
              options={stageOptions as readonly FunnelStage[]}
              onChange={(v) => commitTag('funnel_stage', v)}
              renderBadge={(v) => <StageBadge stage={v} />}
              placeholder="Set stage"
            />
          </Row>
          <Row label="Quality">
            <EditableTag
              value={data.prospect_status as ProspectStatus}
              options={STATUSES}
              onChange={(v) => commitTag('prospect_status', v)}
              renderBadge={(v) => <StatusBadge status={v} />}
              placeholder="Set quality"
            />
          </Row>
        </Section>

        {/* Why / Need */}
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
            Why / Need
          </h4>
          <Textarea
            value={data.why_need || ''}
            onChange={(e) => set('why_need', e.target.value)}
            onBlur={() => commit('why_need')}
            placeholder="Reason for earning..."
            className="min-h-[70px] text-sm resize-none rounded-2xl bg-muted/30 border-border/40"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
            Notes
          </h4>
          <Textarea
            value={data.notes || ''}
            onChange={(e) => set('notes', e.target.value)}
            onBlur={() => commit('notes')}
            placeholder="Call notes..."
            className="min-h-[80px] text-sm resize-none rounded-2xl bg-muted/30 border-border/40"
          />
        </div>

        <p className="text-[11px] text-muted-foreground text-center pt-2">
          Updated{' '}
          {formatDistanceToNow(parseISO(prospect.updated_at), {
            addSuffix: true,
          })}
        </p>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-3 border-t border-border/40 bg-background/80 backdrop-blur-sm">
        <Button
          variant="secondary"
          onClick={onClose}
          className="w-full h-10 gap-2"
        >
          <X className="h-4 w-4" />
          Close
        </Button>
      </div>
    </div>
  );
}


export function ProspectDetailModal({
  prospect,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}: ProspectDetailModalProps) {
  const isMobile = useIsMobile();

  // iPhone-style centered popup on every viewport — tap outside to dismiss
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          isMobile
            ? "p-0 gap-0 overflow-hidden rounded-3xl [&>button]:hidden w-[calc(100vw-1.5rem)] max-w-[420px] max-h-[85vh] shadow-2xl border border-border/50"
            : "max-w-[600px] p-0 gap-0 overflow-hidden rounded-3xl [&>button]:hidden max-h-[85vh] shadow-2xl border border-border/50"
        }
      >
        <ProspectDetailBody
          prospect={prospect}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
