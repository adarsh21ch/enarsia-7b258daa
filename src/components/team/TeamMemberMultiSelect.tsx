import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Users, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface TeamMember {
  user_id: string;
  display_name: string;
  nevorid: string | null;
}

interface TeamMemberMultiSelectProps {
  teamMembers: TeamMember[];
  selectedIds: string[];
  onToggle: (userId: string) => void;
  onClear: () => void;
  onSelectAll: () => void;
  prospectCounts?: Record<string, number>;
}

export function TeamMemberMultiSelect({
  teamMembers,
  selectedIds,
  onToggle,
  onClear,
  onSelectAll,
  prospectCounts = {}
}: TeamMemberMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCount = selectedIds.length;
  const hasSelection = selectedCount > 0;

  // Get display text for trigger
  const getTriggerText = () => {
    if (selectedCount === 0) {
      return 'Select team members';
    }
    if (selectedCount === 1) {
      const member = teamMembers.find(m => m.user_id === selectedIds[0]);
      return member?.display_name || 'Unknown';
    }
    return `${selectedCount} team members selected`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full justify-between h-10",
          hasSelection && "border-primary/50 bg-primary/5"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="truncate">{getTriggerText()}</span>
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0",
          isOpen && "rotate-180"
        )} />
      </Button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {/* Header with actions */}
          <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border/50">
            <span className="text-xs font-medium text-muted-foreground">
              Team Members ({teamMembers.length})
            </span>
            <div className="flex gap-1">
              {selectedCount < teamMembers.length && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onSelectAll();
                  }}
                  className="h-6 px-2 text-xs"
                >
                  Select All
                </Button>
              )}
              {hasSelection && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onClear();
                  }}
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Member List */}
          <div className="max-h-60 overflow-y-auto">
            {teamMembers.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No team members available
              </div>
            ) : (
              teamMembers.map(member => {
                const isSelected = selectedIds.includes(member.user_id);
                const count = prospectCounts[member.user_id] || 0;
                
                return (
                  <div
                    key={member.user_id}
                    onClick={() => onToggle(member.user_id)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                      "hover:bg-muted/50",
                      isSelected && "bg-primary/5"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggle(member.user_id)}
                      className="pointer-events-none"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.display_name}
                      </p>
                      {member.nevorid && (
                        <p className="text-xs text-muted-foreground">
                          {member.nevorid}
                        </p>
                      )}
                    </div>
                    {count > 0 && (
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        {count}
                      </Badge>
                    )}
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
