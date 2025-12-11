import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, ListOrdered, Copy, Check, Loader2, Eye, EyeOff, X, Plus, Trash2 } from 'lucide-react';
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
  const [stageMode, setStageMode] = useState<'leader' | 'own'>('leader');
  const [ownStageLabels, setOwnStageLabels] = useState<string[]>(['']);
  const [leaderStageLabels, setLeaderStageLabels] = useState<string[]>([]);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [savingStages, setSavingStages] = useState(false);

  // Initialize state from profile
  useEffect(() => {
    if (profile) {
      setStageMode(profile.use_leader_stages ? 'leader' : 'own');
      setOwnStageLabels(profile.stage_labels.length > 0 ? profile.stage_labels : ['']);
      
      // Fetch leader's stage config if using leader stages
      if (profile.use_leader_stages && profile.leaders_id_of_my_leader) {
        onGetLeaderStageConfig(profile.leaders_id_of_my_leader).then(config => {
          if (config) {
            setLeaderStageLabels(config.stage_labels);
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
      // Fetch the leader's stage config
      const config = await onGetLeaderStageConfig(leaderIdInput.trim().toUpperCase());
      if (config) {
        setLeaderStageLabels(config.stage_labels);
      }
    }
    setSavingLeader(false);
  };

  const handleClearLeader = async () => {
    await onClearLeaderHierarchy();
    setLeaderStageLabels([]);
  };

  const handleToggleVisibility = async (value: boolean) => {
    await onUpdateProfile({ allow_leader_to_view: value });
  };

  const handleStageModeChange = (mode: 'leader' | 'own') => {
    // If switching from own to leader and user has own stages, show confirmation
    if (mode === 'leader' && stageMode === 'own' && ownStageLabels.some(s => s.trim())) {
      setShowSwitchConfirm(true);
      return;
    }
    setStageMode(mode);
  };

  const confirmSwitchToLeader = async () => {
    setShowSwitchConfirm(false);
    setStageMode('leader');
    setSavingStages(true);
    await onUpdateProfile({ use_leader_stages: true });
    setSavingStages(false);
    toast.success('Now using leader stages. Your custom stages are saved as personal reference.');
  };

  const handleAddStage = () => {
    if (ownStageLabels.length < 10) {
      setOwnStageLabels([...ownStageLabels, '']);
    }
  };

  const handleRemoveStage = (index: number) => {
    if (ownStageLabels.length > 1) {
      setOwnStageLabels(ownStageLabels.filter((_, i) => i !== index));
    }
  };

  const handleStageNameChange = (index: number, value: string) => {
    const updated = [...ownStageLabels];
    updated[index] = value;
    setOwnStageLabels(updated);
  };

  const handleSaveOwnStages = async () => {
    const validStages = ownStageLabels.filter(s => s.trim());
    if (validStages.length < 1) {
      toast.error('Please add at least one stage');
      return;
    }
    
    setSavingStages(true);
    await onUpdateProfile({
      use_leader_stages: false,
      stage_count: validStages.length,
      stage_labels: validStages
    });
    setSavingStages(false);
    toast.success('Stages saved');
  };

  const handleSaveLeaderStagesMode = async () => {
    setSavingStages(true);
    await onUpdateProfile({ use_leader_stages: true });
    setSavingStages(false);
    toast.success('Now using leader stages');
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
              Enter the Leader ID of your team leader to connect and optionally use their sales stages.
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Sales Stages Configuration */}
      <div className="rounded-2xl p-4 bg-card border border-border/50 space-y-4">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-semibold">Sales Stages</Label>
        </div>

        <RadioGroup 
          value={stageMode} 
          onValueChange={(v) => handleStageModeChange(v as 'leader' | 'own')}
          className="space-y-3"
        >
          <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
            <RadioGroupItem value="leader" id="leader-stages" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="leader-stages" className="font-medium cursor-pointer">
                Use leader stages
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Inherit stage configuration from your leader for team consistency.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
            <RadioGroupItem value="own" id="own-stages" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="own-stages" className="font-medium cursor-pointer">
                Create my own stages
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Define your own custom sales stages.
              </p>
            </div>
          </div>
        </RadioGroup>

        {/* Leader Stages Display */}
        {stageMode === 'leader' && (
          <div className="space-y-3 mt-4">
            {profile?.leaders_id_of_my_leader ? (
              leaderStageLabels.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Leader's stages:</p>
                  <div className="flex flex-wrap gap-2">
                    {leaderStageLabels.map((stage, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        Stage {index + 1}: {stage}
                      </Badge>
                    ))}
                  </div>
                  <Button 
                    onClick={handleSaveLeaderStagesMode} 
                    disabled={savingStages || profile.use_leader_stages}
                    size="sm"
                    className="mt-2"
                  >
                    {savingStages ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {profile.use_leader_stages ? 'Currently Using Leader Stages' : 'Use These Stages'}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                  Your leader hasn't configured their stages yet.
                </p>
              )
            ) : (
              <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                Add your Leader's ID above to use their stages.
              </p>
            )}
          </div>
        )}

        {/* Own Stages Editor */}
        {stageMode === 'own' && (
          <div className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground font-medium">
              Define your stages (3-10 stages recommended):
            </p>
            <div className="space-y-2">
              {ownStageLabels.map((stage, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16">Stage {index + 1}</span>
                  <Input
                    value={stage}
                    onChange={(e) => handleStageNameChange(index, e.target.value)}
                    placeholder={`Stage ${index + 1} name`}
                    className="flex-1"
                  />
                  {ownStageLabels.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveStage(index)}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              {ownStageLabels.length < 10 && (
                <Button variant="outline" size="sm" onClick={handleAddStage}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Stage
                </Button>
              )}
              <Button 
                onClick={handleSaveOwnStages} 
                disabled={savingStages}
                size="sm"
              >
                {savingStages ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Stages
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Switch Confirmation Dialog */}
      <AlertDialog open={showSwitchConfirm} onOpenChange={setShowSwitchConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to Leader Stages?</AlertDialogTitle>
            <AlertDialogDescription>
              Your custom stages will be kept as personal reference, but the leader's stages will become your official tracked stages. Future analytics will only count the leader's stages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitchToLeader}>
              Switch to Leader Stages
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
