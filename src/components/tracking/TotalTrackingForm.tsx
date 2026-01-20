import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Calendar, TrendingUp, Users, Check, Loader2, Settings, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTotalSnapshot, UpsertTotalSnapshotInput } from '@/hooks/useTotalSnapshot';
import { usePersonalSnapshot } from '@/hooks/usePersonalSnapshot';
import { useTrackingSourcePreferences } from '@/hooks/useTrackingSourcePreferences';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function TotalTrackingForm() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeSubTab, setActiveSubTab] = useState<'leads' | 'funnel'>('leads');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  
  // Form state
  const [totalLeads, setTotalLeads] = useState(0);
  const [responseTags, setResponseTags] = useState<Record<string, number>>({});
  const [stageTags, setStageTags] = useState<Record<string, number>>({});
  
  const { 
    fetchSnapshotByDate: fetchTotalSnapshot, 
    upsertSnapshot: upsertTotalSnapshot, 
    isUpserting 
  } = useTotalSnapshot();
  
  const { 
    fetchSnapshotByDate: fetchPersonalSnapshot 
  } = usePersonalSnapshot();
  
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

  // Initialize auto mode from preferences
  useEffect(() => {
    setIsAutoMode(teamSource === 'AUTO');
  }, [teamSource]);

  // Calculate auto totals from personal data
  const calculateAutoTotals = useCallback(async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const personalSnapshot = await fetchPersonalSnapshot(dateStr);
    
    if (personalSnapshot) {
      // In AUTO mode, total = personal (for now, future: personal + team members)
      setTotalLeads(personalSnapshot.total_leads);
      setResponseTags(personalSnapshot.response_tags || {});
      setStageTags(personalSnapshot.stage_tags || {});
    } else {
      setTotalLeads(0);
      setResponseTags({});
      setStageTags({});
    }
  }, [selectedDate, fetchPersonalSnapshot]);

  // Load existing snapshot when date changes
  useEffect(() => {
    const loadSnapshot = async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      if (isAutoMode) {
        await calculateAutoTotals();
      } else {
        const snapshot = await fetchTotalSnapshot(dateStr);
        
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
    };
    
    loadSnapshot();
  }, [selectedDate, fetchTotalSnapshot, isAutoMode, calculateAutoTotals]);

  const handleModeToggle = async (checked: boolean) => {
    setIsAutoMode(checked);
    await setTeamSource(checked ? 'AUTO' : 'MANUAL');
    
    if (checked) {
      await calculateAutoTotals();
      toast.success('Switched to Automated mode');
    } else {
      toast.success('Switched to Manual mode');
    }
  };

  const handleSave = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Calculate totals
      const totalResponses = Object.values(responseTags).reduce((a, b) => a + b, 0);
      const funnelTagCount = Object.values(stageTags).reduce((a, b) => a + b, 0);
      const finalTagCount = stageFinalTargetTag ? (stageTags[stageFinalTargetTag] || 0) : 0;
      
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
      
      await upsertTotalSnapshot(input);
      toast.success('Total tracking saved!');
    } catch (error) {
      console.error('Error saving total tracking:', error);
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

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-4 pb-4">
      {/* Mode Toggle */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isAutoMode ? (
                <Zap className="h-5 w-5 text-primary" />
              ) : (
                <Settings className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {isAutoMode ? 'Automated Mode' : 'Manual Mode'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isAutoMode 
                    ? 'Auto-calculates from Personal tracking'
                    : 'Enter total values manually'
                  }
                </p>
              </div>
            </div>
            <Switch
              checked={isAutoMode}
              onCheckedChange={handleModeToggle}
              disabled={isUpdatingPrefs}
            />
          </div>
        </CardContent>
      </Card>

      {/* Date Selector */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Select Date</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
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
          {isToday && (
            <p className="text-xs text-primary mt-2 font-medium">📅 Today's Total</p>
          )}
        </CardContent>
      </Card>

      {/* Leads / Funnel Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as 'leads' | 'funnel')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="leads" className="gap-2">
            <Users className="h-4 w-4" />
            Total Leads
          </TabsTrigger>
          <TabsTrigger value="funnel" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Total Funnel
          </TabsTrigger>
        </TabsList>

        {/* Leads Tracking */}
        <TabsContent value="leads" className="mt-4 space-y-4">
          {/* Total Leads Input */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Total Leads
                {isAutoMode && <span className="text-xs text-primary">(Auto)</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="number"
                min={0}
                value={totalLeads}
                onChange={(e) => setTotalLeads(Math.max(0, parseInt(e.target.value) || 0))}
                className="text-lg font-semibold text-center"
                placeholder="0"
                disabled={isAutoMode}
              />
            </CardContent>
          </Card>

          {/* Response Tags */}
          {leadsTrackingTagNames.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  Response Tags
                  {isAutoMode && <span className="text-xs text-primary">(Auto)</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {leadsTrackingTagNames.map((tagName) => (
                  <div key={tagName} className="flex items-center justify-between gap-4">
                    <Label className="text-sm flex-1 truncate">
                      {tagName}
                      {tagName === leadsFinalTargetTag && (
                        <span className="ml-1 text-xs text-primary">🎯</span>
                      )}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={responseTags[tagName] || 0}
                      onChange={(e) => handleResponseTagChange(tagName, parseInt(e.target.value) || 0)}
                      className="w-24 text-center"
                      disabled={isAutoMode}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Funnel Tracking */}
        <TabsContent value="funnel" className="mt-4 space-y-4">
          {stageTagNames.length > 0 ? (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  Funnel Stages
                  {isAutoMode && <span className="text-xs text-primary">(Auto)</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stageTagNames.map((tagName) => (
                  <div key={tagName} className="flex items-center justify-between gap-4">
                    <Label className="text-sm flex-1 truncate">
                      {tagName}
                      {tagName === stageFinalTargetTag && (
                        <span className="ml-1 text-xs text-primary">🏆</span>
                      )}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={stageTags[tagName] || 0}
                      onChange={(e) => handleStageTagChange(tagName, parseInt(e.target.value) || 0)}
                      className="w-24 text-center"
                      disabled={isAutoMode}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No funnel stages configured</p>
                <p className="text-xs mt-1">Configure stages in your Profile settings</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Save Button - Sticky (only for manual mode) */}
      {!isAutoMode && (
        <div className="sticky bottom-20 pt-2">
          <Button
            onClick={handleSave}
            disabled={isUpserting}
            className="w-full h-12 text-base font-semibold shadow-lg"
          >
            {isUpserting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                Save Total Tracking
              </>
            )}
          </Button>
        </div>
      )}

      {/* Auto Mode Info */}
      {isAutoMode && (
        <div className="sticky bottom-20 pt-2">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 text-center">
              <Zap className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">Automated Mode Active</p>
              <p className="text-xs text-muted-foreground">
                Total values are calculated from your Personal tracking data.
                Update your Personal tracking to see changes here.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
