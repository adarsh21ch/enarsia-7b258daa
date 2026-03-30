// Activity History View - Universal component with built-in calendar
import { useMemo, useState } from 'react';
import { useProspectsQuery } from '@/hooks/useProspectsQuery';
import { useGlobalTodos } from '@/contexts/TodosContext';
import { useCalendarStrip } from '@/hooks/useCalendarStrip';
import { CalendarStrip } from '@/components/calendar/CalendarStrip';
import { SearchBar } from '@/components/ui/SearchBar';
import { Clock, Loader2 } from 'lucide-react';
import { parseISO, format, isSameDay } from 'date-fns';

// Consistent Call icon
const CallIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);

// Consistent WhatsApp icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

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
  const calendar = useCalendarStrip();

  const selectedDate = externalDate ?? calendar.selectedDate;
  const searchQuery = externalSearch ?? internalSearch;
  const onSearchChange = externalOnSearchChange ?? setInternalSearch;

  const { prospects, loading: prospectsLoading } = useProspectsQuery();
  const { todos, loading: todosLoading } = useGlobalTodos();

  const loading = prospectsLoading || todosLoading;

  // Get personal activities for the selected date
  const { activities, importedCount } = useMemo(() => {
    const dayProspects = prospects.filter(p => isSameDay(parseISO(p.updated_at), selectedDate));
    
    // Separate imported (never updated after creation) vs genuinely updated leads
    const imported: typeof dayProspects = [];
    const updated: typeof dayProspects = [];
    
    for (const p of dayProspects) {
      const addedTime = new Date(p.date_added).getTime();
      const updatedTime = new Date(p.updated_at).getTime();
      // If updated_at is within 5 seconds of date_added, it's just an import/creation
      if (Math.abs(updatedTime - addedTime) < 5000) {
        imported.push(p);
      } else {
        updated.push(p);
      }
    }
    
    const prospectActivities = updated.map(p => ({
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

    // Combine and sort descending (most recent at top)
    let activitiesList = [...prospectActivities, ...todoActivities].sort(
      (a, b) => b.time.getTime() - a.time.getTime()
    );

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      activitiesList = activitiesList.filter(
        a => a.name.toLowerCase().includes(query) || (a.phone && a.phone.includes(query))
      );
    }
    return { activities: activitiesList, importedCount: imported.length };
  }, [prospects, todos, selectedDate, searchQuery]);

  const cleanPhoneNumber = (phone: string) => phone.replace(/[^0-9+]/g, '');
  
  const handleWhatsApp = (phone: string) => {
    window.open(`https://wa.me/${cleanPhoneNumber(phone)}`, '_blank');
  };
  
  const handleCall = (phone: string) => {
    window.open(`tel:${cleanPhoneNumber(phone)}`, '_self');
  };

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
            <p className="text-xs text-muted-foreground">{activities.length} activities{importedCount > 0 ? ` · ${importedCount} imported` : ''}</p>
          </div>
        </div>

        {/* Import summary banner */}
        {importedCount > 0 && !searchQuery.trim() && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 mb-2">
            <span className="text-xs text-muted-foreground">
              📥 Imported {importedCount} lead{importedCount > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {activities.length === 0 && importedCount === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchQuery.trim() ? 'No matching activities' : 'No activity for this date'}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {searchQuery.trim() ? 'Try a different search term' : 'Activities will appear here'}
            </p>
          </div>
        ) : activities.length > 0 ? (
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
                    <div className="flex items-start justify-between gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{activity.name}</p>
                        
                        {/* Tags */}
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
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
                      
                      {/* Call/WhatsApp buttons */}
                      {activity.phone && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button 
                            onClick={() => handleCall(activity.phone!)} 
                            className="p-1.5 rounded-full transition-colors bg-secondary"
                          >
                            <CallIcon className="h-3.5 w-3.5 text-primary" />
                          </button>
                          <button 
                            onClick={() => handleWhatsApp(activity.phone!)} 
                            className="p-1.5 rounded-full bg-green-500/10 hover:bg-green-500/20 transition-colors"
                          >
                            <WhatsAppIcon className="h-3.5 w-3.5 text-green-600" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
