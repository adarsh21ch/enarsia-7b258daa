import { useMemo } from 'react';
import { Prospect } from '@/types/prospect';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { Star, Users, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPIStripProps {
  prospects: Prospect[];
  isCalling: boolean;
  className?: string;
  kpiTotal?: number; // Stable total from separate query (doesn't change on scroll)
}

export function KPIStrip({ prospects, isCalling, kpiTotal }: KPIStripProps) {
  const {
    leadsTrackingTagNames,
    stageTagNames,
    leadsStageTag,
  } = useTrackingFormatContext();

  // Calculate KPIs
  const kpis = useMemo(() => {
    // Use stable kpiTotal if provided (doesn't change on scroll), otherwise fallback to loaded count
    const totalLeads = kpiTotal !== undefined ? kpiTotal : prospects.length;
    
    // Count by tracking tags (Response tags for Leads, Stage tags for Funnel)
    const trackingTags = isCalling ? leadsTrackingTagNames : stageTagNames;
    
    const tagCounts: Record<string, number> = {};
    trackingTags.forEach(tag => {
      if (isCalling) {
        tagCounts[tag] = prospects.filter(p => p.action_taken === tag).length;
      } else {
        tagCounts[tag] = prospects.filter(p => p.funnel_stage === tag).length;
      }
    });

    // Count funnel leads (leads with the funnel tag)
    const funnelLeads = leadsStageTag 
      ? prospects.filter(p => p.action_taken === leadsStageTag).length 
      : 0;

    return {
      total: totalLeads,
      funnelLeads,
      tagCounts,
      trackingTags,
    };
  }, [prospects, isCalling, leadsTrackingTagNames, stageTagNames, leadsStageTag, kpiTotal]);

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
      {/* Total Leads */}
      <div className="flex items-center gap-1.5 shrink-0 bg-muted/50 rounded-full px-2.5 py-1">
        <Users className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs font-medium">{kpis.total}</span>
      </div>


      {/* Tracking Tag Counts */}
      {kpis.trackingTags.map(tag => {
        const count = kpis.tagCounts[tag] || 0;
        if (count === 0) return null;
        
        const isFunnelTag = tag === leadsStageTag;
        
        return (
          <div 
            key={tag}
            className={cn(
              "flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1",
              isFunnelTag 
                ? "bg-yellow-500/10" 
                : "bg-primary/5"
            )}
          >
            {isFunnelTag && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
            <span className={cn(
              "text-xs font-medium truncate max-w-[60px]",
              isFunnelTag ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground"
            )}>
              {tag}
            </span>
            <span className={cn(
              "text-xs font-semibold",
              isFunnelTag ? "text-yellow-600 dark:text-yellow-400" : ""
            )}>
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
