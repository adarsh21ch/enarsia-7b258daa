import { useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Day1SetupDialogProps {
  open: boolean;
  onSave: (date: Date) => void;
}

export function Day1SetupDialog({ open, onSave }: Day1SetupDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const handleSave = () => {
    if (selectedDate) {
      onSave(selectedDate);
    }
  };

  // Get current month name dynamically
  const currentMonthName = format(new Date(), 'MMMM');

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>Set your Day-1 Follow-up Date</DialogTitle>
          </div>
          <DialogDescription>
            Enter your first Day-1 follow-up date for {currentMonthName}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            initialFocus
            className={cn("rounded-md border pointer-events-auto")}
          />
          
          {selectedDate && (
            <p className="mt-3 text-sm text-muted-foreground">
              Day 1 starts: <span className="font-medium text-foreground">{format(selectedDate, 'MMMM d, yyyy')}</span>
            </p>
          )}
        </div>

        <Button 
          onClick={handleSave} 
          disabled={!selectedDate}
          className="w-full"
        >
          Save & Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
}
