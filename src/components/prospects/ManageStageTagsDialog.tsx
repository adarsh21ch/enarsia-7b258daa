import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Plus, Trash2, Star, Layers, X, Loader2, Check, Lock, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ManageStageTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StageTagInput {
  name: string;
  isFinalTarget: boolean;
}

type StageLabelsJson = {
  stages: Array<string | { name: string; isFinalTarget?: boolean }>;
  nonTracking: string[];
};

function normalizeStageTracking(existing: any): StageTagInput[] {
  if (!existing) return [];

  // New format
  if (typeof existing === 'object' && !Array.isArray(existing) && Array.isArray(existing.stages)) {
    return (existing.stages || [])
      .map((s: any) => {
        if (typeof s === 'string') return { name: s, isFinalTarget: false };
        return {
          name: s.name ?? String(s),
          isFinalTarget: s.isFinalTarget ?? false,
        };
      })
      .filter((s: any) => s?.name);
  }

  // Legacy string[]
  if (Array.isArray(existing)) {
    return existing
      .map((name: any, idx: number) => ({ name: String(name), isFinalTarget: idx === existing.length - 1 }))
      .filter((t: any) => t?.name);
  }

  return [];
}

export function ManageStageTagsDialog({ open, onOpenChange }: ManageStageTagsDialogProps) {
  const { user } = useAuth();
  const {
    refreshFormat,
    isRootLeader,
    isUsingLeaderFormat,
    directLeaderName,
    stageTags: leaderStageTags,
    ownStagePersonalTags,
  } = useTrackingFormatContext();

  // Only for root leaders - tracking tag editing
  const [stageTags, setStageTags] = useState<StageTagInput[]>([]);
  // For all users - personal tag editing
  const [personalTags, setPersonalTags] = useState<string[]>([]);
  const [newPersonalTag, setNewPersonalTag] = useState('');
  const [editingPersonalIndex, setEditingPersonalIndex] = useState<number | null>(null);
  const [editingPersonalValue, setEditingPersonalValue] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const didInitRef = useRef(false);

  const clearPendingSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, []);

  // Initialize ONCE per open (avoid wiping local state during refreshFormat())
  useEffect(() => {
    if (open && !didInitRef.current) {
      // Stage tags - only editable if root leader
      const tags = leaderStageTags.map((t) => ({
        name: t.name,
        isFinalTarget: t.isFinalTarget,
      }));
      setStageTags(tags.length > 0 ? tags : [{ name: '', isFinalTarget: false }]);

      // Personal tags - always user's own
      setPersonalTags(ownStagePersonalTags || []);
      setEditingPersonalIndex(null);
      setEditingPersonalValue('');
      setNewPersonalTag('');
      setAutoSaveStatus('idle');

      didInitRef.current = true;
    }

    if (!open) {
      didInitRef.current = false;
      clearPendingSave();
    }
  }, [open, leaderStageTags, ownStagePersonalTags, clearPendingSave]);

  const saveStageLabels = useCallback(
    async (data: StageLabelsJson) => {
      if (!user) return false;

      const updates: any = {
        stage_labels: data as any,
      };

      const { data: existing, error: existingError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingError) {
        toast.error('Failed to save tags');
        return false;
      }

      if (!existing) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ user_id: user.id, ...updates } as any);
        if (insertError) {
          toast.error('Failed to save tags');
          return false;
        }
        return true;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (updateError) {
        toast.error('Failed to save tags');
        return false;
      }

      return true;
    },
    [user]
  );

  // Auto-save function for personal tags
  const autoSavePersonalTags = useCallback(async () => {
    if (!user) return;

    setAutoSaveStatus('saving');

    // Preserve current stage tags stored on the user profile (if any)
    const { data: freshProfile } = await supabase
      .from('profiles')
      .select('stage_labels')
      .eq('user_id', user.id)
      .maybeSingle();

    const existingStages = normalizeStageTracking((freshProfile as any)?.stage_labels);

    const stageLabelsData: StageLabelsJson = {
      stages: existingStages.map((s) => ({ name: s.name, isFinalTarget: s.isFinalTarget })),
      nonTracking: personalTags,
    };

    const ok = await saveStageLabels(stageLabelsData);
    if (!ok) {
      setAutoSaveStatus('idle');
      return;
    }

    await refreshFormat();
    setAutoSaveStatus('saved');
    setTimeout(() => setAutoSaveStatus('idle'), 1500);
  }, [user, personalTags, saveStageLabels, refreshFormat]);

  // Auto-save function for root leader (tracking + personal)
  const autoSaveAll = useCallback(async () => {
    if (!isRootLeader) {
      await autoSavePersonalTags();
      return;
    }

    setAutoSaveStatus('saving');

    const validTags = stageTags.filter((t) => t.name.trim());

    const stageLabelsData: StageLabelsJson = {
      stages: validTags.map((t) => ({ name: t.name.trim(), isFinalTarget: t.isFinalTarget })),
      nonTracking: personalTags,
    };

    const ok = await saveStageLabels(stageLabelsData);
    if (!ok) {
      setAutoSaveStatus('idle');
      return;
    }

    await refreshFormat();
    setAutoSaveStatus('saved');
    setTimeout(() => setAutoSaveStatus('idle'), 1500);
  }, [stageTags, personalTags, isRootLeader, autoSavePersonalTags, saveStageLabels, refreshFormat]);

  // Debounced auto-save
  const triggerAutoSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      autoSaveAll();
    }, 800);
  }, [autoSaveAll]);

  // === Stage tag handlers (root leader only) ===
  const handleStageTagChange = (index: number, field: keyof StageTagInput, value: any) => {
    if (!isRootLeader) return;
    
    setStageTags(prev => {
      const updated = [...prev];
      if (field === 'isFinalTarget' && value === true) {
        // Only ONE tag can be the Final Target
        updated.forEach((t, i) => { t.isFinalTarget = i === index; });
      } else if (field === 'isFinalTarget' && value === false) {
        updated[index] = { ...updated[index], isFinalTarget: false };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
    triggerAutoSave();
  };

  const handleAddStageTag = () => {
    if (!isRootLeader) return;
    if (stageTags.length < 6) {
      setStageTags([...stageTags, { name: '', isFinalTarget: false }]);
    }
  };

  const handleRemoveStageTag = (index: number) => {
    if (!isRootLeader) return;
    if (stageTags.length > 1) {
      const updated = stageTags.filter((_, i) => i !== index);
      setStageTags(updated);
      triggerAutoSave();
    }
  };

  // === Personal tag handlers (all users) ===
  const handleAddPersonalTag = () => {
    const tag = newPersonalTag.trim().toUpperCase();
    if (!tag) return;
    
    // Check if tag already exists in tracking or personal
    const trackingNames = leaderStageTags.map(t => t.name.toUpperCase());
    if (personalTags.map(t => t.toUpperCase()).includes(tag) || trackingNames.includes(tag)) {
      toast.error('This tag already exists');
      return;
    }
    
    setPersonalTags([...personalTags, tag]);
    setNewPersonalTag('');
    triggerAutoSave();
  };

  const handleRemovePersonalTag = (index: number) => {
    setPersonalTags(personalTags.filter((_, i) => i !== index));
    setEditingPersonalIndex(null);
    triggerAutoSave();
  };

  const handleStartEditPersonalTag = (index: number) => {
    setEditingPersonalIndex(index);
    setEditingPersonalValue(personalTags[index]);
  };

  const handleSaveEditPersonalTag = () => {
    if (editingPersonalIndex === null) return;
    
    const newValue = editingPersonalValue.trim().toUpperCase();
    if (!newValue) {
      toast.error('Tag name cannot be empty');
      return;
    }
    
    // Check for duplicates (excluding current tag)
    const trackingNames = leaderStageTags.map(t => t.name.toUpperCase());
    const otherPersonal = personalTags.filter((_, i) => i !== editingPersonalIndex).map(t => t.toUpperCase());
    if (otherPersonal.includes(newValue) || trackingNames.includes(newValue)) {
      toast.error('This tag already exists');
      return;
    }
    
    const updated = [...personalTags];
    updated[editingPersonalIndex] = newValue;
    setPersonalTags(updated);
    setEditingPersonalIndex(null);
    setEditingPersonalValue('');
    triggerAutoSave();
  };

  const handleCancelEditPersonalTag = () => {
    setEditingPersonalIndex(null);
    setEditingPersonalValue('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Manage Stage Tags
            </DialogTitle>
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
        </DialogHeader>

        <div className="space-y-6">
          {/* SECTION A: Stage Tags */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">
                  {isUsingLeaderFormat && !isRootLeader 
                    ? `Stage Tags (from ${directLeaderName || 'Leader'})`
                    : 'Stage Tags (Your Config)'
                  }
                </p>
              </div>
              {isUsingLeaderFormat && !isRootLeader && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Lock className="h-3 w-3" /> Read-only
                </Badge>
              )}
              {isRootLeader && stageTags.length < 6 && (
                <Button variant="outline" size="sm" onClick={handleAddStageTag}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              )}
            </div>
            
            {isUsingLeaderFormat && !isRootLeader ? (
              // Read-only view for members
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {leaderStageTags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs gap-1">
                      {tag.name}
                      {tag.isFinalTarget && <Star className="h-3 w-3 text-green-500 fill-green-500" />}
                    </Badge>
                  ))}
                  {leaderStageTags.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">No stage tags from leader</span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  These tags are managed by your leader. Contact them to make changes.
                </p>
              </div>
            ) : (
              // Editable view for root leaders
              <div className="space-y-2">
                {stageTags.map((tag, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <Input
                      value={tag.name}
                      onChange={(e) => handleStageTagChange(index, 'name', e.target.value.toUpperCase())}
                      placeholder={`Stage ${index + 1}`}
                      className="flex-1 h-8 uppercase"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleStageTagChange(index, 'isFinalTarget', !tag.isFinalTarget)}
                        className={`p-1 rounded transition-colors flex items-center gap-1 text-xs ${tag.isFinalTarget ? 'text-green-600 bg-green-100 dark:bg-green-900/30' : 'text-muted-foreground hover:text-green-600'}`}
                        title="Mark as Final Target (goal stage)"
                      >
                        <Star className={`h-4 w-4 ${tag.isFinalTarget ? 'fill-green-500 text-green-500' : ''}`} />
                        {tag.isFinalTarget && <span>Final</span>}
                      </button>
                      {stageTags.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRemoveStageTag(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* SECTION B: Personal Tags (all users can edit) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Your Personal Tags (not counted)</p>
            </div>
            
            {/* Info banner */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Personal tags are for your own organization only and don't appear in team analytics.
              </p>
            </div>
            
            <div className="space-y-2">
              {personalTags.map((tag, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {editingPersonalIndex === idx ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editingPersonalValue}
                        onChange={(e) => setEditingPersonalValue(e.target.value.toUpperCase())}
                        className="h-8 text-sm flex-1 uppercase"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEditPersonalTag();
                          if (e.key === 'Escape') handleCancelEditPersonalTag();
                        }}
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveEditPersonalTag}>
                        <Check className="h-3 w-3 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancelEditPersonalTag}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 p-2 bg-muted/30 rounded-lg">
                      <span className="text-sm flex-1">{tag}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartEditPersonalTag(idx)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemovePersonalTag(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {personalTags.length === 0 && (
                <span className="text-xs text-muted-foreground italic">No personal tags yet</span>
              )}
            </div>
            
            <div className="flex gap-2">
              <Input
                value={newPersonalTag}
                onChange={(e) => setNewPersonalTag(e.target.value.toUpperCase())}
                placeholder="Add personal tag..."
                className="h-8 text-sm flex-1 uppercase"
                onKeyDown={(e) => e.key === 'Enter' && handleAddPersonalTag()}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAddPersonalTag}
                disabled={!newPersonalTag.trim()}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
