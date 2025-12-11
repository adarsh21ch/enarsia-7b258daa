import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, Tag, Copy, Check, Loader2, Eye, EyeOff, X, Plus, Trash2, Phone, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { Profile, ProfileUpdate } from '@/hooks/useProfile';

interface LeaderStagesSettingsProps {
  profile: Profile | null;
  updating: boolean;
  onUpdateProfile: (updates: ProfileUpdate) => Promise<{ error: any }>;
  onUpdateLeaderHierarchy: (leaderId: string) => Promise<{ success: boolean; error?: string }>;
  onClearLeaderHierarchy: () => Promise<{ success: boolean; error?: string }>;
  onGetLeaderStageConfig: (leaderId: string) => Promise<{ stage_count: number; stage_labels: string[]; response_labels: string[] } | null>;
}

export function LeaderStagesSettings({
  profile,
  updating,
  onUpdateProfile,
  onUpdateLeaderHierarchy,
  onClearLeaderHierarchy,
  onGetLeaderStageConfig
}: LeaderStagesSettingsProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [leaderIdInput, setLeaderIdInput] = useState('');
  const [savingLeader, setSavingLeader] = useState(false);
  const [tagMode, setTagMode] = useState<'leader' | 'own'>('leader');
  
  // Own tags state
  const [ownCallingTags, setOwnCallingTags] = useState<string[]>(['']);
  const [ownStageTags, setOwnStageTags] = useState<string[]>(['']);
  
  // Leader tags display
  const [leaderCallingTags, setLeaderCallingTags] = useState<string[]>([]);
  const [leaderStageTags, setLeaderStageTags] = useState<string[]>([]);
  
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [savingTags, setSavingTags] = useState(false);

  // Initialize state from profile
  useEffect(() => {
    if (profile) {
      setTagMode(profile.use_leader_stages ? 'leader' : 'own');
      setOwnCallingTags(profile.response_labels.length > 0 ? profile.response_labels : ['']);
      setOwnStageTags(profile.stage_labels.length > 0 ? profile.stage_labels : ['']);
      
      // Fetch leader's tag config if using leader tags
      if (profile.use_leader_stages && profile.leaders_id_of_my_leader) {
        onGetLeaderStageConfig(profile.leaders_id_of_my_leader).then(config => {
          if (config) {
            setLeaderCallingTags(config.response_labels || []);
            setLeaderStageTags(config.stage_labels || []);
          }
        });
      }
    }
  }, [profile, onGetLeaderStageConfig]);

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
      // Fetch the leader's tag config
      const config = await onGetLeaderStageConfig(leaderIdInput.trim().toUpperCase());
      if (config) {
        setLeaderCallingTags(config.response_labels || []);
        setLeaderStageTags(config.stage_labels || []);
      }
    }
    setSavingLeader(false);
  };

  const handleClearLeader = async () => {
    await onClearLeaderHierarchy();
    setLeaderCallingTags([]);
    setLeaderStageTags([]);
  };

  const handleToggleVisibility = async (value: boolean) => {
    await onUpdateProfile({ allow_leader_to_view: value });
  };

  const handleTagModeChange = (mode: 'leader' | 'own') => {
    // If switching from own to leader and user has own tags, show confirmation
    const hasOwnTags = ownCallingTags.some(s => s.trim()) || ownStageTags.some(s => s.trim());
    if (mode === 'leader' && tagMode === 'own' && hasOwnTags) {
      setShowSwitchConfirm(true);
      return;
    }
    setTagMode(mode);
  };

  const confirmSwitchToLeader = async () => {
    setShowSwitchConfirm(false);
    setTagMode('leader');
    setSavingTags(true);
    await onUpdateProfile({ use_leader_stages: true });
    setSavingTags(false);
    toast.success('Now using leader tracking tags. Your custom tags are saved as personal reference.');
  };

  // Calling tags handlers
  const handleAddCallingTag = () => {
    if (ownCallingTags.length < 10) {
      setOwnCallingTags([...ownCallingTags, '']);
    }
  };

  const handleRemoveCallingTag = (index: number) => {
    if (ownCallingTags.length > 1) {
      setOwnCallingTags(ownCallingTags.filter((_, i) => i !== index));
    }
  };

  const handleCallingTagChange = (index: number, value: string) => {
    const updated = [...ownCallingTags];
    updated[index] = value;
    setOwnCallingTags(updated);
  };

  // Stage tags handlers
  const handleAddStageTag = () => {
    if (ownStageTags.length < 10) {
      setOwnStageTags([...ownStageTags, '']);
    }
  };

  const handleRemoveStageTag = (index: number) => {
    if (ownStageTags.length > 1) {
      setOwnStageTags(ownStageTags.filter((_, i) => i !== index));
    }
  };

  const handleStageTagChange = (index: number, value: string) => {
    const updated = [...ownStageTags];
    updated[index] = value;
    setOwnStageTags(updated);
  };

  const handleSaveOwnTags = async () => {
    const validCallingTags = ownCallingTags.filter(s => s.trim());
    const validStageTags = ownStageTags.filter(s => s.trim());
    
    if (validCallingTags.length < 3) {
      toast.error('Please add at least 3 calling tags');
      return;
    }
    if (validStageTags.length < 1) {
      toast.error('Please add at least 1 stage tag');
      return;
    }
    
    setSavingTags(true);
    await onUpdateProfile({
      use_leader_stages: false,
      stage_count: validStageTags.length,
      stage_labels: validStageTags,
      response_labels: validCallingTags
    });
    setSavingTags(false);
    toast.success('Tracking tags saved');
  };

  const handleSaveLeaderTagsMode = async () => {
    setSavingTags(true);
    await onUpdateProfile({ use_leader_stages: true });
    setSavingTags(false);
    toast.success('Now using leader tracking tags');
  };

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
          Share this ID with your team so they can connect with you.
        </p>
      </div>

      {/* Your Leader's ID Section */}
      <div className="rounded-2xl p-4 bg-card border border-border/50 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-semibold">Your Leader's ID</Label>
        </div>

        {profile?.leaders_id_of_my_leader ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Connected to Leader</p>
                <p className="font-mono font-semibold">{profile.leaders_id_of_my_leader}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearLeader} disabled={updating}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Visibility Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {profile.allow_leader_to_view ? (
                  <Eye className="h-4 w-4 text-green-500" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm">Allow leader to see my tracking data</span>
              </div>
              <Switch
                checked={profile.allow_leader_to_view}
                onCheckedChange={handleToggleVisibility}
                disabled={updating}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Enter Leader's ID (e.g., NVR-XXXXX)"
                value={leaderIdInput}
                onChange={(e) => setLeaderIdInput(e.target.value.toUpperCase())}
                className="flex-1 font-mono"
              />
              <Button 
                onClick={handleSaveLeaderId}
                disabled={savingLeader || !leaderIdInput.trim()}
                size="sm"
              >
                {savingLeader ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the Leader ID of your team leader to connect and optionally use their tracking tags.
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Tracking Tags Configuration */}
      <div className="rounded-2xl p-4 bg-card border border-border/50 space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-semibold">Tracking Tags</Label>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Tracking tags are used in your Calling List (Response column) and Stage Track to follow each lead's progress.
        </p>

        <RadioGroup 
          value={tagMode} 
          onValueChange={(v) => handleTagModeChange(v as 'leader' | 'own')}
          className="space-y-3"
        >
          <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
            <RadioGroupItem value="leader" id="leader-tags" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="leader-tags" className="font-medium cursor-pointer">
                Use leader tracking tags
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Inherit calling and stage tracking tags from your leader for team consistency.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
            <RadioGroupItem value="own" id="own-tags" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="own-tags" className="font-medium cursor-pointer">
                Create my own tracking tags
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Define your own custom calling and stage tracking tags.
              </p>
            </div>
          </div>
        </RadioGroup>

        {/* Leader Tags Display */}
        {tagMode === 'leader' && (
          <div className="space-y-4 mt-4">
            {profile?.leaders_id_of_my_leader ? (
              (leaderCallingTags.length > 0 || leaderStageTags.length > 0) ? (
                <div className="space-y-4">
                  {/* Leader Calling Tags */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground font-medium">Calling tracking tags (responses):</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {leaderCallingTags.length > 0 ? leaderCallingTags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          Tag {index + 1}: {tag}
                        </Badge>
                      )) : (
                        <p className="text-xs text-muted-foreground italic">No calling tags configured</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Leader Stage Tags */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground font-medium">Stage tracking tags (Stage Track):</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {leaderStageTags.length > 0 ? leaderStageTags.map((stage, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          Stage {index + 1}: {stage}
                        </Badge>
                      )) : (
                        <p className="text-xs text-muted-foreground italic">No stage tags configured</p>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSaveLeaderTagsMode} 
                    disabled={savingTags || profile.use_leader_stages}
                    size="sm"
                    className="mt-2"
                  >
                    {savingTags ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {profile.use_leader_stages ? 'Currently Using Leader Tags' : 'Use These Tags'}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                  Your leader hasn't configured their tracking tags yet.
                </p>
              )
            ) : (
              <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                Add your Leader's ID above, or ask your leader to configure Tracking Tags so you can use them here.
              </p>
            )}
          </div>
        )}

        {/* Own Tags Editor */}
        {tagMode === 'own' && (
          <div className="space-y-6 mt-4">
            {/* Calling Tags Configuration */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Calling tracking tags (responses)</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Define response options for lead calls (3-10 tags recommended):
              </p>
              <div className="space-y-2">
                {ownCallingTags.map((tag, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-12">Tag {index + 1}</span>
                    <Input
                      value={tag}
                      onChange={(e) => handleCallingTagChange(index, e.target.value)}
                      placeholder={`e.g., ${index === 0 ? 'Called' : index === 1 ? 'No answer' : index === 2 ? 'Interested' : `Tag ${index + 1}`}`}
                      className="flex-1"
                    />
                    {ownCallingTags.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCallingTag(index)}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {ownCallingTags.length < 10 && (
                <Button variant="outline" size="sm" onClick={handleAddCallingTag}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Tag
                </Button>
              )}
            </div>

            <Separator />

            {/* Stage Tags Configuration */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Stage tracking tags (Stage Track)</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Define your Stage Track progression (3-10 stages recommended):
              </p>
              <div className="space-y-2">
                {ownStageTags.map((stage, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-14">Stage {index + 1}</span>
                    <Input
                      value={stage}
                      onChange={(e) => handleStageTagChange(index, e.target.value)}
                      placeholder={`Stage ${index + 1} name`}
                      className="flex-1"
                    />
                    {ownStageTags.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveStageTag(index)}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {ownStageTags.length < 10 && (
                <Button variant="outline" size="sm" onClick={handleAddStageTag}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Stage
                </Button>
              )}
            </div>
            
            <Button 
              onClick={handleSaveOwnTags} 
              disabled={savingTags}
              size="sm"
              className="w-full"
            >
              {savingTags ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Tracking Tags
            </Button>
          </div>
        )}
      </div>

      {/* Switch Confirmation Dialog */}
      <AlertDialog open={showSwitchConfirm} onOpenChange={setShowSwitchConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to Leader Tracking Tags?</AlertDialogTitle>
            <AlertDialogDescription>
              Your custom tracking tags will be kept as personal reference, but the leader's tracking tags will become your official tracked tags. Future analytics will only count the leader's tracking tags.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitchToLeader}>
              Switch to Leader Tracking Tags
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
