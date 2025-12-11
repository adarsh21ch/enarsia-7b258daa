import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useTeamAccess, TabPermission } from '@/hooks/useTeamAccess';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, UserPlus, ChevronDown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SharedOwner {
  user_id: string;
  display_name: string | null;
  nevorid: string | null;
}

interface TeamMemberSelectorProps {
  sharedOwners: SharedOwner[];
  selectedOwnerIds: string[];
  onToggleOwner: (ownerId: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  currentTab: TabPermission;
  loading?: boolean;
}

const SESSION_KEY = 'team_selected_members';

export function TeamMemberSelector({
  sharedOwners,
  selectedOwnerIds,
  onToggleOwner,
  onSelectAll,
  onClear,
  currentTab,
  loading = false
}: TeamMemberSelectorProps) {
  const navigate = useNavigate();
  const { sharedWithMe } = useTeamAccess();
  const [open, setOpen] = useState(false);
  const [emptyPopoverOpen, setEmptyPopoverOpen] = useState(false);

  // Filter owners to only show those who have granted access to currentTab
  const availableOwners = useMemo(() => {
    return sharedOwners.filter(owner => {
      const access = sharedWithMe.find(a => a.owner_user_id === owner.user_id);
      if (!access) return false;
      // null means all tabs allowed
      if (!access.allowed_tabs) return true;
      return access.allowed_tabs.includes(currentTab);
    });
  }, [sharedOwners, sharedWithMe, currentTab]);

  const isViewingTeam = selectedOwnerIds.length > 0;
  const hasTeam = availableOwners.length > 0;

  // Persist selection to sessionStorage
  useEffect(() => {
    if (selectedOwnerIds.length > 0) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(selectedOwnerIds));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [selectedOwnerIds]);

  // Restore selection from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved && hasTeam && selectedOwnerIds.length === 0) {
      try {
        const parsed = JSON.parse(saved) as string[];
        // Only restore if the saved IDs are still valid
        const validIds = parsed.filter(id => 
          availableOwners.some(o => o.user_id === id)
        );
        if (validIds.length > 0) {
          validIds.forEach(id => onToggleOwner(id));
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, [hasTeam, availableOwners]);

  const handleToggle = (viewTeam: boolean) => {
    if (viewTeam) {
      if (hasTeam) {
        onSelectAll();
      }
    } else {
      onClear();
    }
    setOpen(false);
  };

  const handleGoToTeamAccess = () => {
    setEmptyPopoverOpen(false);
    navigate('/profile');
  };

  // Get display text for selected members
  const getSelectionText = () => {
    if (selectedOwnerIds.length === 0) return null;
    if (selectedOwnerIds.length === availableOwners.length && availableOwners.length > 1) {
      return 'All Team Members';
    }
    const selectedNames = availableOwners
      .filter(o => selectedOwnerIds.includes(o.user_id))
      .map(o => o.display_name?.split(' ')[0] || 'Unknown');
    
    if (selectedNames.length === 1) {
      return `${selectedNames[0]}'s Data`;
    }
    if (selectedNames.length === 2) {
      return `${selectedNames[0]}, ${selectedNames[1]}`;
    }
    return `${selectedNames[0]} +${selectedNames.length - 1} more`;
  };

  const allSelected = selectedOwnerIds.length === availableOwners.length && availableOwners.length > 0;

  return (
    <div className="flex items-center gap-1 bg-muted/50 rounded-full p-0.5">
      <button
        onClick={() => handleToggle(false)}
        className={cn(
          "px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200",
          !isViewingTeam
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        My Data
      </button>
      
      {hasTeam ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 flex items-center gap-1",
                isViewingTeam
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="h-3 w-3" />
              {isViewingTeam ? (
                <span className="max-w-[120px] truncate">{getSelectionText()}</span>
              ) : (
                <span>Team ({availableOwners.length})</span>
              )}
              <ChevronDown className="h-3 w-3 ml-0.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-64 p-0 bg-popover border-border" 
            align="end"
            sideOffset={8}
          >
            <div className="p-2 border-b border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Select Team Members</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      if (allSelected) {
                        onClear();
                      } else {
                        onSelectAll();
                      }
                    }}
                  >
                    {allSelected ? 'Clear All' : 'Select All'}
                  </Button>
                </div>
              </div>
            </div>
            
            <ScrollArea className="max-h-[200px]">
              <div className="p-1">
                {availableOwners.map(owner => {
                  const isSelected = selectedOwnerIds.includes(owner.user_id);
                  return (
                    <button
                      key={owner.user_id}
                      onClick={() => onToggleOwner(owner.user_id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors",
                        isSelected ? "bg-primary/10" : "hover:bg-muted"
                      )}
                    >
                      <div className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                        isSelected 
                          ? "bg-primary border-primary" 
                          : "border-muted-foreground/30"
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {owner.display_name || 'Unknown'}
                        </p>
                        {owner.nevorid && (
                          <p className="text-xs text-muted-foreground truncate">
                            {owner.nevorid}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
            
            {isViewingTeam && (
              <div className="p-2 border-t border-border bg-muted/30">
                <p className="text-xs text-muted-foreground text-center">
                  Viewing team data (read-only)
                </p>
              </div>
            )}
          </PopoverContent>
        </Popover>
      ) : (
        <Popover open={emptyPopoverOpen} onOpenChange={setEmptyPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 flex items-center gap-1",
                "text-muted-foreground/60 hover:text-muted-foreground"
              )}
            >
              <Users className="h-3 w-3" />
              Team (0)
            </button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-64 p-4 bg-popover border-border" 
            align="end"
            sideOffset={8}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No team members yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add team members in Profile to view their data here.
                </p>
              </div>
              <Button 
                size="sm" 
                onClick={handleGoToTeamAccess}
                className="w-full gap-1.5"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add Team Member
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
