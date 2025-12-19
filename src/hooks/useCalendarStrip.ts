import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addMonths, 
  subMonths,
  isToday,
  isSameDay,
  startOfDay
} from 'date-fns';

export interface UseCalendarStripOptions {
  initialDate?: Date;
  onDateChange?: (date: Date) => void;
}

export function useCalendarStrip(options: UseCalendarStripOptions = {}) {
  const { initialDate = new Date(), onDateChange } = options;
  
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(initialDate));
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(initialDate));

  // Get all days in the current month
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Month/year label
  const monthYearLabel = useMemo(() => {
    return format(currentMonth, 'MMMM yyyy');
  }, [currentMonth]);

  // Handle date selection
  const selectDate = useCallback((date: Date) => {
    const normalized = startOfDay(date);
    setSelectedDate(normalized);
    // Update current month if needed
    if (format(normalized, 'yyyy-MM') !== format(currentMonth, 'yyyy-MM')) {
      setCurrentMonth(startOfMonth(normalized));
    }
    onDateChange?.(normalized);
  }, [currentMonth, onDateChange]);

  // Navigate months
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth(prev => subMonths(prev, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth(prev => addMonths(prev, 1));
  }, []);

  // Go to today
  const goToToday = useCallback(() => {
    const today = startOfDay(new Date());
    setSelectedDate(today);
    setCurrentMonth(startOfMonth(today));
    onDateChange?.(today);
  }, [onDateChange]);

  // Check if a date is selected
  const isSelected = useCallback((date: Date) => {
    return isSameDay(date, selectedDate);
  }, [selectedDate]);

  // Auto-reset to today at midnight
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    const timer = setTimeout(() => {
      goToToday();
    }, msUntilMidnight);

    return () => clearTimeout(timer);
  }, [goToToday]);

  // Format selected date for database queries (YYYY-MM-DD)
  const selectedDateString = useMemo(() => {
    return format(selectedDate, 'yyyy-MM-dd');
  }, [selectedDate]);

  return {
    selectedDate,
    selectedDateString,
    currentMonth,
    daysInMonth,
    monthYearLabel,
    selectDate,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    isSelected,
    isToday,
  };
}
