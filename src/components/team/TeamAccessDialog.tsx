import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Copy, Plus, X, Check } from 'lucide-react';
import { useTeamAccess } from '@/hooks/useTeamAccess';
import { toast } from 'sonner';

export function TeamAccessDialog() {
  const { myNeveraiId, teamMembers, sharedWithMe, loading, addTeamMember, removeTeamMember } = useTeamAccess();
  const [open, setOpen] = useState(false);
  const [newMemberId, setNewMemberId] = useState('');
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyId = async () => {
    if (myNeveraiId) {
      await navigator.clipboard.writeText(myNeveraiId);
      setCopied(true);
      toast.success('NeverAI ID copied');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberId.trim()) return;
    
    setAdding(true);
    const result = await addTeamMember(newMemberId.trim().toUpperCase());
    setAdding(false);
    
    if (result.success) {
      setNewMemberId('');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          Team
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Team Access</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* My NeverAI ID */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Your NeverAI ID</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-muted rounded-md font-mono text-sm">
                {myNeveraiId || 'Loading...'}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleCopyId}
                disabled={!myNeveraiId}
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this ID with team members so they can view your Follow Up data
            </p>
          </div>

          {/* Add Team Member */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Add Team Member</Label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Enter NeverAI ID (e.g., NVR-XXXXX)"
                value={newMemberId}
                onChange={(e) => setNewMemberId(e.target.value.toUpperCase())}
                className="flex-1 font-mono"
              />
              <Button 
                size="icon" 
                onClick={handleAddMember}
                disabled={adding || !newMemberId.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add someone's NeverAI ID to give them read-only access to your Follow Up list
            </p>
          </div>

          {/* Team Members I've Shared With */}
          {teamMembers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">People with access to your data</Label>
              <div className="space-y-2">
                {teamMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                    <div>
                      <p className="text-sm font-medium">{member.display_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground font-mono">{member.neverai_id}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeTeamMember(member.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Shared With Me */}
          {sharedWithMe.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data shared with you</Label>
              <div className="space-y-2">
                {sharedWithMe.map(access => (
                  <div key={access.id} className="p-2 bg-primary/5 rounded-md">
                    <p className="text-sm font-medium">{access.owner_display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Can view in ListUp page
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <p className="text-sm text-muted-foreground text-center">Loading...</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
