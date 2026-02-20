import { useMemo } from 'react';
import { Info, Tag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Shows real-time count of leads under each user-created personal tag.
 * Read-only — no editing, no historical breakdown.
 */
export function PersonalTagsDistribution() {
  const { user } = useAuth();
  const { leadsNonTrackingTags, stageNonTrackingTags } = useTrackingFormatContext();

  // Combine unique personal tags from both leads and stages
  const allPersonalTags = useMemo(() => {
    const combined = new Set([...leadsNonTrackingTags, ...stageNonTrackingTags]);
    return Array.from(combined);
  }, [leadsNonTrackingTags, stageNonTrackingTags]);

  // Query prospects' personal_tags + action_taken + funnel_stage to count occurrences
  const { data: tagCounts } = useQuery({
    queryKey: ['personal-tag-distribution', user?.id, allPersonalTags],
    queryFn: async () => {
      if (!user || allPersonalTags.length === 0) return {};

      const { data, error } = await supabase
        .from('prospects')
        .select('action_taken, funnel_stage, personal_tags')
        .eq('user_id', user.id)
        .is('deleted_at', null);

      if (error) throw error;

      const counts: Record<string, number> = {};
      allPersonalTags.forEach((tag) => (counts[tag] = 0));

      (data || []).forEach((p) => {
        // Count from action_taken
        if (p.action_taken && counts[p.action_taken] !== undefined) {
          counts[p.action_taken]++;
        }
        // Count from funnel_stage
        if (p.funnel_stage && counts[p.funnel_stage] !== undefined) {
          counts[p.funnel_stage]++;
        }
        // Count from personal_tags array
        const pTags = p.personal_tags as string[] | null;
        if (Array.isArray(pTags)) {
          pTags.forEach((t) => {
            if (counts[t] !== undefined) counts[t]++;
          });
        }
      });

      return counts;
    },
    enabled: !!user && allPersonalTags.length > 0,
    staleTime: 30_000,
  });

  if (allPersonalTags.length === 0) return null;

  return (
    <div className="mt-4">
      {/* Divider */}
      <div className="border-t border-border/40 mb-4" />

      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Personal Tags – Current Distribution</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-xs">
              Shows current leads under each personal tag.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Shows how many leads currently have each personal tag.
      </p>

      {/* Tag table */}
      <div className="rounded-lg border border-border/50 overflow-hidden bg-muted/20">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60 border-b-2 border-accent/30">
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Personal Tag</th>
              <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Current Count</th>
            </tr>
          </thead>
          <tbody>
            {allPersonalTags.map((tag) => (
              <tr key={tag} className="bg-card hover:bg-muted/40 transition-colors border-b border-border/30 last:border-b-0">
                <td className="px-3 py-2 text-foreground">{tag}</td>
                <td className="px-3 py-2 text-right font-semibold text-foreground tabular-nums">
                  {tagCounts?.[tag] ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
