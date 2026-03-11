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
  uplineEmail: string | null; // The upline's email address
  userId: string;
  onLevelChange?: (levelId: string) => void;
}

export function ProfileLevelDropdown({ 
  currentLevelId, 
  uplineEmail, 
  userId,
  onLevelChange 
}: ProfileLevelDropdownProps) {
  const [levels, setLevels] = useState<LeaderLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(currentLevelId);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [noLevelsMessage, setNoLevelsMessage] = useState<string | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch levels for the leader based on their email
  useEffect(() => {
    const fetchLevels = async () => {
      if (!uplineEmail) {
        // No upline set - fetch own levels (user is their own leader)
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
        setLoadingTimeout(false);
        return;
      }

      // Find the upline's user_id from their email using RPC (bypasses RLS)
      const { data: uplineData, error: rpcError } = await supabase
        .rpc('get_user_by_email', { target_email: uplineEmail });

      if (rpcError || !uplineData || uplineData.length === 0) {
        // Only show "Upline not found" after timeout
        if (loadingTimeout) {
          setLevels([]);
          setNoLevelsMessage('Upline not found');
        }
        setLoading(false);
        return;
      }

      const uplineUserId = uplineData[0].user_id;

      // Fetch levels for this upline
      const { data: levelsData, error: levelsError } = await supabase
        .from('leader_levels')
        .select('*')
        .eq('leader_id', uplineUserId)
        .order('position', { ascending: true });

      if (levelsError) {
        console.error('Error fetching upline levels:', levelsError);
        setLevels([]);
        if (loadingTimeout) {
          setNoLevelsMessage('Error loading levels');
        }
      } else if (!levelsData || levelsData.length === 0) {
        setLevels([]);
        // Only show message after timeout, otherwise keep loading
        if (loadingTimeout) {
          setNoLevelsMessage('Your upline has not defined any levels yet');
        }
      } else {
        setLevels(levelsData as LeaderLevel[]);
        setNoLevelsMessage(null);
        
        // Auto-assign default level if user has no level set
        if (!currentLevelId) {
          const defaultLevel = levelsData.find(l => l.is_default) || levelsData[0];
          if (defaultLevel) {
            setSelectedLevelId(defaultLevel.id);
            // Auto-save the default level (Level 1)
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
      }
      setLoading(false);
      setLoadingTimeout(false);
    };

    setLoading(true);
    setLoadingTimeout(false);
    
    // Set a 3-second timeout before showing error messages
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setLoadingTimeout(true);
    }, 3000);
    
    fetchLevels();
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

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
  }, [uplineEmail, userId, currentLevelId, onLevelChange]);

  useEffect(() => {
    setSelectedLevelId(currentLevelId);
  }, [currentLevelId]);

  const selectedLevel = levels.find(l => l.id === selectedLevelId);
  // Show label (S, AS, AM, M) first, fall back to code if label is missing
  const displayText = selectedLevel?.label || selectedLevel?.code || (levels.length > 0 ? (levels[0]?.label || levels[0]?.code) : 'Level 1');

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
    return (
      <Skeleton className="h-7 w-16 rounded-full" />
    );
  }

  // Only show error message if we have one after timeout
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
              {displayText}
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
