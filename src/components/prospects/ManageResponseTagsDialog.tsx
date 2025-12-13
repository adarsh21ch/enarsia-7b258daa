import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Plus, Trash2, Star, Filter, Tag, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { useProfile } from '@/hooks/useProfile';

interface ManageResponseTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TrackingTagInput {
  name: string;
  isFilter: boolean;
  isFinalTarget: boolean;
}

export function ManageResponseTagsDialog({ open, onOpenChange }: ManageResponseTagsDialogProps) {
  const { trackingFormat, refreshFormat, isRootLeader, isUsingLeaderFormat, rootLeaderName } = useTrackingFormatContext();
  const { profile, updateProfile } = useProfile();
  
  const [trackingTags, setTrackingTags] = useState<TrackingTagInput[]>([]);
  const [nonTrackingTags, setNonTrackingTags] = useState<string[]>([]);
  const [newNonTrackingTag, setNewNonTrackingTag] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize from tracking format
  useEffect(() => {
    if (trackingFormat && open) {
      const tags = trackingFormat.trackingTags.map(t => ({
        name: t.name,
        isFilter: t.isFilter,
        isFinalTarget: t.isFinalTarget,
      }));
      setTrackingTags(tags.length > 0 ? tags : [{ name: '', isFilter: true, isFinalTarget: false }]);
      setNonTrackingTags(trackingFormat.nonTrackingTags || []);
    }
  }, [trackingFormat, open]);

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
      if (!updated.some(t => t.isFinalTarget) && updated.length > 0) {
        updated[updated.length - 1].isFinalTarget = true;
      }
      setTrackingTags(updated);
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
  };

  const handleRemoveNonTrackingTag = (index: number) => {
    setNonTrackingTags(nonTrackingTags.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const validTrackingTags = trackingTags.filter(t => t.name.trim());
    
    if (validTrackingTags.length === 0) {
      toast.error('Please add at least 1 tracking tag');
      return;
    }

    setSaving(true);
    try {
      // Combine tracking + non-tracking tags into response_labels
      const allLabels = [
        ...validTrackingTags.map(t => t.name.trim()),
        ...nonTrackingTags
      ];
      
      await updateProfile({
        response_labels: allLabels,
        stage_count: validTrackingTags.length
      });
      
      refreshFormat();
      toast.success('Response tags saved');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save tags');
    } finally {
      setSaving(false);
    }
  };

  // If using leader format, show read-only view
  if (isUsingLeaderFormat && !isRootLeader) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Response Tags
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
                Tracking Tags (for analytics)
              </p>
              <div className="flex flex-wrap gap-2">
                {trackingFormat?.trackingTags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs gap-1">
                    {tag.name}
                    {tag.isFinalTarget && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                    {tag.isFilter && <Filter className="h-3 w-3 text-blue-500" />}
                  </Badge>
                ))}
              </div>
            </div>

            {(trackingFormat?.nonTrackingTags?.length || 0) > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Non-Tracking Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {trackingFormat?.nonTrackingTags.map((tag, idx) => (
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
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Manage Response Tags
          </DialogTitle>
        </DialogHeader>

        {/* Info banner */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Tracking tags</strong> are used in TrackUp analytics. 
            <strong> Non-tracking tags</strong> are for your convenience and are not counted.
          </p>
        </div>

        <div className="space-y-6">
          {/* Tracking Tags Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                Tracking Tags (max 3)
              </p>
              {trackingTags.length < 3 && (
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
                    placeholder={`Tag ${index + 1}`}
                    className="flex-1 h-8"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1" title="Use as filter">
                      <Checkbox
                        checked={tag.isFilter}
                        onCheckedChange={(checked) => handleTrackingTagChange(index, 'isFilter', checked)}
                      />
                      <Filter className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <button
                      onClick={() => handleTrackingTagChange(index, 'isFinalTarget', true)}
                      className={`p-1 rounded transition-colors ${tag.isFinalTarget ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`}
                      title="Set as Final Target (★)"
                    >
                      <Star className={`h-4 w-4 ${tag.isFinalTarget ? 'fill-yellow-500' : ''}`} />
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
            <p className="text-sm font-medium">Non-Tracking Tags</p>
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

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
