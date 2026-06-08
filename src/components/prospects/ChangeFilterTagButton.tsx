import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { useProfile } from '@/hooks/useProfile';
import { useIsMobile } from '@/hooks/use-mobile';

interface ChangeFilterTagButtonProps {
  onTagChanged?: () => void;
}

export function ChangeFilterTagButton({ onTagChanged }: ChangeFilterTagButtonProps) {
  const isMobile = useIsMobile();
  const { 
    leadsTrackingTags, 
    leadsStageTag, 
    refreshFormat,
    isRootLeader,
    isUsingLeaderFormat,
  } = useTrackingFormatContext();
  const { profile, updateProfile } = useProfile();
  const [open, setOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Get the current funnel tag from tracking format (the Response tag with isStageTag = true)
  const activeTag = leadsStageTag;
  
  // Only show tracking tags from the current Response tags
  const allResponseOptions = leadsTrackingTags.map(t => t.name);

  const handleOpen = () => {
    setSelectedTag(activeTag || '');
    setOpen(true);
  };

  const handleSave = async () => {
    if (!selectedTag) return;
    
    // Only leaders can change the funnel tag
    if (isUsingLeaderFormat && !isRootLeader) {
      setOpen(false);
      return;
    }
    
    setSaving(true);
    try {
      // Update the profile's response_labels to set isStageTag on the selected tag
      const currentLabels = profile?.response_labels as any;
      if (currentLabels && currentLabels.tracking) {
        const updatedTracking = currentLabels.tracking.map((t: any) => ({
          ...t,
          isStageTag: t.name === selectedTag,
        }));
        await updateProfile({
          response_labels: {
            ...currentLabels,
            tracking: updatedTracking,
          } as any,
        });
        refreshFormat();
      }
      onTagChanged?.();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="h-9 gap-1.5 text-xs font-medium shrink-0"
        title={`Filter Tag: ${activeTag || 'Not Set'}`}
      >
        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
        {!isMobile && (
          <>
            <span className="hidden sm:inline">Filter Tag:</span>
            <span className="font-semibold truncate max-w-[80px]">{activeTag || 'Not Set'}</span>
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Choose Filter Tag
            </DialogTitle>
            <DialogDescription>
              Select ONE Response tag to use as your Filter Tag. Only leads with this Response tag will appear in the Funnel view.

            </DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-[300px] overflow-y-auto">
            {allResponseOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No Response tags found. Add Response tags in Profile → Leader's Tracking Format.
              </p>
            ) : (
              <RadioGroup value={selectedTag} onValueChange={setSelectedTag} className="space-y-2">
                {allResponseOptions.map(tag => (
                  <label
                    key={tag}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <RadioGroupItem value={tag} id={`change-${tag}`} />
                    <Label htmlFor={`change-${tag}`} className="flex-1 text-sm font-medium cursor-pointer">
                      {tag}
                    </Label>
                    {selectedTag === tag && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </label>
                ))}
              </RadioGroup>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !selectedTag || (isUsingLeaderFormat && !isRootLeader)}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
