import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, Tag, Loader2, Eye, EyeOff, X, Plus, Trash2, Phone, Layers, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Profile, ProfileUpdate } from '@/hooks/useProfile';

interface LeaderStagesSettingsProps {
  profile: Profile | null;
  updating: boolean;
  onUpdateProfile: (updates: ProfileUpdate) => Promise<{ error: any }>;
  onUpdateUplineByEmail: (email: string) => Promise<{ success: boolean; error?: string; uplineName?: string }>;
  onClearLeaderHierarchy: () => Promise<{ success: boolean; error?: string }>;
  onGetLeaderStageConfig: (leaderId: string) => Promise<{ stage_count: number; stage_labels: string[]; response_labels: string[] } | null>;
}

export function LeaderStagesSettings({
  profile,
  updating,
  onUpdateProfile,
  onUpdateUplineByEmail,
  onClearLeaderHierarchy,
  onGetLeaderStageConfig
}: LeaderStagesSettingsProps) {
  const [uplineEmailInput, setUplineEmailInput] = useState('');
  const [savingUpline, setSavingUpline] = useState(false);
  const [tagMode, setTagMode] = useState<'leader' | 'own'>('leader');
  
  // Own tags state
  const [owDirecallingTags, setOwDirecallingTags] = useState<string[]>(['']);
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
      setOwDirecallingTags(profile.response_labels.length > 0 ? profile.response_labels : ['']);
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

  const handleSaveUpline = async () => {
    if (!uplineEmailInput.trim()) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(uplineEmailInput.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setSavingUpline(true);
    const result = await onUpdateUplineByEmail(uplineEmailInput.trim().toLowerCase());
    
    if (result.success) {
      setUplineEmailInput('');
      toast.success(`Connected to ${result.uplineName || uplineEmailInput}`);
      // Fetch the leader's tag config if they have leader_id
      if (profile?.leaders_id_of_my_leader) {
        const config = await onGetLeaderStageConfig(profile.leaders_id_of_my_leader);
        if (config) {
          setLeaderCallingTags(config.response_labels || []);
          setLeaderStageTags(config.stage_labels || []);
        }
      }
    } else {
      toast.error(result.error || 'Failed to connect');
    }
    setSavingUpline(false);
  };

  const handleClearUpline = async () => {
    await onClearLeaderHierarchy();
    setLeaderCallingTags([]);
    setLeaderStageTags([]);
    toast.success('Disconnected from upline');
  };

  const handleToggleVisibility = async (value: boolean) => {
    await onUpdateProfile({ allow_leader_to_view: value });
  };

  const handleTagModeChange = (mode: 'leader' | 'own') => {
    // If switching from own to leader and user has own tags, show confirmation
    const hasOwnTags = owDirecallingTags.some(s => s.trim()) || ownStageTags.some(s => s.trim());
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
    toast.success('Now using upline tracking tags. Your custom tags are saved for reference.');
  };

  // Calling tags handlers
  const handleAddCallingTag = () => {
    if (owDirecallingTags.length < 10) {
      setOwDirecallingTags([...owDirecallingTags, '']);
    }
  };

  const handleRemoveCallingTag = (index: number) => {
    if (owDirecallingTags.length > 1) {
      setOwDirecallingTags(owDirecallingTags.filter((_, i) => i !== index));
    }
  };

  const handleCallingTagChange = (index: number, value: string) => {
    const updated = [...owDirecallingTags];
    updated[index] = value;
    setOwDirecallingTags(updated);
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
    const validCallingTags = owDirecallingTags.filter(s => s.trim());
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
    toast.success('Now using upline tracking tags');
  };

  return (
    <div className="space-y-6">
      {/* Your Upline Section */}
      <div className="rounded-2xl p-4 bg-card border border-border/50 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-semibold">Your Upline</Label>
        </div>

        {profile?.upline_email ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Connected to</p>
                <p className="font-medium text-sm">
                  {profile.upline_email.split('@')[0].charAt(0).toUpperCase() + profile.upline_email.split('@')[0].slice(1)}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearUpline} disabled={updating}>
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
                <span className="text-sm">Allow upline to see my tracking data</span>
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
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter Upline's Gmail Address"
                  value={uplineEmailInput}
                  onChange={(e) => setUplineEmailInput(e.target.value.toLowerCase())}
                  className="pl-10"
                  type="email"
                />
              </div>
              <Button 
                onClick={handleSaveUpline}
                disabled={savingUpline || !uplineEmailInput.trim()}
                size="sm"
              >
                {savingUpline ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your upline's Gmail address to connect and optionally use their tracking tags.
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
          Tracking tags are used in your Calling List (Response column) and Sales Stages to follow each lead's progress. Custom tags are your own temporary labels and are not included in TrackUp totals.
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
                Use upline tracking tags + my custom tags
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Use your upline's tracking tags for Calling List and Sales Stages, and add your own custom tags that are visible only in your account.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
            <RadioGroupItem value="own" id="own-tags" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="own-tags" className="font-medium cursor-pointer">
                Create my own tracking tags (and custom tags)
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Create and use your own tracking tags for Calling List and Sales Stages. You can still add custom tags that your team does not inherit.
              </p>
            </div>
          </div>
        </RadioGroup>

        {/* Leader Tags Display */}
        {tagMode === 'leader' && (
          <div className="space-y-4 mt-4">
            {profile?.upline_email ? (
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
                      <p className="text-xs text-muted-foreground font-medium">Stage tracking tags (Sales Stages):</p>
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
                    {profile.use_leader_stages ? 'Currently Using Upline Tags' : 'Use These Tags'}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                  Your upline hasn't configured their tracking tags yet.
                </p>
              )
            ) : (
              <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                Connect to your upline above to use their tracking tags.
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
                {owDirecallingTags.map((tag, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-12">Tag {index + 1}</span>
                    <Input
                      value={tag}
                      onChange={(e) => handleCallingTagChange(index, e.target.value)}
                      placeholder={`e.g., ${index === 0 ? 'Called' : index === 1 ? 'No answer' : index === 2 ? 'Interested' : `Tag ${index + 1}`}`}
                      className="flex-1"
                    />
                    {owDirecallingTags.length > 1 && (
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
              {owDirecallingTags.length < 10 && (
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
                <p className="text-sm font-medium">Stage tracking tags (Sales Stages)</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Define your Sales Stages progression (3-10 stages recommended):
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
            <AlertDialogTitle>Switch to Upline Tracking Tags?</AlertDialogTitle>
            <AlertDialogDescription>
              Your custom tracking tags will be kept as personal reference, but the upline's tracking tags will become your official tracked tags. Future analytics will only count the upline's tracking tags.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitchToLeader}>
              Switch to Upline Tracking Tags
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
