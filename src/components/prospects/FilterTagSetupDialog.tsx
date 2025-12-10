import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  const { getOptionsForType, getCustomOptionsForType, updateFilterTagStatus } = useCustomOptionsContext();
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Get all Response (action_taken) options
  const allResponseOptions = getOptionsForType('action_taken', EXTENDED_ACTIONS);
  const customOptions = getCustomOptionsForType('action_taken');

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update filter tag status for each custom option
      for (const opt of customOptions) {
        const isFilterTag = selectedTags.has(opt.option_value);
        await updateFilterTagStatus(opt.id, isFilterTag);
      }
      
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
            Set Up Filter Tags
          </DialogTitle>
          <DialogDescription>
            Choose which Response tags should be treated as Filter tags. Prospects with these tags will appear in your Filter list.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3 max-h-[300px] overflow-y-auto">
          {allResponseOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No Response tags found. Add Response tags first in the Calling tab.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                Select the tags that indicate a prospect should appear in your Filter list:
              </p>
              {allResponseOptions.map(tag => (
                <label
                  key={tag}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedTags.has(tag)}
                    onCheckedChange={() => handleToggleTag(tag)}
                  />
                  <span className="flex-1 text-sm font-medium">{tag}</span>
                  {selectedTags.has(tag) && (
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  )}
                </label>
              ))}
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Filter Tags'}
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