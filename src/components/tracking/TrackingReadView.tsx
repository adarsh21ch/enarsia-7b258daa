import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Users, TrendingUp, Calendar, Loader2 } from 'lucide-react';
import { TopTabBar } from '@/components/ui/TopTabBar';
import { TrackingStatsCard, TrackingStatsGrid } from './TrackingStatsCard';
import { usePersonalSnapshot, PersonalSnapshotData } from '@/hooks/usePersonalSnapshot';
import { useTotalSnapshot, TotalSnapshotData } from '@/hooks/useTotalSnapshot';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { cn } from '@/lib/utils';

interface TrackingReadViewProps {
  mainTab: 'personal' | 'total';
  subTab: 'leads' | 'funnel';
  onMainTabChange: (tab: 'personal' | 'total') => void;
  onSubTabChange: (tab: 'leads' | 'funnel') => void;
  selectedDate: Date;
}

export function TrackingReadView({ 
  mainTab, 
  subTab, 
  onMainTabChange, 
  onSubTabChange,
  selectedDate 
}: TrackingReadViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [personalData, setPersonalData] = useState<PersonalSnapshotData | null>(null);
  const [totalData, setTotalData] = useState<TotalSnapshotData | null>(null);

  const { fetchSnapshotByDate: fetchPersonal } = usePersonalSnapshot();
  const { fetchSnapshotByDate: fetchTotal } = useTotalSnapshot();
  const { 
    leadsTrackingTagNames,
    stageTagNames,
    leadsFinalTargetTag,
    stageFinalTargetTag,
  } = useTrackingFormatContext();

  // Load data when date or tab changes
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const [personal, total] = await Promise.all([
          fetchPersonal(dateStr),
          fetchTotal(dateStr)
        ]);
        setPersonalData(personal);
        setTotalData(total);
      } catch (error) {
        console.error('Error loading tracking data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [selectedDate, fetchPersonal, fetchTotal]);

  const currentData = mainTab === 'personal' ? personalData : totalData;
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  const subTabOptions: [{ value: string; label: string; icon: typeof Users }, { value: string; label: string; icon: typeof TrendingUp }] = [
    { value: 'leads', label: 'Leads', icon: Users },
    { value: 'funnel', label: 'Funnel', icon: TrendingUp },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date Badge */}
      <div className="flex items-center gap-2 text-sm">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className={cn(
          "font-medium",
          isToday ? "text-primary" : "text-muted-foreground"
        )}>
          {isToday ? "Today" : format(selectedDate, 'EEE, MMM d')}
        </span>
      </div>

      {/* Leads / Funnel Toggle */}
      <TopTabBar 
        options={subTabOptions} 
        value={subTab} 
        onChange={(v) => onSubTabChange(v as 'leads' | 'funnel')} 
      />

      {/* Content based on sub tab */}
      {subTab === 'leads' ? (
        <div className="space-y-3">
          {/* Total Leads Card - Prominent */}
          <TrackingStatsCard
            label="Total Leads"
            value={currentData?.total_leads || 0}
            icon={Users}
            variant="highlight"
          />

          {/* Total Responses */}
          <TrackingStatsCard
            label="Total Responses"
            value={currentData?.total_responses || 0}
            variant="default"
          />

          {/* Response Tags */}
          {leadsTrackingTagNames.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Response Tags
              </h4>
              <TrackingStatsGrid className="grid-cols-2">
                {leadsTrackingTagNames.map((tagName) => (
                  <TrackingStatsCard
                    key={tagName}
                    label={tagName}
                    value={(currentData?.response_tags as Record<string, number>)?.[tagName] || 0}
                    isFinalTarget={tagName === leadsFinalTargetTag}
                  />
                ))}
              </TrackingStatsGrid>
            </div>
          )}

          {/* Empty State */}
          {!currentData && leadsTrackingTagNames.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No leads data yet</p>
              <p className="text-sm">Tap "Update Tracking" to add your first entry</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Funnel Tag Count - Prominent */}
          <TrackingStatsCard
            label="Funnel Entries"
            value={currentData?.funnel_tag_count || 0}
            icon={TrendingUp}
            variant="highlight"
          />

          {/* Final Tag Count */}
          <TrackingStatsCard
            label={stageFinalTargetTag || "Final Stage"}
            value={currentData?.final_tag_count || 0}
            isFinalTarget
          />

          {/* Stage Tags */}
          {stageTagNames.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Funnel Stages
              </h4>
              <TrackingStatsGrid className="grid-cols-2">
                {stageTagNames.map((tagName) => (
                  <TrackingStatsCard
                    key={tagName}
                    label={tagName}
                    value={(currentData?.stage_tags as Record<string, number>)?.[tagName] || 0}
                    isFinalTarget={tagName === stageFinalTargetTag}
                  />
                ))}
              </TrackingStatsGrid>
            </div>
          )}

          {/* Empty State */}
          {stageTagNames.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No funnel stages configured</p>
              <p className="text-sm">Configure stages in your Profile settings</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
