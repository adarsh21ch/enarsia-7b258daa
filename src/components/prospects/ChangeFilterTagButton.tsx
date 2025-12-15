import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';
import { useCustomOptionsContext } from '@/contexts/CustomOptionsContext';
import { EXTENDED_ACTIONS } from '@/types/prospect';

interface ChangeFilterTagButtonProps {
  onTagChanged?: () => void;
}

export function ChangeFilterTagButton({ onTagChanged }: ChangeFilterTagButtonProps) {
  const { getOptionsForType, getActiveFilterTag, setActiveFilterTag } = useCustomOptionsContext();
  const [open, setOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const activeTag = getActiveFilterTag();
  const allResponseOptions = getOptionsForType('action_taken', EXTENDED_ACTIONS);

  const handleOpen = () => {
    setSelectedTag(activeTag || '');
    setOpen(true);
  };

  const handleSave = async () => {
    if (!selectedTag) return;
    setSaving(true);
    try {
      await setActiveFilterTag(selectedTag);
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
        className="h-8 gap-1.5 text-xs font-medium"
      >
        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
        <span className="hidden sm:inline">Funnel Tag:</span>
        <span className="font-semibold">{activeTag || 'Not Set'}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Choose Response Tag for Funnel
            </DialogTitle>
            <DialogDescription>
              Select ONE Response tag that moves leads into the Funnel tab. Only leads with this tag will appear in the Funnel view.
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
            <Button onClick={handleSave} disabled={saving || !selectedTag}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
