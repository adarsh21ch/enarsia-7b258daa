import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, Tag, Copy, Check, Loader2, Eye, EyeOff, X, Plus, Trash2, Star, Layers, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { Profile, ProfileUpdate } from '@/hooks/useProfile';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { Checkbox } from '@/components/ui/checkbox';
import { useLeaderLevels } from '@/hooks/useLeaderLevels';

interface LeaderTrackingFormatSettingsProps {
  profile: Profile | null;
  updating: boolean;
  onUpdateProfile: (updates: ProfileUpdate) => Promise<{ error: any }>;
  onUpdateLeaderHierarchy: (leaderId: string) => Promise<{ success: boolean; error?: string }>;
  onClearLeaderHierarchy: () => Promise<{ success: boolean; error?: string }>;
}

interface LeadsTagInput {
  name: string;
  isFilter: boolean;
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
  onClearLeaderHierarchy,
}: LeaderTrackingFormatSettingsProps) {
  const { trackingFormat, refreshFormat, isRootLeader, rootLeaderName, levels: inheritedLevels } = useTrackingFormatContext();
  const { levels: ownLevels, addLevel, updateLevel, deleteLevel } = useLeaderLevels();
  
  const [copiedId, setCopiedId] = useState(false);
  const [leaderIdInput, setLeaderIdInput] = useState('');
  const [savingLeader, setSavingLeader] = useState(false);
  const [formatMode, setFormatMode] = useState<'leader' | 'own'>('leader');
  
  // Team Levels state
  const [newLevelLabel, setNewLevelLabel] = useState('');
  
  // Leads Tracking Tags state (max 4)
  const [leadsTrackingTags, setLeadsTrackingTags] = useState<LeadsTagInput[]>([
    { name: '', isFilter: true, isFinalTarget: false }
  ]);
  const [leadsNonTrackingTags, setLeadsNonTrackingTags] = useState<string[]>([]);
  const [newLeadsNonTrackingTag, setNewLeadsNonTrackingTag] = useState('');
  
  // Stage Tags state
  const [stageTags, setStageTags] = useState<StageTagInput[]>([
    { name: '', isFinalTarget: false }
  ]);
  const [stageNonTrackingTags, setStageNonTrackingTags] = useState<string[]>([]);
  const [newStageNonTrackingTag, setNewStageNonTrackingTag] = useState('');
  
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  // Debounce timer ref
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize state from profile
  useEffect(() => {
    if (profile) {
      const isUsingLeaderFormat = profile.use_leader_stages && !!profile.leaders_id_of_my_leader;
      setFormatMode(isUsingLeaderFormat ? 'leader' : 'own');
      
      // Parse leads tracking tags from response_labels
      const responseLabels = profile.response_labels as any;
      if (responseLabels) {
        if (typeof responseLabels === 'object' && responseLabels.tracking) {
          const tags = (responseLabels.tracking || []).map((t: any) => ({
            name: t.name || '',
            isFilter: t.isFilter ?? true,
            isFinalTarget: t.isFinalTarget ?? false,
          }));
          setLeadsTrackingTags(tags.length > 0 ? tags : [{ name: '', isFilter: true, isFinalTarget: false }]);
          setLeadsNonTrackingTags(responseLabels.nonTracking || []);
        } else if (Array.isArray(responseLabels)) {
          // Legacy format
          const tags = responseLabels.slice(0, 4).map((name: string, idx: number, arr: string[]) => ({
            name,
            isFilter: true,
            isFinalTarget: idx === arr.length - 1,
          }));
          setLeadsTrackingTags(tags.length > 0 ? tags : [{ name: '', isFilter: true, isFinalTarget: false }]);
          setLeadsNonTrackingTags(responseLabels.slice(4));
        }
      }
      
      // Parse stage tags from stage_labels
      const stageLabels = profile.stage_labels as any;
      if (stageLabels) {
        if (typeof stageLabels === 'object' && stageLabels.stages) {
          const tags = (stageLabels.stages || []).map((s: any) => ({
            name: s.name || '',
            isFinalTarget: s.isFinalTarget ?? false,
          }));
          setStageTags(tags.length > 0 ? tags : [{ name: '', isFinalTarget: false }]);
          setStageNonTrackingTags(stageLabels.nonTracking || []);
        } else if (Array.isArray(stageLabels)) {
          // Legacy format
          const tags = stageLabels.map((name: string, idx: number, arr: string[]) => ({
            name,
            isFinalTarget: idx === arr.length - 1,
          }));
          setStageTags(tags.length > 0 ? tags : [{ name: '', isFinalTarget: false }]);
        }
      }
    }
  }, [profile]);

  // Auto-save function
  const autoSaveFormat = useCallback(async () => {
    if (formatMode !== 'own') return;
    
    setAutoSaveStatus('saving');
    
    // Build response_labels with new structure
    const validLeadsTags = leadsTrackingTags.filter(t => t.name.trim());
    const responseLabelsData = {
      tracking: validLeadsTags.map(t => ({
        name: t.name.trim(),
        isFilter: t.isFilter,
        isFinalTarget: t.isFinalTarget,
      })),
      nonTracking: leadsNonTrackingTags,
    };
    
    // Build stage_labels with new structure
    const validStageTags = stageTags.filter(t => t.name.trim());
    const stageLabelsData = {
      stages: validStageTags.map(s => ({
        name: s.name.trim(),
        isFinalTarget: s.isFinalTarget,
      })),
      nonTracking: stageNonTrackingTags,
    };
    
    await onUpdateProfile({
      use_leader_stages: false,
      response_labels: responseLabelsData as any,
      stage_labels: stageLabelsData as any,
      stage_count: validStageTags.length,
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
      autoSaveFormat();
    }, 800);
  }, [autoSaveFormat]);

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
      await onUpdateProfile({ use_leader_stages: true });
      refreshFormat();
      toast.success('Connected to leader. You are now using their tracking format.');
    }
    setSavingLeader(false);
  };

  const handleClearLeader = async () => {
    await onClearLeaderHierarchy();
    setFormatMode('own');
    await onUpdateProfile({ use_leader_stages: false });
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
    await onUpdateProfile({ use_leader_stages: true });
    refreshFormat();
    toast.success('Now using leader tracking format');
  };

  // === LEADS TAG HANDLERS ===
  const handleLeadsTagChange = (index: number, field: keyof LeadsTagInput, value: any) => {
    setLeadsTrackingTags(prev => {
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

  const handleAddLeadsTag = () => {
    if (leadsTrackingTags.length < 4) {
      setLeadsTrackingTags([...leadsTrackingTags, { name: '', isFilter: true, isFinalTarget: false }]);
    }
  };

  const handleRemoveLeadsTag = (index: number) => {
    if (leadsTrackingTags.length > 1) {
      const updated = leadsTrackingTags.filter((_, i) => i !== index);
      if (!updated.some(t => t.isFinalTarget) && updated.length > 0) {
        updated[updated.length - 1].isFinalTarget = true;
      }
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
      setStageTags([...stageTags, { name: '', isFinalTarget: false }]);
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

  const hasLeader = !!profile?.leaders_id_of_my_leader;
  const displayLevels = formatMode === 'own' ? ownLevels : inheritedLevels;

  return (
    <div className="space-y-6">
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
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleCopyLeaderId}
            className="h-9 w-9"
            disabled={!profile?.neverai_id}
          >
            {copiedId ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Share this ID with your team so they can use your tracking format.
        </p>
      </div>

      <Separator />

      {/* Leader's Tracking Format Section */}
      <div className="rounded-2xl p-4 bg-card border border-border/50 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Leader's Tracking Format</Label>
          </div>
          {autoSaveStatus === 'saving' && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving...
            </span>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground">
          Choose how your tracking tags, levels, and funnel logic are configured.
        </p>

        <RadioGroup 
          value={formatMode} 
          onValueChange={(v) => handleFormatModeChange(v as 'leader' | 'own')}
          className="space-y-3"
        >
          {/* Option 1: Use Leader's Format */}
          <div className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${formatMode === 'leader' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'}`}>
            <RadioGroupItem value="leader" id="leader-format" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="leader-format" className="font-medium cursor-pointer">
                Use Leader's Tracking Format
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Enter Leader ID to inherit their complete tracking system (tags, levels, and funnel logic).
              </p>
              
              {formatMode === 'leader' && (
                <div className="mt-3 space-y-3">
                  {hasLeader ? (
                    <>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground">Connected to Leader</p>
                          <p className="font-mono font-semibold">{profile?.leaders_id_of_my_leader}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleClearLeader} disabled={updating}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Visibility Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {profile?.allow_leader_to_view ? (
                            <Eye className="h-4 w-4 text-green-500" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm">Allow leader to see my data</span>
                        </div>
                        <Switch
                          checked={profile?.allow_leader_to_view || false}
                          onCheckedChange={handleToggleVisibility}
                          disabled={updating}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Leader ID Input */}
                      <div className="space-y-2">
                        <Label htmlFor="leader-id-input" className="text-sm">Leader ID</Label>
                        <div className="flex gap-2">
                          <Input
                            id="leader-id-input"
                            placeholder="Enter Leader ID…"
                            value={leaderIdInput}
                            onChange={(e) => setLeaderIdInput(e.target.value.toUpperCase())}
                            className="font-mono"
                          />
                          <Button 
                            onClick={handleSaveLeaderId} 
                            disabled={!leaderIdInput.trim() || savingLeader}
                            size="sm"
                          >
                            {savingLeader ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect'}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Enter your leader's ID to inherit their complete tracking system (tags, levels, and funnel logic).
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Option 2: Create Own Format */}
          <div className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${formatMode === 'own' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'}`}>
            <RadioGroupItem value="own" id="own-format" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="own-format" className="font-medium cursor-pointer">
                Create My Own Tracking Format
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Define your own tracking tags, levels, and become a root leader for your team.
              </p>
            </div>
          </div>
        </RadioGroup>

        {/* Own Format Editor */}
        {formatMode === 'own' && (
          <div className="space-y-6 mt-4 pt-4 border-t border-border/50">
            
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
                {ownLevels.map((level, index) => (
                  <div key={level.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">Level {index + 1}</span>
                    <Input
                      value={level.label}
                      onChange={(e) => handleUpdateLevelLabel(level.id, e.target.value)}
                      onBlur={() => handleUpdateLevelLabel(level.id, level.label)}
                      placeholder="Aligned name..."
                      className="flex-1 h-8"
                    />
                    {level.is_default && (
                      <Badge variant="outline" className="text-xs shrink-0">Default</Badge>
                    )}
                    {ownLevels.length > 1 && !level.is_default && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteLevel(level.id)}
                        className="h-7 w-7 text-destructive shrink-0"
                      >
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
                    onChange={(e) => setNewLevelLabel(e.target.value)}
                    placeholder="Add new level..."
                    className="flex-1 h-8"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddLevel()}
                  />
                  <Button variant="outline" size="sm" onClick={handleAddLevel} disabled={!newLevelLabel.trim()}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* 2. LEADS TRACKING TAGS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Leads Tracking Tags (Responses)</p>
                </div>
                {leadsTrackingTags.length < 4 && (
                  <Button variant="outline" size="sm" onClick={handleAddLeadsTag}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                These tags are used in the Leads tab and are counted in analytics. Mark one as ★ Final target.
              </p>
              
              <div className="space-y-2">
                {leadsTrackingTags.map((tag, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground w-6">#{index + 1}</span>
                    <Input
                      value={tag.name}
                      onChange={(e) => handleLeadsTagChange(index, 'name', e.target.value)}
                      placeholder={`Response ${index + 1}`}
                      className="flex-1 h-8"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1" title="Use as filter">
                        <Checkbox
                          checked={tag.isFilter}
                          onCheckedChange={(checked) => handleLeadsTagChange(index, 'isFilter', checked)}
                        />
                        <Filter className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <button
                        onClick={() => handleLeadsTagChange(index, 'isFinalTarget', true)}
                        className={`p-1 rounded transition-colors ${tag.isFinalTarget ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`}
                        title="Set as Final Target"
                      >
                        <Star className={`h-4 w-4 ${tag.isFinalTarget ? 'fill-yellow-500' : ''}`} />
                      </button>
                    </div>
                    {leadsTrackingTags.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLeadsTag(index)}
                        className="h-7 w-7 text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Leads Non-Tracking Tags */}
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">Leads Non-Tracking Tags (display only)</p>
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
                    onChange={(e) => setNewLeadsNonTrackingTag(e.target.value)}
                    placeholder="Add non-tracking tag..."
                    className="flex-1 h-8"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddLeadsNonTracking()}
                  />
                  <Button variant="outline" size="sm" onClick={handleAddLeadsNonTracking} disabled={!newLeadsNonTrackingTag.trim()}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* 3. STAGE TAGS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Stage Tags (Sales Stages)</p>
                </div>
                {stageTags.length < 10 && (
                  <Button variant="outline" size="sm" onClick={handleAddStageTag}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                These stages are used in the Stage tab and funnel analytics. Mark one as ★ Final stage.
              </p>
              
              <div className="space-y-2">
                {stageTags.map((tag, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">Stage {index + 1}</span>
                    <Input
                      value={tag.name}
                      onChange={(e) => handleStageTagChange(index, 'name', e.target.value)}
                      placeholder={`Stage ${index + 1}`}
                      className="flex-1 h-8"
                    />
                    <button
                      onClick={() => handleStageTagChange(index, 'isFinalTarget', true)}
                      className={`p-1 rounded transition-colors shrink-0 ${tag.isFinalTarget ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`}
                      title="Set as Final Stage"
                    >
                      <Star className={`h-4 w-4 ${tag.isFinalTarget ? 'fill-yellow-500' : ''}`} />
                    </button>
                    {stageTags.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveStageTag(index)}
                        className="h-7 w-7 text-destructive shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Stage Non-Tracking Tags */}
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">Stage Non-Tracking Tags (display only)</p>
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
                    onChange={(e) => setNewStageNonTrackingTag(e.target.value)}
                    placeholder="Add non-tracking tag..."
                    className="flex-1 h-8"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStageNonTracking()}
                  />
                  <Button variant="outline" size="sm" onClick={handleAddStageNonTracking} disabled={!newStageNonTrackingTag.trim()}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}
