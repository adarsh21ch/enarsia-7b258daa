import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, Tag, Copy, Check, Loader2, Eye, EyeOff, X, Plus, Trash2, Star, Layers, CalendarDays, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Profile, ProfileUpdate } from '@/hooks/useProfile';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { Checkbox } from '@/components/ui/checkbox';
import { useLeaderLevels } from '@/hooks/useLeaderLevels';
import { useFunnelConfig } from '@/hooks/useFunnelConfig';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
interface LeaderTrackingFormatSettingsProps {
  profile: Profile | null;
  updating: boolean;
  onUpdateProfile: (updates: ProfileUpdate) => Promise<{
    error: any;
  }>;
  onUpdateLeaderHierarchy: (leaderId: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  onClearLeaderHierarchy: () => Promise<{
    success: boolean;
    error?: string;
  }>;
}
interface LeadsTagInput {
  name: string;
  isStageTag: boolean;
  isFinalTarget: boolean;
}
interface StageTagInput {
  name: string;
  isFinalTarget: boolean;
}
export function LeaderTrackingFormatSettings({
  profile,
  updating,
  onUpdateProfile,
  onUpdateLeaderHierarchy,
  onClearLeaderHierarchy
}: LeaderTrackingFormatSettingsProps) {
  const {
    trackingFormat,
    refreshFormat,
    isRootLeader,
    rootLeaderName,
    levels: inheritedLevels,
    leaderLeadsPersonalTags,
    leaderStagePersonalTags,
    ownLeadsPersonalTags: contextOwnLeadsPersonal,
    ownStagePersonalTags: contextOwnStagePersonal,
  } = useTrackingFormatContext();
  const {
    levels: ownLevels,
    addLevel,
    updateLevel,
    deleteLevel
  } = useLeaderLevels();
  const { config: funnelConfig, leaderConfig: leaderFunnelConfig, saveConfig: saveFunnelConfig, fetchLeaderConfig, loading: funnelConfigLoading } = useFunnelConfig();
  
  const [copiedId, setCopiedId] = useState(false);
  const [leaderIdInput, setLeaderIdInput] = useState('');
  const [savingLeader, setSavingLeader] = useState(false);
  const [formatMode, setFormatMode] = useState<'leader' | 'own'>('leader');
  
  // Funnel config state
  const [funnelDay1Date, setFunnelDay1Date] = useState<Date | undefined>(undefined);
  const [funnelLength, setFunnelLength] = useState<number>(3);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [leaderName, setLeaderName] = useState<string | null>(null);

  // Team Levels state
  const [newLevelLabel, setNewLevelLabel] = useState('');

  // Leads Tracking Tags state (max 4) - one tag can be marked as stage tag
  const [leadsTrackingTags, setLeadsTrackingTags] = useState<LeadsTagInput[]>([{
    name: '',
    isStageTag: false,
    isFinalTarget: false
  }]);
  const [leadsNonTrackingTags, setLeadsNonTrackingTags] = useState<string[]>([]);
  const [newLeadsNonTrackingTag, setNewLeadsNonTrackingTag] = useState('');

  // Stage Tags state - last tag is final target
  const [stageTags, setStageTags] = useState<StageTagInput[]>([{
    name: '',
    isFinalTarget: true // Single tag is final target
  }]);
  const [stageNonTrackingTags, setStageNonTrackingTags] = useState<string[]>([]);
  const [newStageNonTrackingTag, setNewStageNonTrackingTag] = useState('');
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Debounce timer ref
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Flag to prevent re-initialization after initial load
  const initializedRef = useRef(false);

  // Initialize state from profile - only once
  useEffect(() => {
    if (profile && !initializedRef.current) {
      initializedRef.current = true;
      
      const isUsingLeaderFormat = profile.use_leader_stages && !!profile.leaders_id_of_my_leader;
      setFormatMode(isUsingLeaderFormat ? 'leader' : 'own');

      // Parse leads tracking tags from response_labels
      const responseLabels = profile.response_labels as any;
      if (responseLabels) {
        if (typeof responseLabels === 'object' && responseLabels.tracking) {
          const tags = (responseLabels.tracking || []).map((t: any) => ({
            name: t.name || '',
            isStageTag: t.isStageTag ?? t.isFilter ?? false,
            isFinalTarget: t.isFinalTarget ?? false
          }));
          setLeadsTrackingTags(tags.length > 0 ? tags : [{
            name: '',
            isStageTag: false,
            isFinalTarget: false
          }]);
          setLeadsNonTrackingTags(responseLabels.nonTracking || []);
        } else if (Array.isArray(responseLabels)) {
          // Legacy format - no filter tags by default
          const tags = responseLabels.slice(0, 4).map((name: string) => ({
            name,
            isStageTag: false,
            isFinalTarget: false
          }));
          setLeadsTrackingTags(tags.length > 0 ? tags : [{
            name: '',
            isStageTag: false,
            isFinalTarget: false
          }]);
          setLeadsNonTrackingTags(responseLabels.slice(4));
        }
      }

      // Parse filter tags from stage_labels
      const stageLabels = profile.stage_labels as any;
      if (stageLabels) {
        if (typeof stageLabels === 'object' && stageLabels.stages) {
          const tags = (stageLabels.stages || []).map((s: any) => ({
            name: s.name || '',
            isFinalTarget: s.isFinalTarget ?? false
          }));
          setStageTags(tags.length > 0 ? tags : [{
            name: '',
            isFinalTarget: false
          }]);
          setStageNonTrackingTags(stageLabels.nonTracking || []);
        } else if (Array.isArray(stageLabels)) {
          // Legacy format
          const tags = stageLabels.map((name: string, idx: number, arr: string[]) => ({
            name,
            isFinalTarget: idx === arr.length - 1
          }));
          setStageTags(tags.length > 0 ? tags : [{
            name: '',
            isFinalTarget: false
          }]);
        }
      }
    }
  }, [profile]);

  // Fetch leader name and funnel config when connected
  useEffect(() => {
    const fetchLeaderData = async () => {
      if (profile?.leaders_id_of_my_leader) {
        // Fetch leader name
        const { data, error } = await supabase.rpc('get_user_by_neverai_id', {
          target_neverai_id: profile.leaders_id_of_my_leader.toUpperCase()
        });
        if (!error && data && data.length > 0) {
          setLeaderName(data[0].display_name || null);
        } else {
          setLeaderName(null);
        }
        
        // Fetch leader's funnel config
        await fetchLeaderConfig(profile.leaders_id_of_my_leader);
      } else {
        setLeaderName(null);
      }
    };
    fetchLeaderData();
  }, [profile?.leaders_id_of_my_leader, fetchLeaderConfig]);

  // Initialize funnel config from saved data
  useEffect(() => {
    if (funnelConfig) {
      setFunnelDay1Date(new Date(funnelConfig.day_1_start));
      setFunnelLength(funnelConfig.funnel_length);
    }
  }, [funnelConfig]);

  // Handle funnel Day 1 date change
  const handleFunnelDateSelect = async (date: Date | undefined) => {
    if (!date) return;
    setFunnelDay1Date(date);
    setDatePickerOpen(false);
    await saveFunnelConfig({
      funnel_name: 'Default Funnel',
      funnel_length: funnelLength,
      day_1_start: format(date, 'yyyy-MM-dd'),
    });
    toast.success('Funnel start date saved');
  };

  // Handle funnel length change
  const handleFunnelLengthChange = async (value: string) => {
    const length = parseInt(value);
    setFunnelLength(length);
    if (funnelDay1Date) {
      await saveFunnelConfig({
        funnel_name: 'Default Funnel',
        funnel_length: length,
        day_1_start: format(funnelDay1Date, 'yyyy-MM-dd'),
      });
      toast.success('Funnel length saved');
    }
  };

  // Auto-save personal tags when in leader mode
  const autoSavePersonalTags = useCallback(async () => {
    if (formatMode !== 'leader') return;
    setAutoSaveStatus('saving');

    // When using leader format, only save personal tags to user's own profile
    // Tracking tags come from leader, but personal tags are user's own
    const currentResponseLabels = profile?.response_labels as any;
    const currentStageLabels = profile?.stage_labels as any;
    
    // Preserve any existing tracking structure (though it shouldn't be used when use_leader_stages=true)
    const responseLabelsData = {
      tracking: currentResponseLabels?.tracking || [],
      nonTracking: leadsNonTrackingTags
    };
    
    const stageLabelsData = {
      stages: currentStageLabels?.stages || [],
      nonTracking: stageNonTrackingTags
    };
    
    await onUpdateProfile({
      response_labels: responseLabelsData as any,
      stage_labels: stageLabelsData as any,
    });
    refreshFormat();
    setAutoSaveStatus('saved');
    setTimeout(() => setAutoSaveStatus('idle'), 1500);
  }, [formatMode, leadsNonTrackingTags, stageNonTrackingTags, onUpdateProfile, refreshFormat, profile?.response_labels, profile?.stage_labels]);

  const autoSaveFormat = useCallback(async () => {
    if (formatMode !== 'own') return;
    setAutoSaveStatus('saving');

    // Build response_labels with new structure
    const validLeadsTags = leadsTrackingTags.filter(t => t.name.trim());
    const responseLabelsData = {
      tracking: validLeadsTags.map(t => ({
        name: t.name.trim(),
        isStageTag: t.isStageTag,
        isFinalTarget: t.isFinalTarget
      })),
      nonTracking: leadsNonTrackingTags
    };

    // Build stage_labels with new structure
    const validStageTags = stageTags.filter(t => t.name.trim());
    const stageLabelsData = {
      stages: validStageTags.map(s => ({
        name: s.name.trim(),
        isFinalTarget: s.isFinalTarget
      })),
      nonTracking: stageNonTrackingTags
    };
    await onUpdateProfile({
      use_leader_stages: false,
      response_labels: responseLabelsData as any,
      stage_labels: stageLabelsData as any,
      stage_count: validStageTags.length
    });
    refreshFormat();
    setAutoSaveStatus('saved');
    setTimeout(() => setAutoSaveStatus('idle'), 1500);
  }, [formatMode, leadsTrackingTags, leadsNonTrackingTags, stageTags, stageNonTrackingTags, onUpdateProfile, refreshFormat]);

  // Debounced auto-save
  const triggerAutoSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      if (formatMode === 'own') {
        autoSaveFormat();
      } else {
        autoSavePersonalTags();
      }
    }, 800);
  }, [autoSaveFormat, autoSavePersonalTags, formatMode]);
  const handleCopyLeaderId = async () => {
    if (profile?.neverai_id) {
      await navigator.clipboard.writeText(profile.neverai_id);
      setCopiedId(true);
      toast.success('Leader ID copied');
      setTimeout(() => setCopiedId(false), 2000);
    }
  };
  const handleSaveLeaderId = async () => {
    if (!leaderIdInput.trim()) return;
    setSavingLeader(true);
    const result = await onUpdateLeaderHierarchy(leaderIdInput.trim().toUpperCase());
    if (result.success) {
      setLeaderIdInput('');
      setFormatMode('leader');
      await onUpdateProfile({
        use_leader_stages: true
      });
      refreshFormat();
      toast.success('Connected to leader. You are now using their tracking format.');
    }
    setSavingLeader(false);
  };
  const handleClearLeader = async () => {
    await onClearLeaderHierarchy();
    setFormatMode('own');
    await onUpdateProfile({
      use_leader_stages: false
    });
    refreshFormat();
  };
  const handleToggleVisibility = async (value: boolean) => {
    await onUpdateProfile({
      allow_leader_to_view: value
    });
  };
  const handleFormatModeChange = async (mode: 'leader' | 'own') => {
    if (mode === 'own' && formatMode === 'leader') {
      setFormatMode('own');
      await onUpdateProfile({
        use_leader_stages: false
      });
      refreshFormat();
      toast.success('You can now create your own tracking format');
    } else if (mode === 'leader' && formatMode === 'own') {
      if (!profile?.leaders_id_of_my_leader) {
        toast.error('Please enter a Leader ID first');
        return;
      }
      setShowSwitchConfirm(true);
    }
  };
  const confirmSwitchToLeader = async () => {
    setShowSwitchConfirm(false);
    setFormatMode('leader');
    await onUpdateProfile({
      use_leader_stages: true
    });
    refreshFormat();
    toast.success('Now using leader tracking format');
  };

  // === LEADS TAG HANDLERS ===
  const handleLeadsTagChange = (index: number, field: keyof LeadsTagInput, value: any) => {
    setLeadsTrackingTags(prev => {
      const updated = [...prev];
      if (field === 'isStageTag' && value === true) {
        // Only ONE tag can be the Filter Tag at a time
        updated.forEach((t, i) => {
          t.isStageTag = i === index;
        });
      } else {
        updated[index] = {
          ...updated[index],
          [field]: value
        };
      }
      return updated;
    });
    triggerAutoSave();
  };
  const handleAddLeadsTag = () => {
    if (leadsTrackingTags.length < 4) {
      setLeadsTrackingTags([...leadsTrackingTags, {
        name: '',
        isStageTag: false,
        isFinalTarget: false
      }]);
    }
  };
  const handleRemoveLeadsTag = (index: number) => {
    if (leadsTrackingTags.length > 1) {
      const updated = leadsTrackingTags.filter((_, i) => i !== index);
      setLeadsTrackingTags(updated);
      triggerAutoSave();
    }
  };
  const handleAddLeadsNonTracking = () => {
    if (newLeadsNonTrackingTag.trim() && !leadsNonTrackingTags.includes(newLeadsNonTrackingTag.trim())) {
      setLeadsNonTrackingTags([...leadsNonTrackingTags, newLeadsNonTrackingTag.trim()]);
      setNewLeadsNonTrackingTag('');
      triggerAutoSave();
    }
  };
  const handleRemoveLeadsNonTracking = (index: number) => {
    setLeadsNonTrackingTags(leadsNonTrackingTags.filter((_, i) => i !== index));
    triggerAutoSave();
  };

  // === STAGE TAG HANDLERS ===
  const handleStageTagChange = (index: number, field: keyof StageTagInput, value: any) => {
    setStageTags(prev => {
      const updated = [...prev];
      if (field === 'isFinalTarget' && value === true) {
        updated.forEach((t, i) => {
          t.isFinalTarget = i === index;
        });
      } else {
        updated[index] = {
          ...updated[index],
          [field]: value
        };
      }
      return updated;
    });
    triggerAutoSave();
  };
  const handleAddStageTag = () => {
    if (stageTags.length < 10) {
      // Move final target to the new last tag
      const updated = stageTags.map(t => ({ ...t, isFinalTarget: false }));
      setStageTags([...updated, {
        name: '',
        isFinalTarget: true // New tag becomes final target
      }]);
    }
  };
  const handleRemoveStageTag = (index: number) => {
    if (stageTags.length > 1) {
      const updated = stageTags.filter((_, i) => i !== index);
      if (!updated.some(t => t.isFinalTarget) && updated.length > 0) {
        updated[updated.length - 1].isFinalTarget = true;
      }
      setStageTags(updated);
      triggerAutoSave();
    }
  };
  const handleAddStageNonTracking = () => {
    if (newStageNonTrackingTag.trim() && !stageNonTrackingTags.includes(newStageNonTrackingTag.trim())) {
      setStageNonTrackingTags([...stageNonTrackingTags, newStageNonTrackingTag.trim()]);
      setNewStageNonTrackingTag('');
      triggerAutoSave();
    }
  };
  const handleRemoveStageNonTracking = (index: number) => {
    setStageNonTrackingTags(stageNonTrackingTags.filter((_, i) => i !== index));
    triggerAutoSave();
  };

  // === LEVEL HANDLERS ===
  const handleAddLevel = async () => {
    if (newLevelLabel.trim()) {
      await addLevel(newLevelLabel.trim(), `L${ownLevels.length + 1}`);
      setNewLevelLabel('');
    }
  };
  const handleUpdateLevelLabel = async (levelId: string, newLabel: string) => {
    await updateLevel(levelId, {
      label: newLabel
    });
  };
  const hasLeader = !!profile?.leaders_id_of_my_leader;
  const displayLevels = formatMode === 'own' ? ownLevels : inheritedLevels;
  return <div className="space-y-6">
      {/* Your Leader ID Section */}
      <div className="rounded-2xl p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Your Leader ID</p>
              <p className="text-sm font-mono font-semibold">{profile?.neverai_id || 'Loading...'}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleCopyLeaderId} className="h-9 w-9" disabled={!profile?.neverai_id}>
            {copiedId ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Share this ID with your team so they can use your tracking format.
        </p>
      </div>

      <Separator />

      {/* Funnel Tracking Configuration */}
      <div className="rounded-2xl p-4 bg-card border border-border/50 space-y-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          <Label className="text-sm font-semibold">Funnel Tracking Configuration</Label>
          {hasLeader && formatMode === 'leader' && (
            <Badge variant="secondary" className="text-[10px] ml-auto">From leader</Badge>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground">
          {hasLeader && formatMode === 'leader' 
            ? "Using your leader's funnel configuration. Disconnect to set your own."
            : "Set your funnel start date and how many days each funnel lasts. The system will auto-calculate which funnel number each lead belongs to."
          }
        </p>

        {/* Show leader config as read-only when using leader format */}
        {hasLeader && formatMode === 'leader' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Day 1 Start Date - Read Only */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Funnel Day 1 Start Date</Label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-muted/50">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {leaderFunnelConfig?.day_1_start 
                    ? format(new Date(leaderFunnelConfig.day_1_start), 'MMM d, yyyy')
                    : 'Not set by leader'
                  }
                </span>
              </div>
            </div>

            {/* Funnel Length - Read Only */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Days per Funnel</Label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-muted/50">
                <span className="text-sm">
                  {leaderFunnelConfig?.funnel_length 
                    ? `${leaderFunnelConfig.funnel_length} ${leaderFunnelConfig.funnel_length === 1 ? 'day' : 'days'}`
                    : 'Not set by leader'
                  }
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Day 1 Start Date - Editable */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Funnel Day 1 Start Date</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className={cn(
                      "w-full justify-start text-left font-normal h-10",
                      !funnelDay1Date && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {funnelDay1Date ? format(funnelDay1Date, 'MMM d, yyyy') : 'Select start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={funnelDay1Date}
                    onSelect={handleFunnelDateSelect}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Funnel Length - Editable */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Days per Funnel</Label>
              <Select value={funnelLength.toString()} onValueChange={handleFunnelLengthChange}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Select days" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? 'day' : 'days'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Current config summary */}
        {(hasLeader && formatMode === 'leader' ? leaderFunnelConfig?.day_1_start : funnelDay1Date) && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Current config:</span>{' '}
              {hasLeader && formatMode === 'leader' 
                ? `${leaderFunnelConfig?.funnel_length || 3}-day funnels starting from ${leaderFunnelConfig?.day_1_start ? format(new Date(leaderFunnelConfig.day_1_start), 'MMMM d, yyyy') : 'N/A'}`
                : `${funnelLength}-day funnels starting from ${funnelDay1Date ? format(funnelDay1Date, 'MMMM d, yyyy') : 'N/A'}`
              }
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Leader ID Input Section - Always Visible at Top */}
      <div className="rounded-2xl p-4 bg-card border border-border/50 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Your Leader's ID</Label>
          </div>
          {autoSaveStatus === 'saving' && <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving...
            </span>}
          {autoSaveStatus === 'saved' && <span className="text-xs text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" /> Saved
            </span>}
        </div>
        
        <p className="text-xs text-muted-foreground">
          Enter your leader's ID to use their tracking format (tags, levels, and funnel logic).
        </p>

        {/* Leader ID Input - Always visible */}
        {hasLeader ? <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div>
                <p className="text-xs text-muted-foreground">Connected to Leader</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono font-semibold text-primary">{profile?.leaders_id_of_my_leader}</p>
                  {leaderName && (
                    <span className="text-sm text-foreground font-medium">({leaderName})</span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearLeader} disabled={updating}>
                <X className="h-4 w-4 mr-1" />
                Disconnect
              </Button>
            </div>
            
            {/* Visibility Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                {profile?.allow_leader_to_view ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm">Allow leader to see my data</span>
              </div>
              <Switch checked={profile?.allow_leader_to_view || false} onCheckedChange={handleToggleVisibility} disabled={updating} />
            </div>

            {/* Inherited Format Preview */}
            <Separator />
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground font-medium">Inherited Tracking Format (Read-only)</p>
              
              {/* Inherited Team Levels */}
              {inheritedLevels.length > 0 && <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">Team Levels</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {inheritedLevels.map((level, idx) => <Badge key={level.id} variant="secondary" className="text-xs">
                        L{idx + 1}: {level.label}
                      </Badge>)}
                  </div>
                </div>}

              {/* Inherited Leads Tracking Tags */}
              {trackingFormat?.leadsTrackingTags && trackingFormat.leadsTrackingTags.length > 0 && <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">Leads Tracking Tags</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trackingFormat.leadsTrackingTags.map((tag, idx) => <Badge key={idx} variant="outline" className="text-xs gap-1">
                        {tag.name}
                        {tag.isFinalTarget && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />}
                      </Badge>)}
                  </div>
                </div>}

              {/* Inherited Funnel Tracking Tags */}
              {trackingFormat?.stageTags && trackingFormat.stageTags.length > 0 && <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Layers className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">Funnel Tracking Tags (Stages)</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trackingFormat.stageTags.map((tag, idx) => <Badge key={idx} variant="outline" className="text-xs gap-1">
                        {tag.name}
                        {tag.isFinalTarget && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />}
                      </Badge>)}
                  </div>
                </div>}

              {/* Leader's Personal Tags (Read-only) */}
              <Separator className="my-3" />
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Leader's Personal Tags (read-only)</p>
                
                {/* Leader's Leads Personal Tags */}
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground">Leads:</p>
                  <div className="flex flex-wrap gap-1">
                    {leaderLeadsPersonalTags.length > 0 ? (
                      leaderLeadsPersonalTags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No personal tags</span>
                    )}
                  </div>
                </div>
                
                {/* Leader's Funnel Personal Tags */}
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground">Funnel:</p>
                  <div className="flex flex-wrap gap-1">
                    {leaderStagePersonalTags.length > 0 ? (
                      leaderStagePersonalTags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No personal tags</span>
                    )}
                  </div>
                </div>
              </div>

              {/* User's Own Personal Tags (Editable) */}
              <Separator className="my-3" />
              <div className="space-y-3">
                <p className="text-xs font-medium text-foreground">Your Personal Tags (not counted)</p>
                <p className="text-[10px] text-muted-foreground/70">Personal tags are just for your own use and are not counted in analytics.</p>
                
                {/* User's Own Leads Personal Tags */}
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground">Leads Personal Tags:</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {leadsNonTrackingTags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="gap-1 pr-1">
                        {tag}
                        <button onClick={() => handleRemoveLeadsNonTracking(idx)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      value={newLeadsNonTrackingTag} 
                      onChange={e => setNewLeadsNonTrackingTag(e.target.value)} 
                      placeholder="Add personal tag..." 
                      className="flex-1 h-8" 
                      onKeyDown={e => e.key === 'Enter' && handleAddLeadsNonTracking()} 
                    />
                    <Button variant="outline" size="sm" onClick={handleAddLeadsNonTracking} disabled={!newLeadsNonTrackingTag.trim()}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                {/* User's Own Funnel Personal Tags */}
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground">Funnel Personal Tags:</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {stageNonTrackingTags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="gap-1 pr-1">
                        {tag}
                        <button onClick={() => handleRemoveStageNonTracking(idx)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      value={newStageNonTrackingTag} 
                      onChange={e => setNewStageNonTrackingTag(e.target.value)} 
                      placeholder="Add personal tag..." 
                      className="flex-1 h-8" 
                      onKeyDown={e => e.key === 'Enter' && handleAddStageNonTracking()} 
                    />
                    <Button variant="outline" size="sm" onClick={handleAddStageNonTracking} disabled={!newStageNonTrackingTag.trim()}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Show message if no format loaded yet */}
              {!trackingFormat?.leadsTrackingTags?.length && !trackingFormat?.stageTags?.length && !inheritedLevels.length && <p className="text-xs text-muted-foreground italic">Loading inherited format...</p>}
            </div>
          </div> : <div className="space-y-2">
            <div className="flex gap-2">
              <Input placeholder="Enter Leader ID…" value={leaderIdInput} onChange={e => setLeaderIdInput(e.target.value.toUpperCase())} className="font-mono" />
              <Button onClick={handleSaveLeaderId} disabled={!leaderIdInput.trim() || savingLeader} size="sm">
                {savingLeader ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect'}
              </Button>
            </div>
          </div>}
      </div>

      {/* Create Own Format Option */}
      {!hasLeader && <div className="rounded-2xl p-4 bg-card border border-border/50">
          <div className="flex items-center gap-3">
            <div className="text-muted-foreground text-sm">— or —</div>
          </div>
          <button onClick={() => handleFormatModeChange('own')} className={`mt-3 w-full text-left p-3 rounded-lg border transition-colors ${formatMode === 'own' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'}`}>
            <p className="font-medium text-sm">Create My Own Tracking Format</p>
            <p className="text-xs text-muted-foreground mt-1">
              Define your own tracking tags, levels, and become a root leader for your team.
            </p>
          </button>
        </div>}

      {/* Own Format Editor */}
      {formatMode === 'own' && <div className="rounded-2xl p-4 bg-card border border-border/50 space-y-6">
          
          {/* 1. TEAM LEVELS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Team Levels</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Define levels for your team members. New members joining with your Leader ID will be assigned Level 1 as default.
            </p>
            
            <div className="space-y-2">
              {ownLevels.map((level, index) => <div key={level.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                  <span className="text-xs text-muted-foreground w-16 shrink-0">Level {index + 1}</span>
                  <Input value={level.label} onChange={e => handleUpdateLevelLabel(level.id, e.target.value)} onBlur={() => handleUpdateLevelLabel(level.id, level.label)} placeholder="Aligned name..." className="flex-1 h-8" />
                  {level.is_default && <Badge variant="outline" className="text-xs shrink-0">Default</Badge>}
                  {ownLevels.length > 1 && !level.is_default && <Button variant="ghost" size="icon" onClick={() => deleteLevel(level.id)} className="h-7 w-7 text-destructive shrink-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>}
                </div>)}
            </div>
            
            {ownLevels.length < 10 && <div className="flex gap-2">
                <Input value={newLevelLabel} onChange={e => setNewLevelLabel(e.target.value)} placeholder="Add new level..." className="flex-1 h-8" onKeyDown={e => e.key === 'Enter' && handleAddLevel()} />
                <Button variant="outline" size="sm" onClick={handleAddLevel} disabled={!newLevelLabel.trim()}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>}
          </div>

          <Separator />

          {/* 2. LEADS TRACKING TAGS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Leads Tracking Tags (Responses)</p>
              </div>
              {leadsTrackingTags.length < 4 && <Button variant="outline" size="sm" onClick={handleAddLeadsTag}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>}
            </div>
            <p className="text-xs text-muted-foreground">
              These tags are used in the Leads tab and are counted in analytics. Mark one as ★ Funnel Tag to move leads to the Funnel tab.
            </p>
            
            <div className="space-y-2">
              {leadsTrackingTags.map((tag, index) => <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                  <span className="text-xs text-muted-foreground w-6">#{index + 1}</span>
                  <Input value={tag.name} onChange={e => handleLeadsTagChange(index, 'name', e.target.value)} placeholder={`Response ${index + 1}`} className="flex-1 h-8" />
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => handleLeadsTagChange(index, 'isStageTag', !tag.isStageTag)} 
                      className={`p-1 rounded transition-colors flex items-center gap-1 text-xs ${tag.isStageTag ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' : 'text-muted-foreground hover:text-yellow-600'}`}
                      title="Mark as Funnel Tag (moves leads to Funnel tab)"
                    >
                      <Star className={`h-4 w-4 ${tag.isStageTag ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                      {tag.isStageTag && <span>Funnel Tag</span>}
                    </button>
                  </div>
                  {leadsTrackingTags.length > 1 && <Button variant="ghost" size="icon" onClick={() => handleRemoveLeadsTag(index)} className="h-7 w-7 text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>}
                </div>)}
            </div>
            
            {/* Leads Personal Tags */}
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-1">Leads Personal Tags (not counted)</p>
              <p className="text-[10px] text-muted-foreground/70 mb-2">Personal tags are just for your own use and are not counted in analytics.</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {leadsNonTrackingTags.map((tag, idx) => <Badge key={idx} variant="outline" className="gap-1 pr-1">
                    {tag}
                    <button onClick={() => handleRemoveLeadsNonTracking(idx)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>)}
              </div>
              <div className="flex gap-2">
                <Input value={newLeadsNonTrackingTag} onChange={e => setNewLeadsNonTrackingTag(e.target.value)} placeholder="Add personal tag..." className="flex-1 h-8" onKeyDown={e => e.key === 'Enter' && handleAddLeadsNonTracking()} />
                <Button variant="outline" size="sm" onClick={handleAddLeadsNonTracking} disabled={!newLeadsNonTrackingTag.trim()}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* 3. FUNNEL TRACKING TAGS (STAGES) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Funnel Tracking Tags (Stages)</p>
              </div>
              {stageTags.length < 10 && <Button variant="outline" size="sm" onClick={handleAddStageTag}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>}
            </div>
            <p className="text-xs text-muted-foreground">
              Define stages for your sales funnel (e.g., DAY1, DAY2, MB, Level Up). Leads move through these stages. Mark one as ★ Final stage.
            </p>
            
            <div className="space-y-2">
              {stageTags.map((tag, index) => <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                  <span className="text-xs text-muted-foreground w-16 shrink-0">Stage {index + 1}</span>
                  <Input value={tag.name} onChange={e => handleStageTagChange(index, 'name', e.target.value)} placeholder={`Stage ${index + 1}`} className="flex-1 h-8" />
                  <button onClick={() => handleStageTagChange(index, 'isFinalTarget', true)} className={`p-1 rounded transition-colors shrink-0 ${tag.isFinalTarget ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`} title="Set as Final Stage">
                    <Star className={`h-4 w-4 ${tag.isFinalTarget ? 'fill-yellow-500' : ''}`} />
                  </button>
                  {stageTags.length > 1 && <Button variant="ghost" size="icon" onClick={() => handleRemoveStageTag(index)} className="h-7 w-7 text-destructive shrink-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>}
                </div>)}
            </div>
            
            {/* Funnel Personal Tags */}
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-1">Funnel Personal Tags (not counted)</p>
              <p className="text-[10px] text-muted-foreground/70 mb-2">Personal tags are just for your own use and are not counted in analytics.</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {stageNonTrackingTags.map((tag, idx) => <Badge key={idx} variant="outline" className="gap-1 pr-1">
                    {tag}
                    <button onClick={() => handleRemoveStageNonTracking(idx)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>)}
              </div>
              <div className="flex gap-2">
                <Input value={newStageNonTrackingTag} onChange={e => setNewStageNonTrackingTag(e.target.value)} placeholder="Add personal tag..." className="flex-1 h-8" onKeyDown={e => e.key === 'Enter' && handleAddStageNonTracking()} />
                <Button variant="outline" size="sm" onClick={handleAddStageNonTracking} disabled={!newStageNonTrackingTag.trim()}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>}

      {/* Switch Confirmation Dialog */}
      <AlertDialog open={showSwitchConfirm} onOpenChange={setShowSwitchConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to Leader's Tracking Format?</AlertDialogTitle>
            <AlertDialogDescription>
              Your custom tracking tags will be replaced with your leader's format. This change will affect how your data is tracked and analyzed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitchToLeader}>
              Switch to Leader Format
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}