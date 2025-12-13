import { useState, useEffect } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useLeaderLevelsForMember, LeaderLevel } from '@/hooks/useLeaderLevels';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProfileLevelDropdownProps {
  currentLevelId: string | null;
  leaderUserId: string | null;
  userId: string;
  onLevelChange?: (levelId: string) => void;
}

export function ProfileLevelDropdown({ 
  currentLevelId, 
  leaderUserId, 
  userId,
  onLevelChange 
}: ProfileLevelDropdownProps) {
  const { levels, loading } = useLeaderLevelsForMember(leaderUserId);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(currentLevelId);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setSelectedLevelId(currentLevelId);
  }, [currentLevelId]);

  const selectedLevel = levels.find(l => l.id === selectedLevelId);
  const displayLabel = selectedLevel?.label || 'Level 1';

  const handleSelectLevel = async (level: LeaderLevel) => {
    if (level.id === selectedLevelId) {
      setOpen(false);
      return;
    }

    setSaving(true);
    setSelectedLevelId(level.id);
    setOpen(false);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ level_id: level.id })
        .eq('user_id', userId);

      if (error) throw error;
      
      toast.success('Saved ✓', { duration: 2000 });
      onLevelChange?.(level.id);
    } catch (error) {
      console.error('Failed to update level:', error);
      toast.error('Failed to save');
      setSelectedLevelId(currentLevelId); // Revert
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-full">
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (levels.length === 0) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background rounded-full text-xs font-medium">
        Level 1 <Check className="h-3 w-3" />
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-7 px-3 gap-1.5 rounded-full text-xs font-medium transition-all",
            "bg-foreground text-background hover:bg-foreground/90 hover:text-background border-0"
          )}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              {displayLabel}
              <Check className="h-3 w-3" />
              <ChevronDown className="h-3 w-3 ml-0.5" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-48 p-1 bg-popover border-border" 
        align="end"
        sideOffset={4}
      >
        <div className="space-y-0.5">
          {levels.map(level => {
            const isSelected = level.id === selectedLevelId;
            return (
              <button
                key={level.id}
                onClick={() => handleSelectLevel(level)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                  isSelected 
                    ? "bg-foreground text-background" 
                    : "hover:bg-muted"
                )}
              >
                <span className="font-medium">{level.label}</span>
                {isSelected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}