/**
 * Read-only Prospects view for an upline to inspect a downline member's prospects.
 *
 * Backed by the same `prospects` table — SELECT is permitted via the
 * "Users can view own or leader can view member prospects" RLS policy
 * (which uses `can_leader_view_member(auth.uid(), user_id)`).
 *
 * All mutations are intentionally absent — this page only renders data;
 * the leader cannot edit, delete, or change status of a downline member's
 * prospects from here. Defence-in-depth: RLS also denies UPDATE/DELETE
 * on rows the caller does not own.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Search, User as UserIcon, Phone, Calendar, Tag, Layers, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ProspectRow {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  date_added: string;
  funnel_stage: string | null;
  action_taken: string | null;
  prospect_status: string | null;
  personal_tags: any;
  why_need: string | null;
  notes: string | null;
  deleted_at: string | null;
}

interface MemberInfo {
  user_id: string;
  display_name: string | null;
  email: string | null;
}

export default function MemberProspectsReadOnly() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { userId } = useParams<{ userId: string }>();

  const [member, setMember] = useState<MemberInfo | null>(null);
  const [rows, setRows] = useState<ProspectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!user && !authLoading) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || !userId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ data: prof, error: profErr }, { data: pr, error: prErr }] = await Promise.all([
          supabase
            .from('profiles')
            .select('user_id, display_name, email')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase
            .from('prospects')
            .select('id, user_id, name, phone, date_added, funnel_stage, action_taken, prospect_status, personal_tags, why_need, notes, deleted_at')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .order('date_added', { ascending: false })
            .limit(500),
        ]);
        if (profErr) throw profErr;
        if (prErr) throw prErr;
        if (cancelled) return;
        setMember(prof as MemberInfo | null);
        setRows((pr ?? []) as ProspectRow[]);
      } catch (err: any) {
        if (cancelled) return;
        console.error('[MemberProspectsReadOnly]', err);
        setError(err?.message || 'Failed to load prospects');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, userId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      (r.name || '').toLowerCase().includes(q) ||
      (r.phone || '').toLowerCase().includes(q) ||
      (r.funnel_stage || '').toLowerCase().includes(q) ||
      (r.prospect_status || '').toLowerCase().includes(q),
    );
  }, [rows, query]);

  const memberLabel = member?.display_name || member?.email || 'Member';

  if (!user) return null;

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-card/90 px-3 py-2 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1100px] items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate('/team-tracking')}
            aria-label="Back to Team Tracking"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
            {memberLabel.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-bold">{memberLabel}</h1>
              <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px]">
                <Lock className="h-2.5 w-2.5" /> Read-only
              </Badge>
            </div>
            <p className="truncate text-[11px] text-muted-foreground">
              Prospects · {rows.length} total
              {member?.email ? ` · ${member.email}` : ''}
            </p>
          </div>
        </div>

        <div className="mx-auto mt-2 flex w-full max-w-[1100px] items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, phone, stage…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto px-3 py-2 pb-8">
        <div className="mx-auto w-full max-w-[1100px]">
          {loading && (
            <p className="px-2 py-10 text-center text-xs text-muted-foreground">Loading prospects…</p>
          )}
          {!loading && error && (
            <p className="px-2 py-10 text-center text-xs text-destructive">{error}</p>
          )}
          {!loading && !error && filtered.length === 0 && (
            <p className="px-2 py-10 text-center text-xs text-muted-foreground">
              {rows.length === 0
                ? 'This member has no prospects yet.'
                : 'No prospects match your search.'}
            </p>
          )}
          <div className="space-y-1.5">
            {filtered.map(r => (
              <ProspectCard key={r.id} row={r} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function ProspectCard({ row }: { row: ProspectRow }) {
  const tags = Array.isArray(row.personal_tags) ? row.personal_tags : [];
  return (
    <div className="rounded-lg border border-border/40 bg-card/60 p-2.5 transition-colors hover:bg-muted/40">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
          <UserIcon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-semibold">{row.name}</span>
            {row.prospect_status && (
              <Badge variant="secondary" className="h-4 px-1 text-[9px]">{row.prospect_status}</Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
            {row.phone && (
              <span className="flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{row.phone}</span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5" />
              {format(new Date(row.date_added), 'dd MMM yyyy')}
            </span>
            {row.funnel_stage && (
              <span className="flex items-center gap-1"><Layers className="h-2.5 w-2.5" />{row.funnel_stage}</span>
            )}
            {row.action_taken && (
              <span className="flex items-center gap-1"><Tag className="h-2.5 w-2.5" />{row.action_taken}</span>
            )}
          </div>
        </div>
      </div>
      {(tags.length > 0 || row.why_need || row.notes) && (
        <div className="mt-1.5 flex flex-wrap gap-1 pl-9">
          {tags.map((t: any, i: number) => (
            <Badge key={i} variant="outline" className="h-4 px-1 text-[9px]">
              {typeof t === 'string' ? t : (t?.label ?? '')}
            </Badge>
          ))}
          {row.why_need && (
            <span className="text-[10px] text-muted-foreground truncate">
              <span className="font-medium text-foreground/70">Need:</span> {row.why_need}
            </span>
          )}
          {row.notes && (
            <span className={cn(
              'text-[10px] text-muted-foreground',
              row.why_need ? 'truncate' : 'truncate',
            )}>
              <span className="font-medium text-foreground/70">Notes:</span> {row.notes}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
