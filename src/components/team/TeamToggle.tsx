import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useTeamAccess, TabPermission } from '@/hooks/useTeamAccess';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Users, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SharedOwner {
  user_id: string;
  display_name: string | null;
  nevorid: string | null;
}

interface TeamToggleProps {
  sharedOwners: SharedOwner[];
  selectedOwnerIds: string[];
  onSelectAll: () => void;
  onClear: () => void;
  currentTab: TabPermission;
}

export function TeamToggle({
  sharedOwners,
  selectedOwnerIds,
  onSelectAll,
  onClear,
  currentTab
}: TeamToggleProps) {
  const navigate = useNavigate();
  const { sharedWithMe } = useTeamAccess();
  const [emptyPopoverOpen, setEmptyPopoverOpen] = useState(false);

  // Filter owners to only show those who have granted access to currentTab
  const availableOwners = sharedOwners.filter(owner => {
    const access = sharedWithMe.find(a => a.owner_user_id === owner.user_id);
    if (!access) return false;
    // null means all tabs allowed
    if (!access.allowed_tabs) return true;
    return access.allowed_tabs.includes(currentTab);
  });

  const isViewingTeam = selectedOwnerIds.length > 0;
  const hasTeam = availableOwners.length > 0;

  const handleToggle = (viewTeam: boolean) => {
    if (viewTeam) {
      if (hasTeam) {
        onSelectAll();
      }
    } else {
      onClear();
    }
  };

  const handleGoToTeamAccess = () => {
    setEmptyPopoverOpen(false);
    navigate('/profile');
  };

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
        <button
          onClick={() => handleToggle(true)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200",
            isViewingTeam
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Team ({availableOwners.length})
        </button>
      ) : (
        <Popover open={emptyPopoverOpen} onOpenChange={setEmptyPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200",
                "text-muted-foreground/60 hover:text-muted-foreground"
              )}
            >
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