import { useState, useEffect, useRef, useCallback } from 'react';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, Tag, Copy, Check, Loader2, Eye, EyeOff, X, Plus, Trash2, Star, Layers, CalendarDays, Settings2, Lock, RefreshCw, ListTodo, Mail, Link2, Unlink } from 'lucide-react';
import { TodoTemplateManager } from './TodoTemplateManager';
import { toast } from 'sonner';
import { Profile, ProfileUpdate } from '@/hooks/useProfile';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { useLeaderLevels } from '@/hooks/useLeaderLevels';
import { useFilterConfig } from '@/hooks/useFilterConfig';
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
  onUpdateUplineByEmail: (email: string) => Promise<{
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

// Section wrapper for consistent card styling
function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card p-4 sm:p-5 space-y-4 shadow-sm", className)}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, badge }: { icon: any; title: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {badge}
    </div>
  );
}

export function LeaderTrackingFormatSettings({
  profile,
  updating,
  onUpdateProfile,
  onUpdateUplineByEmail,
  onClearLeaderHierarchy
}: LeaderTrackingFormatSettingsProps) {
  const {
    trackingFormat,
    refreshFormat,
    triggerTeamRefresh,
    isRootLeader,
    directLeaderName,
    directLeaderId,
    levels: inheritedLevels,
    loading: formatLoading,
  } = useTrackingFormatContext();
  
  const {
    levels: ownLevels,
    addLevel,
    updateLevel,
    deleteLevel
  } = useLeaderLevels();
  
  const { 
    config: funnelConfig, 
    leaderConfig: leaderFilterConfig, 
    leaderName: leaderFilterConfigName,
    saveConfig: saveFilterConfig, 
    fetchLeaderConfig, 
    refetchLeaderConnection,
    loading: funnelConfigLoading,
    isReadOnly: isFilterConfigReadOnly,
    hasLeaderConfig,
  } = useFilterConfig();
  
  const [copiedId, setCopiedId] = useState(false);
  const [leaderIdInput, setLeaderIdInput] = useState('');
  const [savingLeader, setSavingLeader] = useState(false);
  const [formatMode, setFormatMode] = useState<'leader' | 'own'>('leader');
  
  // Filter config state
  const [funnelDay1Date, setFilterDay1Date] = useState<Date | undefined>(undefined);
  const [funnelLength, setFilterLength] = useState<number>(3);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Team Levels state
  const [newLevelLabel, setNewLevelLabel] = useState('');

  // Leads Tracking Tags state (max 4)
  const [leadsTrackingTags, setLeadsTrackingTags] = useState<LeadsTagInput[]>([{
    name: '',
    isStageTag: false,
    isFinalTarget: false
  }]);
  const [leadsNonTrackingTags, setLeadsNonTrackingTags] = useState<string[]>([]);
  const [newLeadsNonTrackingTag, setNewLeadsNonTrackingTag] = useState('');

  // Stage Tags state
  const [stageTags, setStageTags] = useState<StageTagInput[]>([{
    name: '',
    isFinalTarget: true
  }]);
  const [stageNonTrackingTags, setStageNonTrackingTags] = useState<string[]>([]);
  const [newStageNonTrackingTag, setNewStageNonTrackingTag] = useState('');
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isSavingForTeam, setIsSavingForTeam] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  // Initialize state from profile - only once
  useEffect(() => {
    if (profile && !initializedRef.current) {
      initializedRef.current = true;
      
      const isUsingLeaderFormat = profile.use_leader_stages && !!profile.upline_email;
      setFormatMode(isUsingLeaderFormat ? 'leader' : 'own');

      const responseLabels = profile.response_labels as any;
      if (responseLabels) {
        if (typeof responseLabels === 'object' && responseLabels.tracking) {
          const tags = (responseLabels.tracking || []).map((t: any) => ({
            name: t.name || '',
            isStageTag: t.isStageTag ?? t.isFilter ?? false,
            isFinalTarget: t.isFinalTarget ?? false
          }));
          setLeadsTrackingTags(tags.length > 0 ? tags : [{ name: '', isStageTag: false, isFinalTarget: false }]);
          setLeadsNonTrackingTags(responseLabels.nonTracking || []);
        } else if (Array.isArray(responseLabels)) {
          const tags = responseLabels.slice(0, 4).map((name: string) => ({
            name, isStageTag: false, isFinalTarget: false
          }));
          setLeadsTrackingTags(tags.length > 0 ? tags : [{ name: '', isStageTag: false, isFinalTarget: false }]);
          setLeadsNonTrackingTags(responseLabels.slice(4));
        }
      }

      const stageLabels = profile.stage_labels as any;
      if (stageLabels) {
        if (typeof stageLabels === 'object' && stageLabels.stages) {
          const tags = (stageLabels.stages || []).map((s: any) => ({
            name: s.name || '', isFinalTarget: s.isFinalTarget ?? false
          }));
          setStageTags(tags.length > 0 ? tags : [{ name: '', isFinalTarget: false }]);
          setStageNonTrackingTags(stageLabels.nonTracking || []);
        } else if (Array.isArray(stageLabels)) {
          const tags = stageLabels.map((name: string, idx: number, arr: string[]) => ({
            name, isFinalTarget: idx === arr.length - 1
          }));
          setStageTags(tags.length > 0 ? tags : [{ name: '', isFinalTarget: false }]);
        }
      }
    }
  }, [profile]);

  useEffect(() => {
    const configLeaderId = profile?.root_leader_id || profile?.leaders_id_of_my_leader;
    if (configLeaderId && profile?.use_leader_stages) {
      fetchLeaderConfig(configLeaderId);
    }
  }, [profile?.root_leader_id, profile?.leaders_id_of_my_leader, profile?.use_leader_stages, fetchLeaderConfig]);

  useEffect(() => {
    if (funnelConfig) {
      setFilterDay1Date(new Date(funnelConfig.day_1_start));
      setFilterLength(funnelConfig.funnel_length);
    }
  }, [funnelConfig]);

  const handleFilterDateSelect = async (date: Date | undefined) => {
    if (!date) return;
    setFilterDay1Date(date);
    setDatePickerOpen(false);
    await saveFilterConfig({
      funnel_name: 'Default Filter',
      funnel_length: funnelLength,
      day_1_start: format(date, 'yyyy-MM-dd'),
    });
    toast.success('Filter start date saved');
  };

  const handleFilterLengthChange = async (value: string) => {
    const length = parseInt(value);
    setFilterLength(length);
    if (funnelDay1Date) {
      await saveFilterConfig({
        funnel_name: 'Default Filter',
        funnel_length: length,
        day_1_start: format(funnelDay1Date, 'yyyy-MM-dd'),
      });
      toast.success('Filter length saved');
    }
  };

  const autoSaveFormat = useCallback(async () => {
    if (formatMode !== 'own') return;
    setAutoSaveStatus('saving');

    const validLeadsTags = leadsTrackingTags.filter(t => t.name.trim());
    const responseLabelsData = {
      tracking: validLeadsTags.map(t => ({
        name: t.name.trim(), isStageTag: t.isStageTag, isFinalTarget: t.isFinalTarget
      })),
      nonTracking: leadsNonTrackingTags
    };

    const validStageTags = stageTags.filter(t => t.name.trim());
    const stageLabelsData = {
      stages: validStageTags.map(s => ({
        name: s.name.trim(), isFinalTarget: s.isFinalTarget
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

  const handleSaveAndRefreshTeam = useCallback(async () => {
    if (formatMode !== 'own') return;
    setIsSavingForTeam(true);
    try {
      const validLeadsTags = leadsTrackingTags.filter(t => t.name.trim());
      const responseLabelsData = {
        tracking: validLeadsTags.map(t => ({
          name: t.name.trim(), isStageTag: t.isStageTag, isFinalTarget: t.isFinalTarget
        })),
        nonTracking: leadsNonTrackingTags
      };
      const validStageTags = stageTags.filter(t => t.name.trim());
      const stageLabelsData = {
        stages: validStageTags.map(s => ({
          name: s.name.trim(), isFinalTarget: s.isFinalTarget
        })),
        nonTracking: stageNonTrackingTags
      };
      await onUpdateProfile({
        use_leader_stages: false,
        response_labels: responseLabelsData as any,
        stage_labels: stageLabelsData as any,
        stage_count: validStageTags.length
      });
      const success = await triggerTeamRefresh();
      refreshFormat();
      if (success) {
        toast.success('Tags saved! All team members will see updates within seconds.');
      } else {
        toast.success('Tags saved for you.');
      }
    } catch (error) {
      console.error('Error saving tags:', error);
      toast.error('Failed to save tags');
    } finally {
      setIsSavingForTeam(false);
    }
  }, [formatMode, leadsTrackingTags, leadsNonTrackingTags, stageTags, stageNonTrackingTags, onUpdateProfile, triggerTeamRefresh, refreshFormat]);

  const triggerAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { autoSaveFormat(); }, 800);
  }, [autoSaveFormat]);

  const handleConnectUpline = async () => {
    if (!leaderIdInput.trim()) return;
    setSavingLeader(true);
    const result = await onUpdateUplineByEmail(leaderIdInput.trim().toLowerCase());
    if (result.success) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('custom_options')
          .delete()
          .eq('user_id', user.id)
          .in('option_type', ['action_taken', 'funnel_stage']);
      }
      setLeaderIdInput('');
      setFormatMode('leader');
      await onUpdateProfile({ use_leader_stages: true });
      await refetchLeaderConnection();
      refreshFormat();
      toast.success('Connected to upline. You are now using their tracking format and funnel configuration.');
    } else {
      toast.error(result.error || 'Failed to connect to upline');
    }
    setSavingLeader(false);
  };

  const handleClearLeader = async () => {
    await onClearLeaderHierarchy();
    setFormatMode('own');
    await onUpdateProfile({ use_leader_stages: false });
    await refetchLeaderConnection();
    refreshFormat();
  };

  const handleToggleVisibility = async (value: boolean) => {
    await onUpdateProfile({ allow_leader_to_view: value });
  };

  const handleFormatModeChange = async (mode: 'leader' | 'own') => {
    if (mode === 'own' && formatMode === 'leader') {
      setFormatMode('own');
      await onUpdateProfile({ use_leader_stages: false });
      refreshFormat();
      toast.success('You can now create your own tracking format');
    } else if (mode === 'leader' && formatMode === 'own') {
      if (!profile?.upline_email) {
        toast.error('Please connect to an upline first');
        return;
      }
      setShowSwitchConfirm(true);
    }
  };

  const confirmSwitchToLeader = async () => {
    setShowSwitchConfirm(false);
    setFormatMode('leader');
    await onUpdateProfile({ use_leader_stages: true });
    refreshFormat();
    toast.success('Now using leader tracking format');
  };

  // === LEADS TAG HANDLERS ===
  const handleLeadsTagChange = (index: number, field: keyof LeadsTagInput, value: any) => {
    setLeadsTrackingTags(prev => {
      const updated = [...prev];
      if (field === 'isStageTag' && value === true) {
        updated.forEach((t, i) => { t.isStageTag = i === index; });
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
    triggerAutoSave();
  };

  const handleAddLeadsTag = () => {
    if (leadsTrackingTags.length < 4) {
      setLeadsTrackingTags([...leadsTrackingTags, { name: '', isStageTag: false, isFinalTarget: false }]);
    }
  };

  const handleRemoveLeadsTag = (index: number) => {
    if (leadsTrackingTags.length > 1) {
      setLeadsTrackingTags(leadsTrackingTags.filter((_, i) => i !== index));
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
        updated.forEach((t, i) => { t.isFinalTarget = i === index; });
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
    triggerAutoSave();
  };

  const handleAddStageTag = () => {
    if (stageTags.length < 10) {
      const updated = stageTags.map(t => ({ ...t, isFinalTarget: false }));
      setStageTags([...updated, { name: '', isFinalTarget: true }]);
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
    await updateLevel(levelId, { label: newLabel });
  };

  const hasLeader = !!profile?.upline_email;
  const displayLevels = formatMode === 'own' ? ownLevels : inheritedLevels;

  return (
    <div className="space-y-5">
      {/* ─── YOUR EMAIL (compact single line) ─── */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border/40">
        <div className="flex items-center gap-2 min-w-0">
          <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground shrink-0">Your Email:</span>
          <span className="text-xs font-medium text-foreground truncate">{profile?.email || '…'}</span>
        </div>
        <button onClick={async () => {
          if (profile?.email) {
            await navigator.clipboard.writeText(profile.email);
            setCopiedId(true);
            toast.success('Email copied');
            setTimeout(() => setCopiedId(false), 2000);
          }
        }} className="p-1 rounded hover:bg-muted/60 transition-colors shrink-0 ml-2" disabled={!profile?.email}>
          {copiedId ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
      </div>

      {/* ─── CONNECT TO UPLINE (compact) ─── */}
      <Section className="!p-3 !space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Connect to Upline</h3>
          </div>
          {autoSaveStatus === 'saving' ? (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </span>
          ) : autoSaveStatus === 'saved' ? (
            <span className="text-[11px] text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" /> Saved
            </span>
          ) : null}
        </div>

        {hasLeader ? (
          <div className="space-y-2.5">
            {/* Connected status - compact */}
            <div className="flex items-center justify-between p-2.5 bg-primary/6 rounded-lg border border-primary/15">
              <div className="flex items-center gap-2 min-w-0">
                <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground shrink-0">Connected to</span>
                <span className="text-xs font-semibold text-primary truncate">
                  {directLeaderName || (profile?.upline_email ? profile.upline_email.split('@')[0].charAt(0).toUpperCase() + profile.upline_email.split('@')[0].slice(1) : 'Upline')}
                </span>
              </div>
              <div className="flex items-center gap-0.5 shrink-0 ml-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={async () => {
                    const uplineEmail = profile?.upline_email;
                    if (!uplineEmail) return;
                    setSavingLeader(true);
                    const result = await onUpdateUplineByEmail(uplineEmail);
                    if (result.success) {
                      await refetchLeaderConnection();
                      refreshFormat();
                      toast.success('Upline data synced!');
                    } else {
                      toast.error(result.error || 'Failed to sync');
                    }
                    setSavingLeader(false);
                  }} 
                  disabled={updating || savingLeader || !profile?.upline_email}
                  className="h-7 px-2 gap-1 text-[11px]"
                >
                  {savingLeader ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Sync
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClearLeader} disabled={updating} className="h-7 px-2 gap-1 text-[11px] text-destructive hover:text-destructive">
                  <Unlink className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {/* Visibility toggle - compact */}
            <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex items-center gap-2">
                {profile?.allow_leader_to_view ? <Eye className="h-3.5 w-3.5 text-green-500" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="text-xs">Allow leader to see my data</span>
              </div>
              <Switch checked={profile?.allow_leader_to_view || false} onCheckedChange={handleToggleVisibility} disabled={updating} />
            </div>

            {/* Inherited format preview */}
            <div className="space-y-2 pt-1">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                Inherited from {trackingFormat?.rootLeaderName || directLeaderName || 'Upline'}
              </p>
              
              {inheritedLevels.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> Team Levels
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {inheritedLevels.map((level, idx) => (
                      <Badge key={level.id} variant="secondary" className="text-[10px] px-2 py-0">
                        L{idx + 1}: {level.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {trackingFormat?.leadsTrackingTags && trackingFormat.leadsTrackingTags.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Leads Tags
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {trackingFormat.leadsTrackingTags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-[10px] gap-1 px-2 py-0">
                        {tag.name}
                        {tag.isStageTag && <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {trackingFormat?.stageTags && trackingFormat.stageTags.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <Layers className="h-3 w-3" /> Filter Stages
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {trackingFormat.stageTags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-[10px] gap-1 px-2 py-0">
                        {tag.name}
                        {tag.isFinalTarget && <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {(!trackingFormat?.leadsTrackingTags?.length && !trackingFormat?.stageTags?.length && !inheritedLevels.length) && (
                <p className="text-[11px] text-muted-foreground italic">
                  {formatLoading ? 'Loading…' : 'No tracking tags configured by leader yet'}
                </p>
              )}
              
              <p className="text-[11px] text-muted-foreground bg-muted/30 rounded px-2 py-1.5 border border-border/20">
                <strong>Tip:</strong> Add personal tags from the Calling tab dropdown. They're private to you.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input 
              placeholder="Enter upline's Gmail address…" 
              value={leaderIdInput} 
              onChange={e => setLeaderIdInput(e.target.value.toLowerCase())} 
              type="email"
              className="h-9 text-sm"
            />
            <Button onClick={handleConnectUpline} disabled={!leaderIdInput.trim() || savingLeader} className="h-9 px-4 text-xs">
              {savingLeader ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Connect'}
            </Button>
          </div>
        )}
      </Section>

      {/* ─── FUNNEL CONFIGURATION ─── */}
      <Section>
        <SectionHeader
          icon={Settings2}
          title="Filter Configuration"
          badge={isFilterConfigReadOnly ? (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <RefreshCw className="h-3 w-3" /> Synced with Leader
            </Badge>
          ) : undefined}
        />
        
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isFilterConfigReadOnly 
            ? <>Managed by <span className="font-semibold text-primary">{leaderFilterConfigName || directLeaderName || 'Your Leader'}</span>. Updates automatically.</>
            : "Set your funnel start date and how many days each funnel lasts."
          }
        </p>

        {funnelConfigLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
          </div>
        ) : isFilterConfigReadOnly ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Filter Day 1 Start
                </Label>
                <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-border bg-muted/40">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {leaderFilterConfig?.day_1_start ? format(new Date(leaderFilterConfig.day_1_start), 'MMM d, yyyy') : 'Not set'}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Days per Filter
                </Label>
                <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-border bg-muted/40">
                  <span className="text-sm">
                    {leaderFilterConfig?.funnel_length ? `${leaderFilterConfig.funnel_length} ${leaderFilterConfig.funnel_length === 1 ? 'day' : 'days'}` : 'Not set'}
                  </span>
                </div>
              </div>
            </div>
            {leaderFilterConfig?.day_1_start && leaderFilterConfig?.funnel_length && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" /> End Date (Auto)
                </Label>
                <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-primary/20 bg-primary/5">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {format(addDays(new Date(leaderFilterConfig.day_1_start), leaderFilterConfig.funnel_length - 1), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Filter Day 1 Start</Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !funnelDay1Date && "text-muted-foreground")}>
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {funnelDay1Date ? format(funnelDay1Date, 'MMM d, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <Calendar mode="single" selected={funnelDay1Date} onSelect={handleFilterDateSelect} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Days per Filter</Label>
                <Select value={funnelLength.toString()} onValueChange={handleFilterLengthChange}>
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
            {funnelDay1Date && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">End Date (Auto)</Label>
                <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-primary/20 bg-primary/5">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {format(addDays(funnelDay1Date, funnelLength - 1), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {!funnelConfigLoading && (isFilterConfigReadOnly ? leaderFilterConfig?.day_1_start : funnelDay1Date) && (
          <div className="p-3 bg-muted/30 rounded-lg border border-border/30">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Current:</span>{' '}
              {isFilterConfigReadOnly 
                ? `${leaderFilterConfig?.funnel_length || 3}-day funnels from ${leaderFilterConfig?.day_1_start ? format(new Date(leaderFilterConfig.day_1_start), 'MMMM d, yyyy') : 'N/A'}`
                : `${funnelLength}-day funnels from ${funnelDay1Date ? format(funnelDay1Date, 'MMMM d, yyyy') : 'N/A'}`
              }
            </p>
          </div>
        )}
      </Section>

      {/* ─── CREATE OWN FORMAT ─── */}
      {!hasLeader && (
        <div className="flex items-center gap-3 px-2">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>
      )}

      {!hasLeader && (
        <button 
          onClick={() => handleFormatModeChange('own')} 
          className={cn(
            "w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
            formatMode === 'own' 
              ? 'border-primary bg-primary/5 shadow-sm' 
              : 'border-border/60 hover:border-primary/30 hover:bg-muted/30'
          )}
        >
          <p className="font-semibold text-sm text-foreground">Create My Own Tracking Format</p>
          <p className="text-xs text-muted-foreground mt-1">
            Define your own tracking tags, levels, and become a leader for your team.
          </p>
        </button>
      )}

      {/* ─── OWN FORMAT EDITOR ─── */}
      {formatMode === 'own' && (
        <div className="space-y-5">
          {/* Team Levels */}
          <Section>
            <SectionHeader icon={Users} title="Team Levels" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Define levels for your team. New members default to Level 1.
            </p>
            
            <div className="space-y-2">
              {ownLevels.map((level, index) => (
                <div key={level.id} className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg border border-border/30">
                  <span className="text-xs text-muted-foreground w-14 shrink-0 font-medium">L{index + 1}</span>
                  <Input 
                    value={level.label} 
                    onChange={e => handleUpdateLevelLabel(level.id, e.target.value)} 
                    onBlur={() => handleUpdateLevelLabel(level.id, level.label)} 
                    placeholder="Level name…" 
                    className="flex-1 h-8" 
                  />
                  {level.is_default && <Badge variant="outline" className="text-[10px] shrink-0">Default</Badge>}
                  <TodoTemplateManager 
                    levelPosition={level.position} 
                    levelLabel={level.label}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Manage Compulsory Actions">
                        <ListTodo className="h-3.5 w-3.5 text-primary" />
                      </Button>
                    }
                  />
                  {ownLevels.length > 1 && !level.is_default && (
                    <Button variant="ghost" size="icon" onClick={() => deleteLevel(level.id)} className="h-7 w-7 text-destructive shrink-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            {ownLevels.length < 10 && (
              <div className="flex gap-2">
                <Input 
                  value={newLevelLabel} 
                  onChange={e => setNewLevelLabel(e.target.value)} 
                  placeholder="Add new level…" 
                  className="flex-1 h-9" 
                  onKeyDown={e => e.key === 'Enter' && handleAddLevel()} 
                />
                <Button variant="outline" size="sm" onClick={handleAddLevel} disabled={!newLevelLabel.trim()} className="h-9 px-3">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </Section>

          {/* Leads Tracking Tags */}
          <Section>
            <div className="flex items-center justify-between">
              <SectionHeader icon={Tag} title="Leads Tracking Tags" />
              {leadsTrackingTags.length < 4 && (
                <Button variant="outline" size="sm" onClick={handleAddLeadsTag} className="h-8 gap-1 text-xs">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Leads and Responses are auto-tracked. Add custom response tags below.
            </p>

            {/* System metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2.5 bg-muted/20 rounded-lg border border-border/30">
                <span className="text-xs text-muted-foreground w-6 shrink-0">#1</span>
                <span className="text-sm font-medium flex-1">Leads</span>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">Auto</Badge>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-muted/20 rounded-lg border border-border/30">
                <span className="text-xs text-muted-foreground w-6 shrink-0">#2</span>
                <span className="text-sm font-medium flex-1">Responses</span>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">Auto</Badge>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Mark one as ★ Filter Tag to move leads to the Filter tab.
            </p>
            
            <div className="space-y-2">
              {leadsTrackingTags.map((tag, index) => (
                <div key={index} className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg border border-border/30">
                  <span className="text-xs text-muted-foreground w-6 font-medium">#{index + 3}</span>
                  <Input 
                    value={tag.name} 
                    onChange={e => handleLeadsTagChange(index, 'name', e.target.value)} 
                    placeholder={`Response ${index + 3}`} 
                    className="flex-1 h-8" 
                  />
                  <button 
                    onClick={() => handleLeadsTagChange(index, 'isStageTag', !tag.isStageTag)} 
                    className={cn(
                      "p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs",
                      tag.isStageTag ? "text-amber-600 bg-amber-100 dark:bg-amber-900/30" : "text-muted-foreground hover:text-amber-600"
                    )}
                    title="Mark as Filter Tag"
                  >
                    <Star className={cn("h-3.5 w-3.5", tag.isStageTag && "fill-amber-500 text-amber-500")} />
                    {tag.isStageTag && <span className="text-[10px]">Filter</span>}
                  </button>
                  {leadsTrackingTags.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveLeadsTag(index)} className="h-7 w-7 text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            {/* Personal tags */}
            <div className="pt-1 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Personal Tags <span className="text-muted-foreground/60">(not counted)</span></p>
              <div className="flex flex-wrap gap-1.5">
                {leadsNonTrackingTags.map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="gap-1 pr-1 text-xs">
                    {tag}
                    <button onClick={() => handleRemoveLeadsNonTracking(idx)} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newLeadsNonTrackingTag} onChange={e => setNewLeadsNonTrackingTag(e.target.value)} placeholder="Add personal tag…" className="flex-1 h-8" onKeyDown={e => e.key === 'Enter' && handleAddLeadsNonTracking()} />
                <Button variant="outline" size="sm" onClick={handleAddLeadsNonTracking} disabled={!newLeadsNonTrackingTag.trim()} className="h-8">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Section>

          {/* Filter Tracking Tags */}
          <Section>
            <div className="flex items-center justify-between">
              <SectionHeader icon={Layers} title="Filter Stages" />
              {stageTags.length < 10 && (
                <Button variant="outline" size="sm" onClick={handleAddStageTag} className="h-8 gap-1 text-xs">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Define stages for your filter (e.g., DAY1, DAY2, MB). Mark one as ★ Final stage.
            </p>
            
            
            <div className="space-y-2">
              {stageTags.map((tag, index) => (
                <div key={index} className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg border border-border/30">
                  <span className="text-xs text-muted-foreground w-14 shrink-0 font-medium">Stage {index + 1}</span>
                  <Input 
                    value={tag.name} 
                    onChange={e => handleStageTagChange(index, 'name', e.target.value)} 
                    placeholder={`Stage ${index + 1}`} 
                    className="flex-1 h-8" 
                  />
                  <button 
                    onClick={() => handleStageTagChange(index, 'isFinalTarget', true)} 
                    className={cn("p-1.5 rounded-lg transition-colors shrink-0", tag.isFinalTarget ? "text-amber-500" : "text-muted-foreground hover:text-amber-500")}
                    title="Set as Final Stage"
                  >
                    <Star className={cn("h-3.5 w-3.5", tag.isFinalTarget && "fill-amber-500")} />
                  </button>
                  {stageTags.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveStageTag(index)} className="h-7 w-7 text-destructive shrink-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            {/* Personal tags */}
            <div className="pt-1 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Personal Tags <span className="text-muted-foreground/60">(not counted)</span></p>
              <div className="flex flex-wrap gap-1.5">
                {stageNonTrackingTags.map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="gap-1 pr-1 text-xs">
                    {tag}
                    <button onClick={() => handleRemoveStageNonTracking(idx)} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newStageNonTrackingTag} onChange={e => setNewStageNonTrackingTag(e.target.value)} placeholder="Add personal tag…" className="flex-1 h-8" onKeyDown={e => e.key === 'Enter' && handleAddStageNonTracking()} />
                <Button variant="outline" size="sm" onClick={handleAddStageNonTracking} disabled={!newStageNonTrackingTag.trim()} className="h-8">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Section>

          {/* Save & Update */}
          <Section className="bg-gradient-to-br from-primary/5 to-transparent border-primary/15">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button 
                onClick={handleSaveAndRefreshTeam}
                disabled={isSavingForTeam}
                className="flex-1 gap-2 h-11"
                size="lg"
              >
                {isSavingForTeam ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving & Updating Team…</>
                ) : (
                  <><Users className="h-4 w-4" /> Save & Update for Team</>
                )}
              </Button>
              {autoSaveStatus === 'saved' && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <Check className="h-3 w-3" /> Auto-saved
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Save your tags and instantly update all team members using your format.
            </p>
          </Section>
        </div>
      )}

      {/* Switch Confirmation */}
      <AlertDialog open={showSwitchConfirm} onOpenChange={setShowSwitchConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to Leader's Format?</AlertDialogTitle>
            <AlertDialogDescription>
              Your custom tracking tags will be replaced with your leader's format. This affects how your data is tracked.
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
    </div>
  );
}
