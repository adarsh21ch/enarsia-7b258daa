import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Megaphone, TrendingUp, Compass, SlidersHorizontal, Wallet, Scale, Users, Rocket, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { BottomNav } from '@/components/layout/BottomNav';
import {
  FOUNDER_FUNCTIONS,
  FUNCTION_CHECKLISTS,
  useFounderFunctions,
  useUpdateFounderFunction,
  type FounderCadence,
  type FounderFunctionKey,
  type FounderStatus,
} from '@/hooks/useFounderFunctions';
import { useGlobalProspects } from '@/contexts/ProspectsContext';
import { useGlobalTodos } from '@/contexts/TodosContext';
import { useFunnels } from '@/hooks/useFunnels';
import { cn } from '@/lib/utils';

const ICONS: Record<FounderFunctionKey, React.ComponentType<{ className?: string }>> = {
  management: Compass,
  marketing: Megaphone,
  sales: TrendingUp,
  operations: SlidersHorizontal,
  accounts: Wallet,
  legal: Scale,
  hr: Users,
};

const STATUS_OPTS: { value: FounderStatus; label: string; cls: string }[] = [
  { value: 'missing', label: 'Missing', cls: 'bg-destructive text-destructive-foreground' },
  { value: 'inconsistent', label: 'Inconsistent', cls: 'bg-amber-500 text-white' },
  { value: 'consistent', label: 'Consistent', cls: 'bg-primary text-primary-foreground' },
];

const CADENCE_OPTS: { value: NonNullable<FounderCadence>; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'one-time', label: 'One-time' },
];

interface Props { fixedKey?: FounderFunctionKey }

export default function ManageFunction({ fixedKey }: Props) {
  const navigate = useNavigate();
  const params = useParams();
  const key = (fixedKey ?? (params.functionKey as FounderFunctionKey)) as FounderFunctionKey;
  const def = FOUNDER_FUNCTIONS.find((f) => f.key === key);

  const { data } = useFounderFunctions();
  const update = useUpdateFounderFunction();

  const row = data?.[key];
  const [status, setStatus] = useState<FounderStatus>('missing');
  const [cadence, setCadence] = useState<FounderCadence>(null);
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (row) {
      setStatus(row.status);
      setCadence(row.cadence);
      setNotes(row.notes ?? '');
      setChecklist(row.checklist ?? {});
    }
  }, [row]);

  if (!def) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Unknown function</p>
      </div>
    );
  }

  const Icon = ICONS[key];
  const items = FUNCTION_CHECKLISTS[key];
  const inPlace = items.filter((i) => checklist[i]).length;

  const persist = (patch: Partial<{ status: FounderStatus; cadence: FounderCadence; notes: string; checklist: Record<string, boolean> }>) => {
    update.mutate({ function_key: key, status, cadence, notes, checklist, ...patch });
  };

  return (
    <div className="h-screen min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="px-3 py-3 flex items-center gap-3">
          {!fixedKey && (
            <button onClick={() => navigate('/manage')} className="p-1.5 rounded-lg hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight">{def.label}</h1>
            <p className="text-[11px] text-muted-foreground truncate">{def.tagline}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 space-y-4">
        {/* Live data slot */}
        {key === 'sales' && <SalesLive />}
        {key === 'marketing' && <MarketingLive />}

        {/* Status */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">Status</h2>
          <div className="grid grid-cols-3 gap-2">
            {STATUS_OPTS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setStatus(opt.value); persist({ status: opt.value }); }}
                className={cn(
                  'text-xs font-medium py-2.5 rounded-lg border transition',
                  status === opt.value ? opt.cls + ' border-transparent' : 'bg-background border-border hover:bg-muted',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Cadence */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">Review cadence</h2>
          <div className="flex flex-wrap gap-2">
            {CADENCE_OPTS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setCadence(opt.value); persist({ cadence: opt.value }); }}
                className={cn(
                  'text-xs font-medium px-3 py-1.5 rounded-full border transition',
                  cadence === opt.value ? 'bg-primary text-primary-foreground border-transparent' : 'bg-background border-border hover:bg-muted',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Checklist */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Systems in place</h2>
            <span className="text-[11px] text-muted-foreground">{inPlace}/{items.length} in place</span>
          </div>
          <div className="space-y-1.5">
            {items.map((item) => {
              const checked = !!checklist[item];
              return (
                <label key={item} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = { ...checklist, [item]: e.target.checked };
                      setChecklist(next);
                      persist({ checklist: next });
                    }}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className={cn('text-sm', checked && 'line-through text-muted-foreground')}>{item}</span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Notes */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold mb-2">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Plans, blockers, decisions..."
            className="w-full text-sm bg-background border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            onClick={() => { persist({ notes }); toast.success('Saved'); }}
            disabled={update.isPending}
            className="mt-3 w-full bg-primary text-primary-foreground text-sm font-medium py-2.5 rounded-lg hover:bg-primary/90 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </button>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}

/** Live CRM data for the Sales function. */
function SalesLive() {
  const { prospects } = useGlobalProspects();
  const { todos } = useGlobalTodos();

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400_000);
    const active = prospects.filter((p) => !p.deleted_at);
    const addedThisWeek = active.filter((p) => new Date(p.date_added) >= weekAgo).length;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const open = (todos ?? []).filter((t) => !t.completed);
    const due = open.filter((t) => t.due_date && new Date(t.due_date) >= today && new Date(t.due_date).getTime() - today.getTime() < 86400_000).length;
    const overdue = open.filter((t) => t.due_date && new Date(t.due_date) < today).length;

    return { pipeline: active.length, addedThisWeek, due, overdue };
  }, [prospects, todos]);

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Live pipeline</h2>
        <span className="text-[10px] font-semibold text-primary tracking-widest">LIVE</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatTile icon={Users} value={stats.pipeline} label="Pipeline" />
        <StatTile icon={Rocket} value={stats.addedThisWeek} label="Added this week" />
        <StatTile icon={TrendingUp} value={stats.due} label="Follow-ups due" />
        <StatTile icon={TrendingUp} value={stats.overdue} label="Overdue" />
      </div>
    </section>
  );
}

/** Live data for the Marketing function. */
function MarketingLive() {
  const { data: funnels } = useFunnels();
  const total = funnels?.length ?? 0;
  const active = funnels?.filter((f: any) => f.is_published).length ?? 0;
  const leads = funnels?.reduce((sum: number, f: any) => sum + (f.leads_count ?? 0), 0) ?? 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Live reach</h2>
        <span className="text-[10px] font-semibold text-primary tracking-widest">LIVE</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatTile icon={Megaphone} value={leads} label="Leads captured" />
        <StatTile icon={Rocket} value={active || total} label="Active funnels" />
      </div>
    </section>
  );
}

function StatTile({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: number; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <Icon className="h-4 w-4 text-primary mb-1.5" />
      <div className="text-xl font-bold leading-none">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
