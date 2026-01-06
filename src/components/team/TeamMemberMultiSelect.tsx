import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Users, Check, X, Pencil, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useMemberAliases } from '@/hooks/useMemberAliases';
import { toast } from 'sonner';

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
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editName, setEditName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { aliases, getDisplayName, setAlias, loading: aliasLoading } = useMemberAliases();

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

  const handleEditClick = (e: React.MouseEvent, member: TeamMember) => {
    e.stopPropagation();
    setEditingMember(member);
    setEditName(aliases[member.user_id] || '');
  };

  const handleSaveAlias = async () => {
    if (!editingMember) return;
    const success = await setAlias(editingMember.user_id, editName);
    if (success) {
      toast.success(editName.trim() ? 'Alias saved' : 'Alias removed');
      setEditingMember(null);
    } else {
      toast.error('Failed to save alias');
    }
  };

  const getTriggerText = () => {
    if (selectedCount === 0) return 'Select team members';
    if (selectedCount === 1) {
      const member = teamMembers.find(m => m.user_id === selectedIds[0]);
      return getDisplayName(selectedIds[0], member?.display_name || 'Unknown');
    }
    return `${selectedCount} team members selected`;
  };

  const getTotalCount = () => selectedIds.reduce((sum, id) => sum + (prospectCounts[id] || 0), 0);

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className={cn("w-full justify-between h-10", hasSelection && "border-primary/50 bg-primary/5")}
        >
          <div className="flex items-center gap-2 truncate">
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{getTriggerText()}</span>
            {hasSelection && getTotalCount() > 0 && (
              <Badge variant="secondary" className="text-xs">{getTotalCount()}</Badge>
            )}
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform flex-shrink-0", isOpen && "rotate-180")} />
        </Button>

        {isOpen && (
          <div className="absolute z-[100] mt-1 left-0 right-0 min-w-[280px] max-w-[320px] bg-card border border-border rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border/50">
              <span className="text-xs font-medium text-muted-foreground">Team Members ({teamMembers.length})</span>
              <div className="flex gap-1">
                {selectedCount < teamMembers.length && (
                  <Button variant="ghost" size="sm" onClick={onSelectAll} className="h-6 px-2 text-xs">Select All</Button>
                )}
                {hasSelection && (
                  <Button variant="ghost" size="sm" onClick={onClear} className="h-6 px-2 text-xs text-destructive hover:text-destructive">
                    <X className="h-3 w-3 mr-1" />Clear
                  </Button>
                )}
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto overscroll-contain">
              {teamMembers.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">No team members available</div>
              ) : (
                teamMembers.map(member => {
                  const isSelected = selectedIds.includes(member.user_id);
                  const count = prospectCounts[member.user_id] || 0;
                  const displayName = getDisplayName(member.user_id, member.display_name);
                  const hasAlias = !!aliases[member.user_id];
                  
                  return (
                    <div
                      key={member.user_id}
                      className={cn("flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors hover:bg-muted/50 group", isSelected && "bg-primary/5")}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0" onClick={() => onToggle(member.user_id)}>
                        <Checkbox checked={isSelected} className="pointer-events-none flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">{displayName}</p>
                          {hasAlias && <p className="text-xs text-muted-foreground truncate">Real: {member.display_name}</p>}
                        </div>
                      </div>
                      {count > 0 && <Badge variant="secondary" className="text-xs flex-shrink-0">{count}</Badge>}
                      <button onClick={(e) => handleEditClick(e, member)} className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity" title="Rename">
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                      {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="text-base">Rename Team Member</DialogTitle>
            <DialogDescription>Set a custom label for this team member that only you will see.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Real Name</p>
              <p className="text-sm font-medium">{editingMember?.display_name || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Your Label (alias)</p>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g., Adil - Closer" className="h-9" autoFocus />
              <p className="text-[10px] text-muted-foreground mt-1">Only you will see this name.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingMember(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveAlias} disabled={aliasLoading}>
              {aliasLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}