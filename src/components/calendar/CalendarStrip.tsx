import { useRef, useEffect, useMemo } from 'react';
import { format, isToday, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CalendarStripProps {
  selectedDate: Date;
  daysInMonth: Date[];
  monthYearLabel: string;
  onSelectDate: (date: Date) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onTodayClick?: () => void;
  datesWithTasks?: Set<string>; // Set of date strings (YYYY-MM-DD) that have tasks
  className?: string;
}

export function CalendarStrip({
  selectedDate,
  daysInMonth,
  monthYearLabel,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
  onTodayClick,
  datesWithTasks = new Set(),
  className,
}: CalendarStripProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedDayRef = useRef<HTMLButtonElement>(null);

  // Scroll to selected date on mount and when it changes
  useEffect(() => {
    if (selectedDayRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const element = selectedDayRef.current;
      const containerWidth = container.offsetWidth;
      const elementLeft = element.offsetLeft;
      const elementWidth = element.offsetWidth;
      
      // Center the selected element
      const scrollPosition = elementLeft - (containerWidth / 2) + (elementWidth / 2);
      container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    }
  }, [selectedDate, daysInMonth]);

  // Check if today button should be shown (when viewing a different month)
  const showTodayButton = useMemo(() => {
    const todayMonth = format(new Date(), 'yyyy-MM');
    const currentViewMonth = format(daysInMonth[0] || new Date(), 'yyyy-MM');
    return todayMonth !== currentViewMonth;
  }, [daysInMonth]);

  return (
    <div className={cn("bg-card border-b border-border/50", className)}>
      {/* Month header with navigation */}
      <div className="flex items-center justify-between px-4 py-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPreviousMonth}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            {monthYearLabel}
          </h2>
          {showTodayButton && onTodayClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={onTodayClick}
              className="h-6 px-2 text-xs"
            >
              Today
            </Button>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onNextMonth}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Days strip */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto scrollbar-hide px-2 pb-3 gap-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {daysInMonth.map((day) => {
          const dayString = format(day, 'yyyy-MM-dd');
          const isSelectedDay = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          const hasTask = datesWithTasks.has(dayString);
          
          return (
            <button
              key={dayString}
              ref={isSelectedDay ? selectedDayRef : null}
              onClick={() => onSelectDate(day)}
              className={cn(
                "flex flex-col items-center min-w-[44px] py-2 px-1 rounded-xl transition-all",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                isSelectedDay
                  ? "bg-primary text-primary-foreground shadow-md"
                  : isTodayDate
                  ? "bg-accent/50 text-accent-foreground"
                  : "hover:bg-muted/50"
              )}
            >
              {/* Day of week */}
              <span className={cn(
                "text-[10px] font-medium uppercase tracking-wide",
                isSelectedDay ? "text-primary-foreground/80" : "text-muted-foreground"
              )}>
                {format(day, 'EEE')}
              </span>
              
              {/* Day number */}
              <span className={cn(
                "text-lg font-bold mt-0.5",
                isSelectedDay ? "text-primary-foreground" : "text-foreground"
              )}>
                {format(day, 'd')}
              </span>
              
              {/* Task indicator dot */}
              <div className="h-1.5 mt-1">
                {hasTask && (
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isSelectedDay ? "bg-primary-foreground/80" : "bg-primary"
                  )} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
