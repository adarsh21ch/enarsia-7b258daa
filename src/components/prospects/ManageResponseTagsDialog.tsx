import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Plus, Trash2, Star, Tag, X, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { useProfile } from '@/hooks/useProfile';

interface ManageResponseTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LeadsTagInput {
  name: string;
  isStageTag: boolean;
  isFinalTarget: boolean;
}

export function ManageResponseTagsDialog({ open, onOpenChange }: ManageResponseTagsDialogProps) {
  const { trackingFormat, refreshFormat, isRootLeader, isUsingLeaderFormat, rootLeaderName, leadsTrackingTags, leadsNonTrackingTags } = useTrackingFormatContext();
  const { profile, updateProfile } = useProfile();
  
  const [trackingTags, setTrackingTags] = useState<LeadsTagInput[]>([]);
  const [nonTrackingTags, setNonTrackingTags] = useState<string[]>([]);
  const [newNonTrackingTag, setNewNonTrackingTag] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize from tracking format
  useEffect(() => {
    if (open) {
      const tags = leadsTrackingTags.map(t => ({
        name: t.name,
        isStageTag: t.isStageTag,
        isFinalTarget: t.isFinalTarget,
      }));
      setTrackingTags(tags.length > 0 ? tags : [{ name: '', isStageTag: false, isFinalTarget: false }]);
      setNonTrackingTags(leadsNonTrackingTags || []);
    }
  }, [leadsTrackingTags, leadsNonTrackingTags, open]);

  // Auto-save function
  const autoSave = useCallback(async () => {
    if (isUsingLeaderFormat && !isRootLeader) return;
    
    setAutoSaveStatus('saving');
    
    const validTags = trackingTags.filter(t => t.name.trim());
    
    const responseLabelsData = {
      tracking: validTags.map(t => ({
        name: t.name.trim(),
        isStageTag: t.isStageTag,
        isFinalTarget: t.isFinalTarget,
      })),
      nonTracking: nonTrackingTags,
    };
    
    await updateProfile({
      response_labels: responseLabelsData as any,
      stage_count: validTags.length,
    });
    
    refreshFormat();
    setAutoSaveStatus('saved');
    
    setTimeout(() => setAutoSaveStatus('idle'), 1500);
  }, [trackingTags, nonTrackingTags, isUsingLeaderFormat, isRootLeader, updateProfile, refreshFormat]);

  // Debounced auto-save
  const triggerAutoSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      autoSave();
    }, 800);
  }, [autoSave]);

  const handleTrackingTagChange = (index: number, field: keyof LeadsTagInput, value: any) => {
    setTrackingTags(prev => {
      const updated = [...prev];
      if (field === 'isStageTag' && value === true) {
        // Only ONE tag can be the Stage Tag
        updated.forEach((t, i) => { t.isStageTag = i === index; });
      } else if (field === 'isStageTag' && value === false) {
        updated[index] = { ...updated[index], isStageTag: false };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
    triggerAutoSave();
  };

  const handleAddTrackingTag = () => {
    if (trackingTags.length < 4) {
      setTrackingTags([...trackingTags, { name: '', isStageTag: false, isFinalTarget: false }]);
    }
  };

  const handleRemoveTrackingTag = (index: number) => {
    if (trackingTags.length > 1) {
      const updated = trackingTags.filter((_, i) => i !== index);
      setTrackingTags(updated);
      triggerAutoSave();
    }
  };

  const handleAddNonTrackingTag = () => {
    const tag = newNonTrackingTag.trim();
    if (!tag) return;
    if (nonTrackingTags.includes(tag) || trackingTags.some(t => t.name === tag)) {
      toast.error('This tag already exists');
      return;
    }
    setNonTrackingTags([...nonTrackingTags, tag]);
    setNewNonTrackingTag('');
    triggerAutoSave();
  };

  const handleRemoveNonTrackingTag = (index: number) => {
    setNonTrackingTags(nonTrackingTags.filter((_, i) => i !== index));
    triggerAutoSave();
  };

  // If using leader format, show read-only view
  if (isUsingLeaderFormat && !isRootLeader) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Leads Response Tags
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm font-medium text-primary mb-2">
              Using {rootLeaderName}'s Tracking Format
            </p>
            <p className="text-xs text-muted-foreground">
              These tags are managed by your leader. Contact them to make changes.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Leads Tracking Tags (for analytics)
              </p>
              <div className="flex flex-wrap gap-2">
                {leadsTrackingTags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs gap-1">
                    {tag.name}
                    {tag.isStageTag && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                  </Badge>
                ))}
              </div>
            </div>

            {leadsNonTrackingTags.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Leads Non-Tracking Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {leadsNonTrackingTags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Manage Leads Response Tags
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

        {/* Info banner */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Leads Tracking tags</strong> are used in analytics. 
            <strong> Non-tracking tags</strong> are for your convenience and are not counted.
          </p>
        </div>

        <div className="space-y-6">
          {/* Leads Tracking Tags Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                Leads Tracking Tags (max 4)
              </p>
              {trackingTags.length < 4 && (
                <Button variant="outline" size="sm" onClick={handleAddTrackingTag}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              {trackingTags.map((tag, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                  <Input
                    value={tag.name}
                    onChange={(e) => handleTrackingTagChange(index, 'name', e.target.value)}
                    placeholder={`Response ${index + 1}`}
                    className="flex-1 h-8"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleTrackingTagChange(index, 'isStageTag', !tag.isStageTag)}
                      className={`p-1 rounded transition-colors flex items-center gap-1 text-xs ${tag.isStageTag ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' : 'text-muted-foreground hover:text-yellow-600'}`}
                      title="Mark as Stage Tag (appears in Stage view)"
                    >
                      <Star className={`h-4 w-4 ${tag.isStageTag ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                      {tag.isStageTag && <span>Stage Tag</span>}
                    </button>
                    {trackingTags.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleRemoveTrackingTag(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Non-Tracking Tags Section */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Leads Non-Tracking Tags</p>
            <p className="text-xs text-muted-foreground">
              These are for your convenience only and will not be counted in analytics.
            </p>
            
            <div className="flex flex-wrap gap-2">
              {nonTrackingTags.map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs flex items-center gap-1 pr-1">
                  {tag}
                  <button
                    onClick={() => handleRemoveNonTrackingTag(idx)}
                    className="hover:bg-destructive/20 rounded-full p-0.5"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Input
                value={newNonTrackingTag}
                onChange={(e) => setNewNonTrackingTag(e.target.value)}
                placeholder="Add non-tracking tag..."
                className="h-8 text-sm flex-1"
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
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
