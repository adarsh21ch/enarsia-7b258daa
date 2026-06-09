// Activity History View - Universal component with built-in calendar
import { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import { useProspectsQuery } from '@/hooks/useProspectsQuery';
import { useGlobalTodos } from '@/contexts/TodosContext';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { useCalendarStrip } from '@/hooks/useCalendarStrip';
import { CalendarStrip } from '@/components/calendar/CalendarStrip';
import { SearchBar } from '@/components/ui/SearchBar';
import { Clock, Loader2, Phone, X } from 'lucide-react';
import { parseISO, format, isSameDay } from 'date-fns';

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
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const calendar = useCalendarStrip();

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
        time: new Date(log.created_at)
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
      time: new Date(p.updated_at)
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
  
  const handleWhatsApp = useCallback((phone: string) => {
    window.open(`https://wa.me/${cleanPhoneNumber(phone)}`, '_blank');
  }, []);
  
  const handleCall = useCallback((phone: string) => {
    window.open(`tel:${cleanPhoneNumber(phone)}`, '_self');
  }, []);

  const handleRowTap = useCallback((activity: ActivityItem) => {
    if (activity.phone) {
      setSelectedActivity(activity);
    }
  }, []);

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
                        onCall={() => activity.phone && handleCall(activity.phone)}
                        onTap={() => handleRowTap(activity)}
                      >
                        <div className="flex items-start justify-between gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer select-none">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">{activity.name}</p>
                            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
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
                      </SwipeableActivityRow>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Premium iOS-style Contact Action Modal */}
      <AnimatePresence>
        {selectedActivity && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {/* Frosted backdrop */}
            <button
              aria-label="Close"
              onClick={() => setSelectedActivity(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />

            {/* Card */}
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 6 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.7 }}
              className="relative w-full max-w-[340px] rounded-[24px] bg-card text-card-foreground p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] ring-1 ring-black/5 dark:ring-white/5"
              onAnimationStart={() => haptic(8)}
            >
              {/* Close */}
              <button
                onClick={() => setSelectedActivity(null)}
                aria-label="Close"
                className="absolute top-3.5 right-3.5 h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Avatar */}
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-primary/15 text-primary flex items-center justify-center text-2xl font-semibold ring-4 ring-primary/5">
                  {selectedActivity.name?.trim()?.[0]?.toUpperCase() || '?'}
                </div>
              </div>

              {/* Identity */}
              <div className="text-center space-y-1">
                <h2 className="text-[21px] leading-tight font-bold tracking-tight truncate">
                  {selectedActivity.name}
                </h2>
                {selectedActivity.phone && (
                  <p className="text-[15px] text-muted-foreground tabular-nums">
                    {selectedActivity.phone}
                  </p>
                )}
              </div>

              {/* Tags */}
              {(selectedActivity.stage || selectedActivity.action) && (
                <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                  {selectedActivity.stage && (
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                      {selectedActivity.stage}
                    </span>
                  )}
                  {selectedActivity.action && (
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                      {selectedActivity.action}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              {selectedActivity.phone && (
                <div className="flex gap-3 mt-6">
                  <a
                    href={`tel:${cleanPhoneNumber(selectedActivity.phone)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      haptic(10);
                      handleCall(selectedActivity.phone!);
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 min-h-[52px] text-primary-foreground font-semibold text-[15px] shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.55)] active:scale-[0.97] active:opacity-90 transition-all"
                  >
                    <Phone className="h-[18px] w-[18px]" />
                    Call
                  </a>
                  <button
                    onClick={() => { haptic(10); selectedActivity?.phone && handleWhatsApp(selectedActivity.phone); }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 min-h-[52px] text-white font-semibold text-[15px] shadow-[0_8px_20px_-8px_rgba(37,211,102,0.6)] active:scale-[0.97] active:opacity-90 transition-all"
                    style={{ backgroundColor: '#25D366' }}
                  >
                    <WhatsAppIcon className="h-[18px] w-[18px]" />
                    WhatsApp
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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

