// Activity History View - Universal component with built-in calendar
import { useMemo, useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import { useProspectsQuery } from '@/hooks/useProspectsQuery';
import { useGlobalProspects } from '@/contexts/ProspectsContext';
import { useGlobalTodos } from '@/contexts/TodosContext';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { useCalendarStrip } from '@/hooks/useCalendarStrip';
import { CalendarStrip } from '@/components/calendar/CalendarStrip';
import { SearchBar } from '@/components/ui/SearchBar';
import { Clock, Loader2, Phone } from 'lucide-react';
import { parseISO, format, isSameDay } from 'date-fns';
import { logCallMade } from '@/lib/callLog';
import { ProspectDetailModal } from '@/components/prospects/ProspectDetailModal';

// Light haptic helper (mobile only)
const haptic = (ms = 8) => {
  try { if (typeof navigator !== 'undefined' && 'vibrate' in navigator) (navigator as any).vibrate?.(ms); } catch {}
};

// Consistent WhatsApp icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

type ActivityItem = {
  id: string;
  type: 'lead' | 'import' | 'todo' | 'call';
  name: string;
  phone: string | null;
  stage: string | null;
  action: string | null;
  time: Date;
  prospectId?: string | null;
};

interface RecentActivityViewProps {
  /** Optional: if provided externally, the built-in calendar is hidden */
  selectedDate?: Date;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  /** Hide the built-in calendar (e.g. when parent already shows one) */
  hideCalendar?: boolean;
}

export function RecentActivityView({ selectedDate: externalDate, searchQuery: externalSearch, onSearchChange: externalOnSearchChange, hideCalendar = false }: RecentActivityViewProps) {
  // Internal state for calendar and search when not controlled externally
  const [internalSearch, setInternalSearch] = useState('');
  const [detailProspectId, setDetailProspectId] = useState<string | null>(null);
  const calendar = useCalendarStrip();
  const { updateProspect, deleteProspect } = useGlobalProspects();

  const selectedDate = externalDate ?? calendar.selectedDate;
  const searchQuery = externalSearch ?? internalSearch;
  const onSearchChange = externalOnSearchChange ?? setInternalSearch;

  const { prospects, loading: prospectsLoading } = useProspectsQuery();
  const { todos, loading: todosLoading } = useGlobalTodos();
  const { activities: activityLogs, loading: logsLoading } = useActivityLogs(200);

  const loading = prospectsLoading || todosLoading || logsLoading;

  // Get personal activities for the selected date
  const activities = useMemo<ActivityItem[]>(() => {
    // Bulk import entries
    const importEntries = activityLogs
      .filter(log => log.activity_type === 'bulk_import' && isSameDay(parseISO(log.created_at), selectedDate))
      .map(log => ({
        id: log.id,
        type: 'import' as const,
        name: `Imported ${log.new_value || '?'} lead${Number(log.new_value) !== 1 ? 's' : ''}`,
        phone: null as string | null,
        stage: null as string | null,
        action: null as string | null,
        time: new Date(log.created_at)
      }));

    // Outbound call entries (iPhone-Recents style)
    const callEntries = activityLogs
      .filter(log => log.activity_type === 'call_made' && isSameDay(parseISO(log.created_at), selectedDate))
      .map(log => ({
        id: log.id,
        type: 'call' as const,
        name: log.description || 'Call',
        phone: log.new_value || null,
        stage: null as string | null,
        action: null as string | null,
        time: new Date(log.created_at),
        prospectId: log.prospect_id || null,
      }));

    // For prospects, only show those that were genuinely updated (not just created)
    const dayProspects = prospects.filter(p => {
      if (!isSameDay(parseISO(p.updated_at), selectedDate)) return false;
      const addedTime = new Date(p.date_added).getTime();
      const updatedTime = new Date(p.updated_at).getTime();
      return Math.abs(updatedTime - addedTime) > 5000;
    });

    const prospectActivities = dayProspects.map(p => ({
      id: p.id,
      type: 'lead' as const,
      name: p.name,
      phone: p.phone,
      stage: p.funnel_stage,
      action: p.action_taken,
      time: new Date(p.updated_at),
      prospectId: p.id,
    }));
    
    const todoActivities = todos
      .filter(t => isSameDay(parseISO(t.updated_at), selectedDate))
      .map(t => ({
        id: t.id,
        type: 'todo' as const,
        name: t.title,
        phone: null as string | null,
        stage: t.completed ? 'Completed' : 'Updated',
        action: null as string | null,
        time: new Date(t.updated_at)
      }));

    let activitiesList: ActivityItem[] = [...prospectActivities, ...importEntries, ...callEntries, ...todoActivities].sort(
      (a, b) => b.time.getTime() - a.time.getTime()
    );

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      activitiesList = activitiesList.filter(
        a => a.name.toLowerCase().includes(query) || (a.phone && a.phone.includes(query))
      );
    }
    return activitiesList;
  }, [prospects, todos, activityLogs, selectedDate, searchQuery]);

  const cleanPhoneNumber = (phone: string) => phone.replace(/[^0-9+]/g, '');

  const handleCall = useCallback((phone: string, name?: string, prospectId?: string | null) => {
    logCallMade({ prospectId: prospectId || undefined, name: name || 'Call', phone });
    window.open(`tel:${cleanPhoneNumber(phone)}`, '_self');
  }, []);

  const handleRowTap = useCallback((activity: ActivityItem) => {
    // iPhone-Recents behavior: tap the row → open full prospect detail modal
    if (activity.prospectId) {
      setDetailProspectId(activity.prospectId);
    }
  }, []);

  const detailProspect = useMemo(
    () => (detailProspectId ? prospects.find(p => p.id === detailProspectId) || null : null),
    [detailProspectId, prospects]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Built-in Calendar Strip */}
      {!hideCalendar && (
        <CalendarStrip
          selectedDate={calendar.selectedDate}
          daysInMonth={calendar.daysInMonth}
          monthYearLabel={calendar.monthYearLabel}
          onSelectDate={calendar.selectDate}
          onPreviousMonth={calendar.goToPreviousMonth}
          onNextMonth={calendar.goToNextMonth}
          onTodayClick={calendar.goToToday}
          className="rounded-lg"
        />
      )}

      {/* Search Bar */}
      <SearchBar 
        value={searchQuery} 
        onChange={onSearchChange} 
        placeholder="Search name, phone..." 
      />

      {/* Activities List */}
      <div className="bg-card rounded-xl p-3 border border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-primary" />
          <div>
            <h3 className="font-medium text-sm">Activities</h3>
            <p className="text-xs text-muted-foreground">{activities.length} activities</p>
          </div>
        </div>

        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchQuery.trim() ? 'No matching activities' : 'No activity for this date'}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {searchQuery.trim() ? 'Try a different search term' : 'Activities will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {activities.map((activity, index) => (
              <div key={`${activity.type}-${activity.id}`} className="relative">
                {/* Connecting line between items */}
                {index < activities.length - 1 && (
                  <div className="absolute left-[26px] top-[22px] bottom-0 w-px bg-border/60" />
                )}
                
                <div className="relative flex gap-3">
                  {/* Time label */}
                  <div className="shrink-0 w-14 flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground/80 font-medium">
                      {format(activity.time, 'h:mm a')}
                    </span>
                  </div>
                  
                  {/* Activity content */}
                  <div className="flex-1 min-w-0 pb-2">
                    {activity.type === 'import' ? (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                        <span className="text-xs text-muted-foreground">📥 {activity.name}</span>
                      </div>
                    ) : (
                      <SwipeableActivityRow
                        phone={activity.phone}
                        onCall={() => activity.phone && handleCall(activity.phone, activity.name)}
                        onTap={() => handleRowTap(activity)}
                      >
                        <div className="flex items-start justify-between gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer select-none">
                          <div className="min-w-0 flex-1 flex items-start gap-2">
                            {activity.type === 'call' && (
                              <span className="shrink-0 mt-0.5 h-6 w-6 rounded-full bg-green-500/15 text-green-600 flex items-center justify-center">
                                <Phone className="h-3 w-3" />
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold truncate">{activity.name}</p>
                              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                                {activity.type === 'call' && activity.phone && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium">
                                    Called · {activity.phone}
                                  </span>
                                )}
                                {activity.stage && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                    {activity.stage}
                                  </span>
                                )}
                                {activity.action && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                    {activity.action}
                                  </span>
                                )}
                                {activity.type === 'todo' && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                                    To-Do
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </SwipeableActivityRow>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full prospect detail modal — matches the Calling tab experience */}
      {detailProspect && (
        <ProspectDetailModal
          prospect={detailProspect}
          open={!!detailProspect}
          onOpenChange={(o) => !o && setDetailProspectId(null)}
          onUpdate={updateProspect}
          onDelete={deleteProspect}
        />
      )}
    </div>
  );
}

// ===== Swipeable activity row — LEFT swipe → call (parity with Calling tab) =====
interface SwipeableActivityRowProps {
  phone: string | null;
  onCall: () => void;
  onTap: () => void;
  children: React.ReactNode;
}

function SwipeableActivityRow({ phone, onCall, onTap, children }: SwipeableActivityRowProps) {
  const SWIPE_REVEAL = 96;
  const SWIPE_TRIGGER = 140;
  const x = useMotionValue(0);

  const surfaceOpacity = useTransform(x, [0, -30, -SWIPE_REVEAL], [0, 0.5, 1]);
  const callBtnOpacity = useTransform(x, [-15, -SWIPE_REVEAL * 0.7], [0, 1]);
  const callBtnTranslate = useTransform(x, [0, -SWIPE_REVEAL], [30, 0]);

  // No phone → render children plainly (no swipe affordance)
  if (!phone) return <>{children}</>;

  const snapBack = () => {
    animate(x, 0, { type: 'spring', stiffness: 500, damping: 42 });
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (offset < -SWIPE_TRIGGER || velocity < -650) {
      onCall();
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          (navigator as Navigator & { vibrate: (p: number) => void }).vibrate(15);
        }
      } catch { /* noop */ }
    }
    // Always snap back to neutral so the row is never stuck off-screen
    snapBack();
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Green call surface revealed beneath */}
      <motion.div
        aria-hidden="true"
        style={{ opacity: surfaceOpacity }}
        className="absolute inset-0 rounded-lg bg-green-500/15"
      />
      {/* Revealed Call icon — vertically centered on the right edge */}
      <motion.div
        aria-hidden="true"
        style={{ opacity: callBtnOpacity, x: callBtnTranslate }}
        className="absolute inset-y-0 right-3 flex items-center pointer-events-none"
      >
        <span className="flex items-center justify-center h-9 w-9 rounded-full bg-green-500 shadow-md">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z" />
          </svg>
        </span>
      </motion.div>
      {/* Draggable foreground */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -SWIPE_REVEAL * 1.4, right: 0 }}
        dragElastic={0.12}
        dragMomentum={false}
        dragDirectionLock
        style={{ x }}
        onDragEnd={handleDragEnd}
        onTap={onTap}
        className="relative touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}

