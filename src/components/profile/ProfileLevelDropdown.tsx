import { useState, useEffect } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { LeaderLevel } from '@/hooks/useLeaderLevels';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProfileLevelDropdownProps {
  currentLevelId: string | null;
  leaderNeveraiId: string | null; // The Leader ID (NVR-XXXXX format)
  userId: string;
  onLevelChange?: (levelId: string) => void;
}

export function ProfileLevelDropdown({ 
  currentLevelId, 
  leaderNeveraiId, 
  userId,
  onLevelChange 
}: ProfileLevelDropdownProps) {
  const [levels, setLevels] = useState<LeaderLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(currentLevelId);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [noLevelsMessage, setNoLevelsMessage] = useState<string | null>(null);

  // Fetch levels for the leader based on their neverai_id
  useEffect(() => {
    const fetchLevels = async () => {
      if (!leaderNeveraiId) {
        // No leader set - fetch own levels (user is their own leader)
        const { data, error } = await supabase
          .from('leader_levels')
          .select('*')
          .eq('leader_id', userId)
          .order('position', { ascending: true });

        if (!error && data && data.length > 0) {
          setLevels(data as LeaderLevel[]);
          setNoLevelsMessage(null);
        } else {
          setLevels([]);
          setNoLevelsMessage(null); // Show default Level 1
        }
        setLoading(false);
        return;
      }

      // Find the leader's user_id from their neverai_id
      const { data: leaderProfile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('neverai_id', leaderNeveraiId)
        .maybeSingle();

      if (profileError || !leaderProfile) {
        setLevels([]);
        setNoLevelsMessage('Leader not found');
        setLoading(false);
        return;
      }

      // Fetch levels for this leader
      const { data: levelsData, error: levelsError } = await supabase
        .from('leader_levels')
        .select('*')
        .eq('leader_id', leaderProfile.user_id)
        .order('position', { ascending: true });

      if (levelsError) {
        console.error('Error fetching leader levels:', levelsError);
        setLevels([]);
        setNoLevelsMessage('Error loading levels');
      } else if (!levelsData || levelsData.length === 0) {
        setLevels([]);
        setNoLevelsMessage('Your leader has not defined any levels yet');
      } else {
        setLevels(levelsData as LeaderLevel[]);
        setNoLevelsMessage(null);
        
        // Auto-assign default level if user has no level set
        if (!currentLevelId) {
          const defaultLevel = levelsData.find(l => l.is_default) || levelsData[0];
          if (defaultLevel) {
            setSelectedLevelId(defaultLevel.id);
            // Auto-save the default level
            supabase
              .from('profiles')
              .update({ level_id: defaultLevel.id })
              .eq('user_id', userId)
              .then(({ error }) => {
                if (!error) {
                  onLevelChange?.(defaultLevel.id);
                }
              });
          }
        }
      }
      setLoading(false);
    };

    setLoading(true);
    fetchLevels();

    // Set up real-time subscription for level changes
    const channel = supabase
      .channel('leader-levels-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leader_levels'
        },
        () => {
          // Refetch levels on any change
          fetchLevels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leaderNeveraiId, userId, currentLevelId, onLevelChange]);

  useEffect(() => {
    setSelectedLevelId(currentLevelId);
  }, [currentLevelId]);

  const selectedLevel = levels.find(l => l.id === selectedLevelId);
  // Show code (AS, S, AM) if available, otherwise show label
  const displayCode = selectedLevel?.code || selectedLevel?.label || (levels.length > 0 ? (levels[0]?.code || levels[0]?.label) : 'Level 1');

  const handleSelectLevel = async (level: LeaderLevel) => {
    if (level.id === selectedLevelId) {
      setOpen(false);
      return;
    }

    // Optimistic update
    const previousLevelId = selectedLevelId;
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
      setSelectedLevelId(previousLevelId); // Revert
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
        {noLevelsMessage || 'L1'}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium transition-all cursor-pointer",
            "bg-foreground text-background hover:bg-foreground/90 border-0",
            saving && "opacity-70 cursor-wait"
          )}
          disabled={saving}
          onClick={() => !saving && setOpen(!open)}
        >
          {saving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              {displayCode}
              <ChevronDown className="h-3 w-3 ml-0.5" />
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-48 p-1 bg-popover border-border z-50" 
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
                {level.is_default && !isSelected && (
                  <span className="text-xs text-muted-foreground">★</span>
                )}
                {isSelected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}