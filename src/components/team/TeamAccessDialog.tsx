import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Copy, Check, X, UserPlus, Bell, Eye, EyeOff } from 'lucide-react';
import { useTeamAccess } from '@/hooks/useTeamAccess';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatLeaderId } from '@/lib/leaderIdFormat';

export function TeamAccessDialog() {
  const { 
    myNevorId, 
    myDisplayName,
    myLeaderCodeSeq,
    teamMembers, 
    sharedWithMe, 
    pendingRequests,
    loading, 
    shareWithLeader,
    acceptShareRequest,
    rejectShareRequest,
    stopSharingWithLeader,
    removeFromTeam
  } = useTeamAccess();
  
  const [open, setOpen] = useState(false);
  const [leaderTrackUpId, setLeaderTrackUpId] = useState('');
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyId = async () => {
    if (myNevorId) {
      await navigator.clipboard.writeText(formatLeaderId(myNevorId, myLeaderCodeSeq));
      setCopied(true);
      toast.success('Leader ID copied');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareWithLeader = async () => {
    if (!leaderTrackUpId.trim()) return;
    
    setSharing(true);
    const result = await shareWithLeader(leaderTrackUpId.trim().toUpperCase());
    setSharing(false);
    
    if (result.success) {
      setLeaderTrackUpId('');
    } else {
      toast.error(result.error);
    }
  };

  const handleAccept = async (requestId: string) => {
    await acceptShareRequest(requestId);
  };

  const handleReject = async (requestId: string) => {
    await rejectShareRequest(requestId);
  };

  const handleStopSharing = async (accessId: string) => {
    await stopSharingWithLeader(accessId);
  };

  const handleRemoveFromTeam = async (accessId: string) => {
    await removeFromTeam(accessId);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          Team
          {pendingRequests.length > 0 && (
            <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {pendingRequests.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Access
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* My Leader ID */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Your Leader ID</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-muted rounded-md font-mono text-sm">
                {formatLeaderId(myNevorId, myLeaderCodeSeq) || 'Loading...'}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleCopyId}
                disabled={!myNevorId}
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this Leader ID with your team so they can share their Follow Up lists with you.
            </p>
          </div>

          <Separator />

          {/* Share with Leader */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Share with Leader
            </Label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Enter Leader's ID (e.g., NVR000123)"
                value={leaderTrackUpId}
                onChange={(e) => setLeaderTrackUpId(e.target.value.toUpperCase())}
                className="flex-1 font-mono"
              />
              <Button 
                onClick={handleShareWithLeader}
                disabled={sharing || !leaderTrackUpId.trim()}
                size="sm"
              >
                Share
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share your Follow Up list with your leader. They must accept before they can view your data (read-only).
            </p>
          </div>

          {/* Pending Share Requests (for leaders) */}
          {pendingRequests.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4 text-orange-500" />
                  Share Requests
                  <Badge variant="secondary">{pendingRequests.length}</Badge>
                </Label>
                <div className="space-y-2">
                  {pendingRequests.map(request => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{request.owner_display_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground font-mono">{request.owner_nevorid}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          wants to share their Follow Up list with you (read-only)
                        </p>
                      </div>
                      <div className="flex gap-2 ml-2">
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => handleAccept(request.id)}
                        >
                          Accept
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleReject(request.id)}
                        >
                          Ignore
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Team Members Sharing with Me (I can view their data) */}
          {sharedWithMe.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4 text-green-500" />
                  Your Team (you can view their data)
                </Label>
                <div className="space-y-2">
                  {sharedWithMe.map(access => (
                    <div key={access.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{access.owner_display_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{access.owner_nevorid}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveFromTeam(access.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  View their Follow Up lists in the Follow Up page using the Team selector.
                </p>
              </div>
            </>
          )}

          {/* Leaders I'm Sharing With */}
          {teamMembers.filter(m => m.status === 'active' || m.status === 'pending').length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-blue-500" />
                  You're sharing with
                </Label>
                <div className="space-y-2">
                  {teamMembers.filter(m => m.status === 'active' || m.status === 'pending').map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2">
                          {member.display_name || 'Unknown'}
                          {member.status === 'pending' && (
                            <Badge variant="secondary" className="text-xs">Pending</Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">{member.nevorid}</p>
                        {member.status === 'active' && (
                          <p className="text-xs text-muted-foreground">Can view your Follow Up list</p>
                        )}
                        {member.status === 'pending' && (
                          <p className="text-xs text-muted-foreground">Waiting for them to accept</p>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleStopSharing(member.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {loading && (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          )}

          {!loading && pendingRequests.length === 0 && sharedWithMe.length === 0 && teamMembers.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No team connections yet</p>
              <p className="text-xs">Share your Leader ID with your team or enter a leader's ID to get started.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
