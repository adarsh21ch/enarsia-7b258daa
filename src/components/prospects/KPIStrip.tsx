import { useMemo } from 'react';
import { Prospect } from '@/types/prospect';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { Star, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTagColor } from '@/lib/tagColors';

interface KPIStripProps {
  prospects: Prospect[];
  isCalling: boolean;
  className?: string;
  kpiTotal?: number; // Stable total from separate query (doesn't change on scroll)
  kpiTagCounts?: Record<string, number>; // Per-tag counts from separate query
}

export function KPIStrip({ prospects, isCalling, kpiTotal, kpiTagCounts }: KPIStripProps) {
  const {
    leadsTrackingTagNames,
    stageTagNames,
    leadsStageTag,
  } = useTrackingFormatContext();

  // Calculate KPIs - prefer stable server-side counts if available
  const kpis = useMemo(() => {
    // Use stable kpiTotal if provided (doesn't change on scroll), otherwise fallback to loaded count
    const totalLeads = kpiTotal !== undefined ? kpiTotal : prospects.length;
    
    // Count by tracking tags (Response tags for Leads, Stage tags for Funnel)
    const trackingTags = isCalling ? leadsTrackingTagNames : stageTagNames;
    
    const tagCounts: Record<string, number> = {};
    trackingTags.forEach(tag => {
      if (isCalling) {
        // Use server-side counts if available, otherwise fallback to loaded data
        const serverCount = kpiTagCounts?.[`action:${tag}`];
        tagCounts[tag] = serverCount !== undefined 
          ? serverCount 
          : prospects.filter(p => p.action_taken === tag).length;
      } else {
        const serverCount = kpiTagCounts?.[`stage:${tag}`];
        tagCounts[tag] = serverCount !== undefined 
          ? serverCount 
          : prospects.filter(p => p.funnel_stage === tag).length;
      }
    });

    // Count funnel leads (leads with the funnel tag)
    const funnelLeads = leadsStageTag 
      ? (kpiTagCounts?.[`action:${leadsStageTag}`] ?? prospects.filter(p => p.action_taken === leadsStageTag).length)
      : 0;

    return {
      total: totalLeads,
      funnelLeads,
      tagCounts,
      trackingTags,
    };
  }, [prospects, isCalling, leadsTrackingTagNames, stageTagNames, leadsStageTag, kpiTotal, kpiTagCounts]);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-hide">
      {/* Total Leads */}
      <div className="flex items-center gap-1.5 shrink-0 rounded-md px-2.5 py-1 bg-primary/10 border border-primary/20">
        <Users className="h-3 w-3 text-primary" />
        <span className="text-xs font-semibold text-primary">{kpis.total}</span>
      </div>

      {/* Tracking Tag Counts - each with its own distinct color */}
      {kpis.trackingTags.map(tag => {
        const count = kpis.tagCounts[tag] || 0;
        if (count === 0) return null;
        
        const isFunnelTag = tag === leadsStageTag;
        const tagColor = getTagColor(tag, isCalling ? 'response' : 'stage');
        
        return (
          <div 
            key={tag}
            className="flex items-center gap-1.5 shrink-0 rounded-md px-2.5 py-1 bg-muted/50 border border-border/50"
          >
            {/* Color dot indicator */}
            <span 
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: tagColor }}
            />
            {isFunnelTag && <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500 shrink-0" />}
            <span className="text-xs font-medium truncate max-w-[60px] text-muted-foreground">
              {tag}
            </span>
            <span className="text-xs font-bold text-foreground">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
