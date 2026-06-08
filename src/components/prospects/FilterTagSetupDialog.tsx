import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { useProfile } from '@/hooks/useProfile';

const FILTER_SETUP_KEY = 'nevorai_filter_tags_setup_done';

interface FilterTagSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function FilterTagSetupDialog({ open, onOpenChange, onComplete }: FilterTagSetupDialogProps) {
  const { leadsTrackingTags, refreshFormat, isRootLeader, isUsingLeaderFormat } = useTrackingFormatContext();
  const { profile, updateProfile } = useProfile();
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Get all Response tags from the current tracking format
  const allResponseOptions = leadsTrackingTags.map(t => t.name);

  const handleSave = async () => {
    if (!selectedTag) return;
    
    // Only leaders can set funnel tag
    if (isUsingLeaderFormat && !isRootLeader) {
      localStorage.setItem(FILTER_SETUP_KEY, 'true');
      onComplete();
      onOpenChange(false);
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
      
      // Mark setup as done
      localStorage.setItem(FILTER_SETUP_KEY, 'true');
      onComplete();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
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
                  <RadioGroupItem value={tag} id={tag} />
                  <Label htmlFor={tag} className="flex-1 text-sm font-medium cursor-pointer">
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
          <Button onClick={handleSave} disabled={saving || !selectedTag} className="w-full sm:w-auto">
            {saving ? 'Saving...' : 'Confirm Selection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useFilterTagSetup() {
  const [needsSetup, setNeedsSetup] = useState(false);
  const { leadsStageTag } = useTrackingFormatContext();

  useEffect(() => {
    // Only show setup if no funnel tag is set AND local storage hasn't marked it done
    const done = localStorage.getItem(FILTER_SETUP_KEY);
    setNeedsSetup(!done && !leadsStageTag);
  }, [leadsStageTag]);

  const markSetupDone = () => {
    localStorage.setItem(FILTER_SETUP_KEY, 'true');
    setNeedsSetup(false);
  };

  const resetSetup = () => {
    localStorage.removeItem(FILTER_SETUP_KEY);
    setNeedsSetup(true);
  };

  return { needsSetup, markSetupDone, resetSetup };
}