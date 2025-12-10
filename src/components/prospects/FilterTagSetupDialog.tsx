import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';
import { useCustomOptionsContext } from '@/contexts/CustomOptionsContext';
import { EXTENDED_ACTIONS } from '@/types/prospect';

const FILTER_SETUP_KEY = 'nevorai_filter_tags_setup_done';

interface FilterTagSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function FilterTagSetupDialog({ open, onOpenChange, onComplete }: FilterTagSetupDialogProps) {
  const { getOptionsForType, setActiveFilterTag } = useCustomOptionsContext();
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Get all Response (action_taken) options
  const allResponseOptions = getOptionsForType('action_taken', EXTENDED_ACTIONS);

  const handleSave = async () => {
    if (!selectedTag) return;
    setSaving(true);
    try {
      // Set the single active filter tag
      await setActiveFilterTag(selectedTag);
      
      // Mark setup as done
      localStorage.setItem(FILTER_SETUP_KEY, 'true');
      onComplete();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(FILTER_SETUP_KEY, 'true');
    onComplete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Set Up Filter Tag
          </DialogTitle>
          <DialogDescription>
            Select ONE Response tag to use as your Filter tag. Prospects with this tag will appear in your Filter list.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 max-h-[300px] overflow-y-auto">
          {allResponseOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No Response tags found. Add Response tags first in the Calling tab.
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

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button onClick={handleSave} disabled={saving || !selectedTag}>
            {saving ? 'Saving...' : 'Set Filter Tag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useFilterTagSetup() {
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(FILTER_SETUP_KEY);
    setNeedsSetup(!done);
  }, []);

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