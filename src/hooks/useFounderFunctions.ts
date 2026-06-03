import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type FounderFunctionKey =
  | 'management'
  | 'marketing'
  | 'sales'
  | 'operations'
  | 'accounts'
  | 'legal'
  | 'hr';

export type FounderStatus = 'missing' | 'inconsistent' | 'consistent';
export type FounderCadence = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'one-time' | null;

export interface FounderFunctionRow {
  function_key: FounderFunctionKey;
  status: FounderStatus;
  cadence: FounderCadence;
  notes: string | null;
  checklist: Record<string, boolean>;
}

export const FOUNDER_FUNCTIONS: { key: FounderFunctionKey; label: string; tagline: string }[] = [
  { key: 'management', label: 'Management', tagline: 'Direction, priorities and decisions.' },
  { key: 'marketing', label: 'Marketing', tagline: 'How prospects find you — content, ads and a steady flow of new leads.' },
  { key: 'sales', label: 'Sales', tagline: 'Pipeline, conversations and closing.' },
  { key: 'operations', label: 'Operations', tagline: 'Delivering the work consistently.' },
  { key: 'accounts', label: 'Accounts', tagline: 'Money in, money out, runway.' },
  { key: 'legal', label: 'Legal', tagline: 'Contracts, compliance, risk.' },
  { key: 'hr', label: 'People & HR', tagline: 'Hiring, culture, retention.' },
];

export const FUNCTION_CHECKLISTS: Record<FounderFunctionKey, string[]> = {
  management: ['Weekly review on calendar', 'Quarterly OKRs written', 'Decisions log kept', 'KPI dashboard reviewed', 'Founder 1:1s scheduled'],
  marketing: ['Content calendar planned ahead', 'Lead source tracker in place', 'Brand assets & messaging ready', 'Active funnel(s) running', 'Monthly performance review'],
  sales: ['Pipeline reviewed weekly', 'Follow-up cadence defined', 'Proposal template ready', 'Win/loss tracked', 'Quota / target set'],
  operations: ['SOPs documented', 'Tooling chosen & paid for', 'On-call / response plan', 'Weekly ops review', 'Vendor list maintained'],
  accounts: ['Books up to date', 'P&L reviewed monthly', 'Runway calculated', 'GST / tax filings on time', 'Invoices issued promptly'],
  legal: ['Standard contracts ready', 'IP / trademark filed', 'Privacy & terms published', 'Compliance reviewed yearly', 'Disputes log kept'],
  hr: ['Hiring plan written', 'Onboarding doc ready', 'Performance reviews scheduled', 'Comp bands defined', 'Culture / values shared'],
};

export function useFounderFunctions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['founder_functions', user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    gcTime: 600_000,
    queryFn: async (): Promise<Record<FounderFunctionKey, FounderFunctionRow>> => {
      const { data, error } = await supabase
        .from('founder_functions')
        .select('function_key, status, cadence, notes, checklist')
        .eq('user_id', user!.id);
      if (error) throw error;

      const map = {} as Record<FounderFunctionKey, FounderFunctionRow>;
      for (const f of FOUNDER_FUNCTIONS) {
        map[f.key] = { function_key: f.key, status: 'missing', cadence: null, notes: null, checklist: {} };
      }
      for (const r of data ?? []) {
        const k = r.function_key as FounderFunctionKey;
        if (!map[k]) continue;
        map[k] = {
          function_key: k,
          status: (r.status as FounderStatus) ?? 'missing',
          cadence: (r.cadence as FounderCadence) ?? null,
          notes: r.notes ?? null,
          checklist: (r.checklist as Record<string, boolean>) ?? {},
        };
      }
      return map;
    },
  });
}

export function useUpdateFounderFunction() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<FounderFunctionRow> & { function_key: FounderFunctionKey }) => {
      if (!user?.id) throw new Error('not authed');
      const { error } = await supabase
        .from('founder_functions')
        .upsert(
          {
            user_id: user.id,
            function_key: patch.function_key,
            status: patch.status ?? 'missing',
            cadence: patch.cadence ?? null,
            notes: patch.notes ?? null,
            checklist: patch.checklist ?? {},
          },
          { onConflict: 'user_id,function_key' },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['founder_functions', user?.id] }),
  });
}
