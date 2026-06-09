// Activity History View - iPhone "Recents" style scrollable list grouped by day
import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import { useProspectsQuery } from '@/hooks/useProspectsQuery';
import { useGlobalProspects } from '@/contexts/ProspectsContext';
import { useGlobalTodos } from '@/contexts/TodosContext';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { useCalendarStrip } from '@/hooks/useCalendarStrip';
import { CalendarStrip } from '@/components/calendar/CalendarStrip';
import { SearchBar } from '@/components/ui/SearchBar';
import { Clock, Loader2, Phone } from 'lucide-react';
import { parseISO, format, isSameDay, isToday, isYesterday, differenceInCalendarDays, startOfDay, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { logCallMade } from '@/lib/callLog';
import { ProspectDetailModal } from '@/components/prospects/ProspectDetailModal';

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
  selectedDate?: Date;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  hideCalendar?: boolean;
}

function formatDayHeader(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  const diff = differenceInCalendarDays(new Date(), date);
  if (diff > 1 && diff < 7) return format(date, 'EEEE'); // Monday, Tuesday...
  return format(date, 'EEE, MMM d');
}

export function RecentActivityView({ selectedDate: externalDate, searchQuery: externalSearch, onSearchChange: externalOnSearchChange, hideCalendar = false }: RecentActivityViewProps) {
  const [internalSearch, setInternalSearch] = useState('');
  // currentMonth from calendar drives the month-filter window
  
  const [detailProspectId, setDetailProspectId] = useState<string | null>(null);
  const calendar = useCalendarStrip();
  const { updateProspect, deleteProspect } = useGlobalProspects();

  const selectedDate = externalDate ?? calendar.selectedDate;
  const searchQuery = externalSearch ?? internalSearch;
  const onSearchChange = externalOnSearchChange ?? setInternalSearch;

  const { prospects, loading: prospectsLoading } = useProspectsQuery();
  const { todos, loading: todosLoading } = useGlobalTodos();
  const { activities: activityLogs, loading: logsLoading } = useActivityLogs(500);

  const loading = prospectsLoading || todosLoading || logsLoading;

  // All activities across all dates, sorted desc
  const allActivities = useMemo<ActivityItem[]>(() => {
    const importEntries: ActivityItem[] = activityLogs
      .filter(log => log.activity_type === 'bulk_import')
      .map(log => ({
        id: log.id,
        type: 'import',
        name: `Imported ${log.new_value || '?'} lead${Number(log.new_value) !== 1 ? 's' : ''}`,
        phone: null,
        stage: null,
        action: null,
        time: new Date(log.created_at),
      }));

    const callEntries: ActivityItem[] = activityLogs
      .filter(log => log.activity_type === 'call_made')
      .map(log => ({
        id: log.id,
        type: 'call',
        name: log.description || 'Call',
        phone: log.new_value || null,
        stage: null,
        action: null,
        time: new Date(log.created_at),
        prospectId: log.prospect_id || null,
      }));

    const prospectActivities: ActivityItem[] = prospects
      .filter(p => {
        const addedTime = new Date(p.date_added).getTime();
        const updatedTime = new Date(p.updated_at).getTime();
        return Math.abs(updatedTime - addedTime) > 5000;
      })
      .map(p => ({
        id: p.id,
        type: 'lead',
        name: p.name,
        phone: p.phone,
        stage: p.funnel_stage,
        action: p.action_taken,
        time: new Date(p.updated_at),
        prospectId: p.id,
      }));

    const todoActivities: ActivityItem[] = todos.map(t => ({
      id: t.id,
      type: 'todo',
      name: t.title,
      phone: null,
      stage: t.completed ? 'Completed' : 'Updated',
      action: null,
      time: new Date(t.updated_at),
    }));

    // Restrict to currently-viewed month (network marketers think month-by-month)
    const monthStart = startOfMonth(calendar.currentMonth).getTime();
    const monthEnd = endOfMonth(calendar.currentMonth).getTime();

    let list: ActivityItem[] = [...prospectActivities, ...importEntries, ...callEntries, ...todoActivities]
      .filter(a => {
        const t = a.time.getTime();
        return t >= monthStart && t <= monthEnd;
      })
      .sort((a, b) => b.time.getTime() - a.time.getTime());

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q) || (a.phone && a.phone.includes(q)));
    }
    return list;
  }, [prospects, todos, activityLogs, searchQuery, calendar.currentMonth]);

  // Group by day (descending)
  const groupedActivities = useMemo(() => {
    const map = new Map<string, { date: Date; items: ActivityItem[] }>();
    allActivities.forEach(a => {
      const key = format(startOfDay(a.time), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, { date: startOfDay(a.time), items: [] });
      map.get(key)!.items.push(a);
    });
    return Array.from(map.entries())
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [allActivities]);

  // Dates with activity (for calendar dots)
  const datesWithTasks = useMemo(() => {
    return new Set(groupedActivities.map(g => g.key));
  }, [groupedActivities]);

  const cleanPhoneNumber = (phone: string) => phone.replace(/[^0-9+]/g, '');

  const handleCall = useCallback((phone: string, name?: string, prospectId?: string | null) => {
    logCallMade({ prospectId: prospectId || undefined, name: name || 'Call', phone });
    window.open(`tel:${cleanPhoneNumber(phone)}`, '_self');
  }, []);

  const handleRowTap = useCallback((activity: ActivityItem) => {
    if (activity.prospectId) setDetailProspectId(activity.prospectId);
  }, []);

  const detailProspect = useMemo(
    () => (detailProspectId ? prospects.find(p => p.id === detailProspectId) || null : null),
    [detailProspectId, prospects]
  );

  // Scroll-to-date: when calendar date changes, scroll its group into view
  const listContainerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const key = format(startOfDay(selectedDate), 'yyyy-MM-dd');
    const el = sectionRefs.current.get(key);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedDate]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!hideCalendar && (
        <CalendarStrip
          selectedDate={calendar.selectedDate}
          daysInMonth={calendar.daysInMonth}
          monthYearLabel={calendar.monthYearLabel}
          onSelectDate={calendar.selectDate}
          onPreviousMonth={calendar.goToPreviousMonth}
          onNextMonth={calendar.goToNextMonth}
          onTodayClick={calendar.goToToday}
          datesWithTasks={datesWithTasks}
          className="rounded-lg"
        />
      )}

      <SearchBar
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search name, phone..."
      />

      <div className="bg-card rounded-xl p-3 border border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-primary" />
          <div>
            <h3 className="font-medium text-sm">Recents</h3>
            <p className="text-xs text-muted-foreground">{allActivities.length} activities</p>
          </div>
        </div>

        {groupedActivities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchQuery.trim() ? 'No matching activities' : 'No activity yet'}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {searchQuery.trim() ? 'Try a different search term' : 'Activities will appear here'}
            </p>
          </div>
        ) : (
          <div ref={listContainerRef} className="space-y-4">
            {groupedActivities.map(group => (
              <div
                key={group.key}
                ref={el => {
                  if (el) sectionRefs.current.set(group.key, el);
                  else sectionRefs.current.delete(group.key);
                }}
                className="scroll-mt-2"
              >
                <div className="space-y-0">
                  {group.items.map(activity => (
                    <div key={`${activity.type}-${activity.id}`} className="relative">
                      {activity.type === 'import' ? (
                        <div className="flex items-center justify-between gap-2 p-3 mb-1 rounded-lg bg-muted/30">
                          <span className="text-xs text-muted-foreground truncate">📥 {activity.name}</span>
                          <div className="flex flex-col items-end shrink-0">
                            <span className="text-[10px] text-muted-foreground/80 font-medium tabular-nums">
                              {format(activity.time, 'h:mm a')}
                            </span>
                            <span className="text-[9px] text-muted-foreground/60 font-medium mt-0.5 whitespace-nowrap">
                              {formatDayHeader(group.date)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <SwipeableActivityRow
                          phone={activity.phone}
                          onCall={() => activity.phone && handleCall(activity.phone, activity.name, activity.prospectId)}
                          onTap={() => handleRowTap(activity)}
                        >
                          <div className="flex items-start justify-between gap-2 p-3 mb-1 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer select-none">
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
                            <div className="flex flex-col items-end shrink-0 mt-0.5">
                              <span className="text-[10px] text-muted-foreground/80 font-medium tabular-nums">
                                {format(activity.time, 'h:mm a')}
                              </span>
                              <span className="text-[9px] text-muted-foreground/60 font-medium mt-0.5 whitespace-nowrap">
                                {formatDayHeader(group.date)}
                              </span>
                            </div>
                          </div>
                        </SwipeableActivityRow>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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

// ===== Swipeable activity row — LEFT swipe → call =====
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
    snapBack();
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      <motion.div
        aria-hidden="true"
        style={{ opacity: surfaceOpacity }}
        className="absolute inset-0 rounded-lg bg-green-500/15"
      />
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
