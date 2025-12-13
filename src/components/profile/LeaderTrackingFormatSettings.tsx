import { useState, useEffect } from 'react';
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

interface LeaderTrackingFormatSettingsProps {
  profile: Profile | null;
  updating: boolean;
  onUpdateProfile: (updates: ProfileUpdate) => Promise<{ error: any }>;
  onUpdateLeaderHierarchy: (leaderId: string) => Promise<{ success: boolean; error?: string }>;
  onClearLeaderHierarchy: () => Promise<{ success: boolean; error?: string }>;
}

interface TrackingTagInput {
  name: string;
  isFilter: boolean;
  isFinalTarget: boolean;
}

export function LeaderTrackingFormatSettings({
  profile,
  updating,
  onUpdateProfile,
  onUpdateLeaderHierarchy,
  onClearLeaderHierarchy,
}: LeaderTrackingFormatSettingsProps) {
  const { trackingFormat, refreshFormat, isRootLeader, rootLeaderName, levels } = useTrackingFormatContext();
  
  const [copiedId, setCopiedId] = useState(false);
  const [leaderIdInput, setLeaderIdInput] = useState('');
  const [savingLeader, setSavingLeader] = useState(false);
  const [formatMode, setFormatMode] = useState<'leader' | 'own'>('leader');
  
  // Tracking tags state (max 3)
  const [trackingTags, setTrackingTags] = useState<TrackingTagInput[]>([
    { name: '', isFilter: true, isFinalTarget: false }
  ]);
  
  // Non-tracking tags state (unlimited)
  const [nonTrackingTags, setNonTrackingTags] = useState<string[]>([]);
  const [newNonTrackingTag, setNewNonTrackingTag] = useState('');
  
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [savingTags, setSavingTags] = useState(false);

  // Initialize state from profile
  useEffect(() => {
    if (profile) {
      const isUsingLeaderFormat = profile.use_leader_stages && !!profile.leaders_id_of_my_leader;
      setFormatMode(isUsingLeaderFormat ? 'leader' : 'own');
      
      // Parse tracking tags from response_labels
      const responseLabels = profile.response_labels || [];
      if (responseLabels.length > 0) {
        const tags = responseLabels.slice(0, 3).map((name, idx) => ({
          name,
          isFilter: true,
          isFinalTarget: idx === Math.min(responseLabels.length, 3) - 1
        }));
        setTrackingTags(tags.length > 0 ? tags : [{ name: '', isFilter: true, isFinalTarget: false }]);
        setNonTrackingTags(responseLabels.slice(3));
      }
    }
  }, [profile]);

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
      // Switching to own format
      setFormatMode('own');
      setSavingTags(true);
      await onUpdateProfile({ use_leader_stages: false });
      refreshFormat();
      setSavingTags(false);
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
    setSavingTags(true);
    await onUpdateProfile({ use_leader_stages: true });
    refreshFormat();
    setSavingTags(false);
    toast.success('Now using leader tracking format');
  };

  // Tracking tag handlers
  const handleTrackingTagChange = (index: number, field: keyof TrackingTagInput, value: any) => {
    setTrackingTags(prev => {
      const updated = [...prev];
      if (field === 'isFinalTarget' && value === true) {
        // Only one can be final target
        updated.forEach((t, i) => {
          t.isFinalTarget = i === index;
        });
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const handleAddTrackingTag = () => {
    if (trackingTags.length < 3) {
      setTrackingTags([...trackingTags, { name: '', isFilter: true, isFinalTarget: false }]);
    }
  };

  const handleRemoveTrackingTag = (index: number) => {
    if (trackingTags.length > 1) {
      const updated = trackingTags.filter((_, i) => i !== index);
      // Ensure at least one has final target
      if (!updated.some(t => t.isFinalTarget) && updated.length > 0) {
        updated[updated.length - 1].isFinalTarget = true;
      }
      setTrackingTags(updated);
    }
  };

  // Non-tracking tag handlers
  const handleAddNonTrackingTag = () => {
    if (newNonTrackingTag.trim()) {
      if (nonTrackingTags.includes(newNonTrackingTag.trim())) {
        toast.error('This tag already exists');
        return;
      }
      setNonTrackingTags([...nonTrackingTags, newNonTrackingTag.trim()]);
      setNewNonTrackingTag('');
    }
  };

  const handleRemoveNonTrackingTag = (index: number) => {
    setNonTrackingTags(nonTrackingTags.filter((_, i) => i !== index));
  };

  const handleSaveOwnFormat = async () => {
    const validTrackingTags = trackingTags.filter(t => t.name.trim());
    
    if (validTrackingTags.length === 0) {
      toast.error('Please add at least 1 tracking tag');
      return;
    }
    
    // Combine tracking + non-tracking tags into response_labels
    const allLabels = [
      ...validTrackingTags.map(t => t.name.trim()),
      ...nonTrackingTags
    ];
    
    setSavingTags(true);
    await onUpdateProfile({
      use_leader_stages: false,
      response_labels: allLabels,
      stage_count: validTrackingTags.length
    });
    refreshFormat();
    setSavingTags(false);
    toast.success('Tracking format saved');
  };

  const hasLeader = !!profile?.leaders_id_of_my_leader;

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
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          <Label className="text-sm font-semibold">Leader's Tracking Format</Label>
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
                Enter Leader ID to inherit their complete tracking system (tags, levels, and funnel logic). You cannot edit it, but your leader can.
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

                      {/* Show inherited format */}
                      {trackingFormat && (
                        <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                          <div className="flex items-center gap-2 mb-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-400">
                              Using {rootLeaderName}'s Tracking Format
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                              {trackingFormat.trackingTags.map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs gap-1">
                                  {tag.name}
                                  {tag.isFinalTarget && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                                </Badge>
                              ))}
                            </div>
                            {levels.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {levels.length} level{levels.length > 1 ? 's' : ''} available
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
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
                    </div>
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

        {/* Own Format Editor - Only shown when Option 2 is selected */}
        {formatMode === 'own' && (
          <div className="space-y-6 mt-4 pt-4 border-t border-border/50">
            {/* Tracking Tags (Max 3) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Tracking Tags (max 3)</p>
                </div>
                {trackingTags.length < 3 && (
                  <Button variant="outline" size="sm" onClick={handleAddTrackingTag}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Tracking tags are used in TrackUp analytics. Mark one as the final target (★).
              </p>
              
              <div className="space-y-2">
                {trackingTags.map((tag, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground w-8">#{index + 1}</span>
                    <Input
                      value={tag.name}
                      onChange={(e) => handleTrackingTagChange(index, 'name', e.target.value)}
                      placeholder={`Tag ${index + 1} (e.g., ${index === 0 ? 'Called' : index === 1 ? 'Interested' : 'Enrolled'})`}
                      className="flex-1 h-8"
                    />
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1" title="Use as filter">
                        <Checkbox
                          checked={tag.isFilter}
                          onCheckedChange={(checked) => handleTrackingTagChange(index, 'isFilter', checked)}
                          id={`filter-${index}`}
                        />
                        <Filter className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <button
                        onClick={() => handleTrackingTagChange(index, 'isFinalTarget', true)}
                        className={`p-1 rounded transition-colors ${tag.isFinalTarget ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`}
                        title="Set as Final Target"
                      >
                        <Star className={`h-4 w-4 ${tag.isFinalTarget ? 'fill-yellow-500' : ''}`} />
                      </button>
                    </div>
                    {trackingTags.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveTrackingTag(index)}
                        className="h-7 w-7 text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Non-Tracking Tags (Unlimited) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Non-Tracking Tags</p>
              </div>
              <p className="text-xs text-muted-foreground">
                These are for your convenience only and are NOT counted in TrackUp analytics.
              </p>
              
              <div className="flex gap-2">
                <Input
                  value={newNonTrackingTag}
                  onChange={(e) => setNewNonTrackingTag(e.target.value)}
                  placeholder="Add non-tracking tag..."
                  className="flex-1 h-8"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNonTrackingTag()}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAddNonTrackingTag}
                  disabled={!newNonTrackingTag.trim()}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              
              {nonTrackingTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {nonTrackingTags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="gap-1 pr-1">
                      {tag}
                      <button
                        onClick={() => handleRemoveNonTrackingTag(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            <Button 
              onClick={handleSaveOwnFormat} 
              disabled={savingTags}
              size="sm"
              className="w-full"
            >
              {savingTags ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Tracking Format
            </Button>
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
