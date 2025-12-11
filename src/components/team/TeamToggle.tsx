// Re-export from the new component for backward compatibility
export { TeamMemberSelector as TeamToggle } from './TeamMemberSelector';
export type { } from './TeamMemberSelector';

// Also export the old interface for backward compatibility
import { TeamMemberSelector } from './TeamMemberSelector';
import { TabPermission } from '@/hooks/useTeamAccess';

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

// Legacy wrapper that adapts old props to new component
export function LegacyTeamToggle({
  sharedOwners,
  selectedOwnerIds,
  onSelectAll,
  onClear,
  currentTab
}: TeamToggleProps) {
  // Dummy toggle function for legacy usage
  const handleToggle = (ownerId: string) => {
    if (selectedOwnerIds.includes(ownerId)) {
      // If this is the only one, clear
      if (selectedOwnerIds.length === 1) {
        onClear();
      }
    } else {
      // Select all for legacy behavior
      onSelectAll();
    }
  };

  return (
    <TeamMemberSelector
      sharedOwners={sharedOwners}
      selectedOwnerIds={selectedOwnerIds}
      onToggleOwner={handleToggle}
      onSelectAll={onSelectAll}
      onClear={onClear}
      currentTab={currentTab}
    />
  );
}