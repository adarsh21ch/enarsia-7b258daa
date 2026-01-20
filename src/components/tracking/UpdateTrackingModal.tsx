import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { X, Calendar, Users, TrendingUp, Check, Loader2, Zap, Settings, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TopTabBar } from '@/components/ui/TopTabBar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePersonalSnapshot, UpsertPersonalSnapshotInput } from '@/hooks/usePersonalSnapshot';
import { useTotalSnapshot, UpsertTotalSnapshotInput } from '@/hooks/useTotalSnapshot';
import { useTrackingSourcePreferences } from '@/hooks/useTrackingSourcePreferences';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UpdateTrackingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMainTab?: 'personal' | 'total';
  initialSubTab?: 'leads' | 'funnel';
  initialDate?: Date;
  onSaveComplete?: () => void;
}

export function UpdateTrackingModal({ 
  open, 
  onOpenChange, 
  initialMainTab = 'personal',
  initialSubTab = 'leads',
  initialDate,
  onSaveComplete
}: UpdateTrackingModalProps) {
  const [mainTab, setMainTab] = useState<'personal' | 'total'>(initialMainTab);
  const [subTab, setSubTab] = useState<'leads' | 'funnel'>(initialSubTab);
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);

  // Form state
  const [totalLeads, setTotalLeads] = useState(0);
  const [responseTags, setResponseTags] = useState<Record<string, number>>({});
  const [stageTags, setStageTags] = useState<Record<string, number>>({});

  const { 
    fetchSnapshotByDate: fetchPersonal, 
    upsertSnapshot: upsertPersonal, 
    isUpserting: isUpsertingPersonal 
  } = usePersonalSnapshot();

  const { 
    fetchSnapshotByDate: fetchTotal, 
    upsertSnapshot: upsertTotal, 
    isUpserting: isUpsertingTotal 
  } = useTotalSnapshot();

  const { 
    teamSource, 
    setTeamSource,
    isUpdating: isUpdatingPrefs
  } = useTrackingSourcePreferences();

  const { 
    leadsTrackingTagNames,
    stageTagNames,
    leadsFinalTargetTag,
    stageFinalTargetTag,
  } = useTrackingFormatContext();

  const { profile } = useProfile();

  // Sync initial values when modal opens
  useEffect(() => {
    if (open) {
      setMainTab(initialMainTab);
      setSubTab(initialSubTab);
      setSelectedDate(initialDate || new Date());
    }
  }, [open, initialMainTab, initialSubTab, initialDate]);

  // Initialize auto mode from preferences
  useEffect(() => {
    setIsAutoMode(teamSource === 'AUTO');
  }, [teamSource]);

  // Calculate auto totals from personal data
  const calculateAutoTotals = useCallback(async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const personalSnapshot = await fetchPersonal(dateStr);
    
    if (personalSnapshot) {
      setTotalLeads(personalSnapshot.total_leads);
      setResponseTags(personalSnapshot.response_tags || {});
      setStageTags(personalSnapshot.stage_tags || {});
    } else {
      setTotalLeads(0);
      setResponseTags({});
      setStageTags({});
    }
  }, [selectedDate, fetchPersonal]);

  // Load existing snapshot when date or tab changes
  useEffect(() => {
    if (!open) return;

    const loadSnapshot = async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      if (mainTab === 'personal') {
        const snapshot = await fetchPersonal(dateStr);
        if (snapshot) {
          setTotalLeads(snapshot.total_leads);
          setResponseTags(snapshot.response_tags || {});
          setStageTags(snapshot.stage_tags || {});
        } else {
          setTotalLeads(0);
          setResponseTags({});
          setStageTags({});
        }
      } else {
        if (isAutoMode) {
          await calculateAutoTotals();
        } else {
          const snapshot = await fetchTotal(dateStr);
          if (snapshot) {
            setTotalLeads(snapshot.total_leads);
            setResponseTags(snapshot.response_tags || {});
            setStageTags(snapshot.stage_tags || {});
          } else {
            setTotalLeads(0);
            setResponseTags({});
            setStageTags({});
          }
        }
      }
    };

    loadSnapshot();
  }, [open, selectedDate, mainTab, isAutoMode, fetchPersonal, fetchTotal, calculateAutoTotals]);

  const handleModeToggle = async (checked: boolean) => {
    setIsAutoMode(checked);
    await setTeamSource(checked ? 'AUTO' : 'MANUAL');
    
    if (checked) {
      await calculateAutoTotals();
    }
  };

  const handleSave = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const totalResponses = Object.values(responseTags).reduce((a, b) => a + b, 0);
      const funnelTagCount = Object.values(stageTags).reduce((a, b) => a + b, 0);
      const finalTagCount = stageFinalTargetTag ? (stageTags[stageFinalTargetTag] || 0) : 0;

      if (mainTab === 'personal') {
        const input: UpsertPersonalSnapshotInput = {
          date: dateStr,
          total_leads: totalLeads,
          total_responses: totalResponses,
          response_tags: responseTags,
          stage_tags: stageTags,
          funnel_tag_count: funnelTagCount,
          final_tag_count: finalTagCount,
          funnel_tag: stageTagNames[0] || null,
          final_tag: stageFinalTargetTag,
          upline_leader_id: profile?.leaders_id_of_my_leader || null,
          source: 'MANUAL' as const,
        };
        await upsertPersonal(input);
        toast.success('Personal tracking saved!');
      } else {
        const input: UpsertTotalSnapshotInput = {
          date: dateStr,
          total_leads: totalLeads,
          total_responses: totalResponses,
          response_tags: responseTags,
          stage_tags: stageTags,
          funnel_tag_count: funnelTagCount,
          final_tag_count: finalTagCount,
          funnel_tag: stageTagNames[0] || null,
          final_tag: stageFinalTargetTag,
          upline_leader_id: profile?.leaders_id_of_my_leader || null,
        };
        await upsertTotal(input);
        toast.success('Total tracking saved!');
      }

      onSaveComplete?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving tracking:', error);
      toast.error('Failed to save tracking data');
    }
  };

  const handleResponseTagChange = (tagName: string, value: number) => {
    setResponseTags(prev => ({
      ...prev,
      [tagName]: Math.max(0, value)
    }));
  };

  const handleStageTagChange = (tagName: string, value: number) => {
    setStageTags(prev => ({
      ...prev,
      [tagName]: Math.max(0, value)
    }));
  };

  const isUpserting = isUpsertingPersonal || isUpsertingTotal;
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const isInputDisabled = mainTab === 'total' && isAutoMode;

  const mainTabOptions: [{ value: string; label: string; icon: typeof Users }, { value: string; label: string; icon: typeof TrendingUp }] = [
    { value: 'personal', label: 'Personal', icon: Users },
    { value: 'total', label: 'Total', icon: TrendingUp },
  ];

  const subTabOptions: [{ value: string; label: string; icon: typeof Users }, { value: string; label: string; icon: typeof TrendingUp }] = [
    { value: 'leads', label: 'Leads', icon: Users },
    { value: 'funnel', label: 'Funnel', icon: TrendingUp },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 pb-0 sticky top-0 bg-background z-10 border-b border-border/50">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">Update Tracking</DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Personal / Total Toggle */}
          <div className="pt-3">
            <TopTabBar 
              options={mainTabOptions} 
              value={mainTab} 
              onChange={(v) => setMainTab(v as 'personal' | 'total')} 
            />
          </div>

          {/* Leads / Funnel Toggle */}
          <div className="py-3">
            <TopTabBar 
              options={subTabOptions} 
              value={subTab} 
              onChange={(v) => setSubTab(v as 'leads' | 'funnel')} 
            />
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Auto Mode Toggle (only for Total) */}
          {mainTab === 'total' && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30">
              <div className="flex items-center gap-3">
                {isAutoMode ? (
                  <Zap className="h-5 w-5 text-primary" />
                ) : (
                  <Settings className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium text-sm">
                    {isAutoMode ? 'Auto Mode' : 'Manual Mode'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isAutoMode ? 'From Personal data' : 'Manual entry'}
                  </p>
                </div>
              </div>
              <Switch
                checked={isAutoMode}
                onCheckedChange={handleModeToggle}
                disabled={isUpdatingPrefs}
              />
            </div>
          )}

          {/* Auto Mode Info Banner */}
          {isInputDisabled && (
            <Alert className="border-primary/20 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                Total tracking is auto-calculated from Personal + Team data
              </AlertDescription>
            </Alert>
          )}

          {/* Date Selector */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Date</Label>
              {isToday && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  Today
                </span>
              )}
            </div>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  {format(selectedDate, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
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
          </div>

          {/* Input Fields */}
          {subTab === 'leads' ? (
            <div className="space-y-4">
              {/* Total Leads Input */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Total Leads</Label>
                <Input
                  type="number"
                  min={0}
                  value={totalLeads}
                  onChange={(e) => setTotalLeads(Math.max(0, parseInt(e.target.value) || 0))}
                  className="text-lg font-semibold text-center h-12"
                  placeholder="0"
                  disabled={isInputDisabled}
                />
              </div>

              {/* Response Tags */}
              {leadsTrackingTagNames.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Response Tags</Label>
                  <div className="space-y-2">
                    {leadsTrackingTagNames.map((tagName) => (
                      <div key={tagName} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-muted/30">
                        <span className={cn(
                          "text-sm font-medium truncate flex-1",
                          tagName === leadsFinalTargetTag && "text-primary"
                        )}>
                          {tagName}
                          {tagName === leadsFinalTargetTag && <span className="ml-1">🎯</span>}
                        </span>
                        <Input
                          type="number"
                          min={0}
                          value={responseTags[tagName] || 0}
                          onChange={(e) => handleResponseTagChange(tagName, parseInt(e.target.value) || 0)}
                          className="w-20 text-center h-9"
                          disabled={isInputDisabled}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Funnel Stages */}
              {stageTagNames.length > 0 ? (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Funnel Stages</Label>
                  <div className="space-y-2">
                    {stageTagNames.map((tagName) => (
                      <div key={tagName} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-muted/30">
                        <span className={cn(
                          "text-sm font-medium truncate flex-1",
                          tagName === stageFinalTargetTag && "text-primary"
                        )}>
                          {tagName}
                          {tagName === stageFinalTargetTag && <span className="ml-1">🏆</span>}
                        </span>
                        <Input
                          type="number"
                          min={0}
                          value={stageTags[tagName] || 0}
                          onChange={(e) => handleStageTagChange(tagName, parseInt(e.target.value) || 0)}
                          className="w-20 text-center h-9"
                          disabled={isInputDisabled}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No funnel stages configured</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons - Sticky Footer */}
        <div className="sticky bottom-0 p-4 bg-background border-t border-border/50 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={isUpserting || isInputDisabled}
          >
            {isUpserting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save & Update
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
