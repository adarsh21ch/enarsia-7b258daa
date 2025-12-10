import { cn } from '@/lib/utils';
import { useTeamAccess, TabPermission } from '@/hooks/useTeamAccess';

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
  const { sharedWithMe } = useTeamAccess();

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
      onSelectAll();
    } else {
      onClear();
    }
  };

  // Don't render if user has no team members sharing this tab
  if (!hasTeam) {
    return null;
  }

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
    </div>
  );
}
