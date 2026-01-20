import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { TrackingReadView } from '@/components/tracking/TrackingReadView';
import { UpdateTrackingModal } from '@/components/tracking/UpdateTrackingModal';
import { UpgradeBar } from '@/components/subscription/UpgradeBar';
import { TopTabBar } from '@/components/ui/TopTabBar';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, User, Users, ArrowLeft, Pencil, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

type MainTab = 'personal' | 'total';
type SubTab = 'leads' | 'funnel';

export default function Tracking() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isPro, loading: subLoading } = useSubscription();
  const queryClient = useQueryClient();
  
  // Main tabs: Personal vs Total
  const [mainTab, setMainTab] = useState<MainTab>('total');
  const [subTab, setSubTab] = useState<SubTab>('leads');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Pro gate disabled for now
  const showProGate = false;

  const handleSaveComplete = useCallback(() => {
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['personal_snapshot_v2'] });
    queryClient.invalidateQueries({ queryKey: ['total_snapshot_v2'] });
    // Force re-render of the read view
    setRefreshKey(prev => prev + 1);
  }, [queryClient]);

  const goToPreviousDay = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  const goToNextDay = () => {
    const tomorrow = new Date();
    if (format(selectedDate, 'yyyy-MM-dd') < format(tomorrow, 'yyyy-MM-dd')) {
      setSelectedDate(prev => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + 1);
        return newDate;
      });
    }
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const mainTabOptions: [{ value: string; label: string; icon: typeof User }, { value: string; label: string; icon: typeof Users }] = [
    { value: 'personal', label: 'Personal', icon: User },
    { value: 'total', label: 'Total', icon: Users },
  ];

  return (
    <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/profile');
                }
              }}
              className="p-2 -ml-2 rounded-lg hover:bg-muted/50 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <img 
              src={nevoraLogo} 
              alt="NevorAI Logo" 
              className="h-10 w-10 rounded-xl object-cover shadow-md"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Track Up</h1>
              <p className="text-xs text-muted-foreground font-medium">
                {mainTab === 'personal' ? 'Your Personal Numbers' : 'Team Total Numbers'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Personal / Total Switch */}
        <div className="px-4 pb-3">
          <TopTabBar 
            options={mainTabOptions} 
            value={mainTab} 
            onChange={(v) => setMainTab(v as MainTab)} 
          />
        </div>

        {/* Date Navigator */}
        <div className="px-4 pb-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goToPreviousDay}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "h-9 px-4 font-medium",
                  isToday && "border-primary/50 bg-primary/5"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {isToday ? "Today" : format(selectedDate, 'EEE, MMM d')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setIsCalendarOpen(false);
                  }
                }}
                disabled={(date) => date > new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goToNextDay}
            disabled={isToday}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="scrollable-content relative">
        <div className={cn("container py-4 px-4 h-full", showProGate ? "pb-36" : "pb-28")}>
          {/* Read View */}
          <TrackingReadView
            key={refreshKey}
            mainTab={mainTab}
            subTab={subTab}
            onMainTabChange={setMainTab}
            onSubTabChange={setSubTab}
            selectedDate={selectedDate}
          />
        </div>

        {/* Floating Action Button */}
        <Button
          onClick={() => setIsUpdateModalOpen(true)}
          className="fixed bottom-24 right-4 h-14 px-5 rounded-full shadow-lg z-30 gap-2"
          size="lg"
        >
          <Pencil className="h-5 w-5" />
          <span className="font-semibold">Update</span>
        </Button>
      </main>

      {/* Update Tracking Modal */}
      <UpdateTrackingModal
        open={isUpdateModalOpen}
        onOpenChange={setIsUpdateModalOpen}
        initialMainTab={mainTab}
        initialSubTab={subTab}
        initialDate={selectedDate}
        onSaveComplete={handleSaveComplete}
      />

      {/* Upgrade Bar only for Free Users */}
      {showProGate && <UpgradeBar />}

      <BottomNav />
    </div>
  );
}
