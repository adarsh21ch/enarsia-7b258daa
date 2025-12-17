import { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
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

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timedOutRef = useRef(false);

  // Fetch levels for the leader based on their neverai_id
  useEffect(() => {
    const fetchLevels = async () => {
      try {
        // Reset state for this fetch
        setNoLevelsMessage(null);

        // No leader set - fetch own levels (user is their own leader)
        if (!leaderNeveraiId) {
          const { data, error } = await supabase
            .from('leader_levels')
            .select('*')
            .eq('leader_id', userId)
            .order('position', { ascending: true });

          if (!error && data && data.length > 0) {
            setLevels(data as LeaderLevel[]);
          } else {
            setLevels([]); // Show default L1
          }

          setLoading(false);
          return;
        }

        // Find the leader's user_id from their neverai_id using RPC (bypasses RLS)
        const { data: leaderData, error: rpcError } = await supabase
          .rpc('get_user_by_neverai_id', { target_neverai_id: leaderNeveraiId });

        if (rpcError || !leaderData || leaderData.length === 0) {
          setLevels([]);
          if (timedOutRef.current) setNoLevelsMessage('Leader not found');
          setLoading(false);
          return;
        }

        const leaderUserId = leaderData[0].user_id;

        // Fetch levels for this leader
        const { data: levelsData, error: levelsError } = await supabase
          .from('leader_levels')
          .select('*')
          .eq('leader_id', leaderUserId)
          .order('position', { ascending: true });

        if (levelsError) {
          console.error('Error fetching leader levels:', levelsError);
          setLevels([]);
          if (timedOutRef.current) setNoLevelsMessage('Error loading levels');
          setLoading(false);
          return;
        }

        if (!levelsData || levelsData.length === 0) {
          setLevels([]);
          if (timedOutRef.current) setNoLevelsMessage("Your leader has not defined any levels yet");
          setLoading(false);
          return;
        }

        setLevels(levelsData as LeaderLevel[]);

        // Auto-assign default level if user has no level set
        if (!currentLevelId) {
          const defaultLevel = levelsData.find(l => l.is_default) || levelsData[0];
          if (defaultLevel) {
            setSelectedLevelId(defaultLevel.id);
            supabase
              .from('profiles')
              .update({ level_id: defaultLevel.id })
              .eq('user_id', userId)
              .then(({ error }) => {
                if (!error) {
                  onLevelChange?.(defaultLevel.id);
                  toast.success('Default level assigned');
                }
              });
          }
        }

        setLoading(false);
      } catch (e) {
        console.error('Error loading levels:', e);
        setLevels([]);
        if (timedOutRef.current) setNoLevelsMessage('Error loading levels');
        setLoading(false);
      }
    };

    setLoading(true);
    timedOutRef.current = false;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timedOutRef.current = true;
    }, 3000);

    fetchLevels();

    // Re-fetch levels live if leader updates Team Levels
    const channel = supabase
      .channel(`leader-levels-changes-${leaderNeveraiId || userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leader_levels',
        },
        () => {
          fetchLevels();
        }
      )
      .subscribe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [leaderNeveraiId, userId, currentLevelId, onLevelChange]);

  useEffect(() => {
    setSelectedLevelId(currentLevelId);
  }, [currentLevelId]);

  const selectedLevel = levels.find(l => l.id === selectedLevelId);
  // Show code (AS, S, AM) if available, otherwise show label
  const displayCode =
    selectedLevel?.code ||
    selectedLevel?.label ||
    (levels.length > 0 ? (levels[0]?.code || levels[0]?.label) : 'Level 1');

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

  // Show skeleton loader while loading
  if (loading) {
    return <Skeleton className="h-7 w-16 rounded-full" />;
  }

  // Only show error message if we have one
  if (levels.length === 0 && noLevelsMessage) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground rounded-full text-xs font-medium">
        {noLevelsMessage}
      </div>
    );
  }

  // Show default L1 if no levels and no error message
  if (levels.length === 0) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background rounded-full text-xs font-medium">
        L1
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium transition-all cursor-pointer',
            'bg-foreground text-background hover:bg-foreground/90 border-0',
            saving && 'opacity-70 cursor-wait'
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
      <PopoverContent className="w-48 p-1 bg-popover border-border z-50" align="end" sideOffset={4}>
        <div className="space-y-0.5">
          {levels.map(level => {
            const isSelected = level.id === selectedLevelId;
            const primaryLabel = level.code || level.label;

            return (
              <button
                key={level.id}
                onClick={() => handleSelectLevel(level)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
                  isSelected ? 'bg-foreground text-background' : 'hover:bg-muted'
                )}
              >
                <span className="font-medium">{primaryLabel}</span>
                {level.is_default && !isSelected && <span className="text-xs text-muted-foreground">★</span>}
                {isSelected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
