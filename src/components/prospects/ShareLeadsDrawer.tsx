import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Users } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDirectTeam } from '@/hooks/useDirectTeam';
import { useSharedLeads } from '@/hooks/useSharedLeads';
import { Prospect } from '@/types/prospect';
import { toast } from 'sonner';

interface ShareLeadsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProspects: Prospect[];
  onComplete: () => void;
  sheetName?: string;
}

export function ShareLeadsDrawer({ open, onOpenChange, selectedProspects, onComplete, sheetName }: ShareLeadsDrawerProps) {
  const isMobile = useIsMobile();
  const { members, loading: teamLoading } = useDirectTeam();
  const { shareLeads } = useSharedLeads();
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const handleShare = async () => {
    if (selectedMembers.size === 0 || selectedProspects.length === 0) return;
    setSharing(true);
    const success = await shareLeads(Array.from(selectedMembers), selectedProspects, sheetName || undefined);
    setSharing(false);
    if (success) {
      toast.success(`${selectedProspects.length} leads shared with ${selectedMembers.size} member${selectedMembers.size > 1 ? 's' : ''}`);
      setSelectedMembers(new Set());
      onOpenChange(false);
      onComplete();
    } else {
      toast.error('Failed to share leads. Make sure receivers are in your direct team.');
    }
  };

  const content = (
    <div className="space-y-4 px-1">
      <p className="text-sm text-muted-foreground">
        Sharing {selectedProspects.length} lead{selectedProspects.length !== 1 ? 's' : ''} with your direct team
      </p>

      {teamLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No direct team members found</p>
          <p className="text-xs text-muted-foreground/70">Team members who have set your Leader ID will appear here</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {members.map(member => (
            <label
              key={member.user_id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <Checkbox
                checked={selectedMembers.has(member.user_id)}
                onCheckedChange={() => toggleMember(member.user_id)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member.display_name || 'Unnamed'}</p>
              </div>
              <Badge variant="secondary" className="text-[10px] shrink-0">Direct Team</Badge>
            </label>
          ))}
        </div>
      )}
    </div>
  );

  const footer = (
    <Button
      onClick={handleShare}
      disabled={selectedMembers.size === 0 || sharing}
      className="w-full gap-2"
    >
      {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      Share {selectedProspects.length} Lead{selectedProspects.length !== 1 ? 's' : ''}
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Share Leads</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-2">{content}</div>
          <DrawerFooter>{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Share Leads</DialogTitle>
        </DialogHeader>
        {content}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
