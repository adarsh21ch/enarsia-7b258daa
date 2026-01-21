import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Share2, Copy, Check, Users, Bell, Eye, EyeOff, Settings2, X, Mail } from 'lucide-react';
import { useTeamAccess, AVAILABLE_TABS, TabPermission } from '@/hooks/useTeamAccess';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const TAB_LABELS: Record<TabPermission, string> = {
  calling: 'Calling',
  follow_up: 'Follow Up',
  activity: 'Recent (Activity)',
  todo: 'To-Do List',
  track: 'Track Up'
};

export function ShareProfileDialog() {
  const { 
    myEmail,
    myDisplayName,
    teamMembers, 
    sharedWithMe, 
    pendingRequests,
    loading, 
    shareWithUpline,
    acceptShareRequest,
    rejectShareRequest,
    stopSharingWithLeader,
    removeFromTeam,
    updateTabPermissions
  } = useTeamAccess();
  
  const [open, setOpen] = useState(false);
  const [uplineEmailInput, setUplineEmailInput] = useState('');
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
  // ALL tabs selected by default when sharing
  const [selectedTabs, setSelectedTabs] = useState<TabPermission[]>([...AVAILABLE_TABS]);
  // Tabs to share when creating a new share
  const [shareWithTabs, setShareWithTabs] = useState<TabPermission[]>([...AVAILABLE_TABS]);

  const handleCopyEmail = async () => {
    if (myEmail) {
      await navigator.clipboard.writeText(myEmail);
      setCopied(true);
      toast.success('Email copied');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareWithUpline = async () => {
    if (!uplineEmailInput.trim()) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(uplineEmailInput.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setSharing(true);
    // Pass the selected tabs (null if all selected)
    const tabsToShare = shareWithTabs.length === AVAILABLE_TABS.length ? null : shareWithTabs;
    const result = await shareWithUpline(uplineEmailInput.trim().toLowerCase(), tabsToShare);
    setSharing(false);
    
    if (result.success) {
      setUplineEmailInput('');
      // Reset tab selection to all for next share
      setShareWithTabs([...AVAILABLE_TABS]);
    } else {
      toast.error(result.error);
    }
  };

  const handleStartEditPermissions = (memberId: string, currentTabs: TabPermission[] | null) => {
    setEditingPermissions(memberId);
    // null means all tabs, so default to all
    setSelectedTabs(currentTabs || [...AVAILABLE_TABS]);
  };

  const handleSavePermissions = async (memberId: string) => {
    // If all tabs selected, save as null (full access)
    const tabsToSave = selectedTabs.length === AVAILABLE_TABS.length ? null : selectedTabs;
    await updateTabPermissions(memberId, tabsToSave);
    setEditingPermissions(null);
  };

  const handleToggleTab = (tab: TabPermission) => {
    setSelectedTabs(prev => {
      if (prev.includes(tab)) {
        return prev.filter(t => t !== tab);
      } else {
        return [...prev, tab];
      }
    });
  };

  const handleToggleShareTab = (tab: TabPermission) => {
    setShareWithTabs(prev => {
      if (prev.includes(tab)) {
        return prev.filter(t => t !== tab);
      } else {
        return [...prev, tab];
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="lg" className="w-full gap-2 h-12 rounded-xl">
          <Share2 className="h-5 w-5" />
          Share Profile
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
            <Share2 className="h-5 w-5" />
            Share Your Profile
          </DialogTitle>
          <DialogDescription>Share your profile data with your upline or manage team connections.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* My Email (Share Link) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Your Email</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm truncate">
                {myEmail || 'Loading...'}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleCopyEmail}
                disabled={!myEmail}
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share your email so others can connect with you as their upline.
            </p>
          </div>

          <Separator />

          {/* Share with Upline - with Tab Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Share with Your Upline
            </Label>
            
            {/* Tab selection for new share */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Select tabs to share (all selected by default):</p>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_TABS.map(tab => (
                  <label key={tab} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <Checkbox
                      checked={shareWithTabs.includes(tab)}
                      onCheckedChange={() => handleToggleShareTab(tab)}
                    />
                    <span className="text-sm">{TAB_LABELS[tab]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter Upline's Gmail Address"
                  value={uplineEmailInput}
                  onChange={(e) => setUplineEmailInput(e.target.value.toLowerCase())}
                  className="pl-10"
                  type="email"
                />
              </div>
              <Button 
                onClick={handleShareWithUpline}
                disabled={sharing || !uplineEmailInput.trim() || shareWithTabs.length === 0}
                size="sm"
              >
                Share
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share selected tabs with your upline. They can view your data once connected.
            </p>
          </div>

          {/* Pending Share Requests (for uplines) */}
          {pendingRequests.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4 text-orange-500" />
                  Share Requests Received
                  <Badge variant="secondary">{pendingRequests.length}</Badge>
                </Label>
                <div className="space-y-2">
                  {pendingRequests.map(request => (
                    <div key={request.id} className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{request.owner_display_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{request.owner_email || 'No email'}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            wants to share their data with you
                          </p>
                        </div>
                        <div className="flex gap-2 ml-2">
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => acceptShareRequest(request.id)}
                          >
                            Accept
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => rejectShareRequest(request.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                      {/* Show which tabs they're sharing */}
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-muted-foreground">Tabs shared:</span>
                        {(request.allowed_tabs || AVAILABLE_TABS).map(tab => (
                          <Badge key={tab} variant="outline" className="text-xs">
                            {TAB_LABELS[tab]}
                          </Badge>
                        ))}
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
                    <div key={access.id} className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{access.owner_display_name}</p>
                          <p className="text-xs text-muted-foreground">{access.owner_email || 'No email'}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeFromTeam(access.id)}
                        >
                          Remove
                        </Button>
                      </div>
                      {access.allowed_tabs && access.allowed_tabs.length < AVAILABLE_TABS.length && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {access.allowed_tabs.map(tab => (
                            <Badge key={tab} variant="outline" className="text-xs">
                              {TAB_LABELS[tab]}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Uplines I'm Sharing With + Tab Permission Controls */}
          {teamMembers.filter(m => m.status === 'active' || m.status === 'pending').length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-blue-500" />
                  Sharing Your Data With
                </Label>
                <div className="space-y-2">
                  {teamMembers.filter(m => m.status === 'active' || m.status === 'pending').map(member => (
                    <div key={member.id} className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium flex items-center gap-2">
                            {member.display_name || 'Unknown'}
                            {member.status === 'pending' && (
                              <Badge variant="secondary" className="text-xs">Pending</Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{member.email || 'No email'}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {member.status === 'active' && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleStartEditPermissions(member.id, member.allowed_tabs)}
                              title="Edit Permissions"
                            >
                              <Settings2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => stopSharingWithLeader(member.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Current permissions display */}
                      {member.status === 'active' && !editingPermissions && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(member.allowed_tabs || AVAILABLE_TABS).map(tab => (
                            <Badge key={tab} variant="outline" className="text-xs">
                              {TAB_LABELS[tab]}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Edit permissions UI */}
                      {editingPermissions === member.id && (
                        <div className="mt-3 pt-3 border-t border-border space-y-3">
                          <p className="text-xs font-medium">Select tabs they can view:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {AVAILABLE_TABS.map(tab => (
                              <label key={tab} className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={selectedTabs.includes(tab)}
                                  onCheckedChange={() => handleToggleTab(tab)}
                                />
                                <span className="text-sm">{TAB_LABELS[tab]}</span>
                              </label>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleSavePermissions(member.id)}
                              disabled={selectedTabs.length === 0}
                            >
                              Save
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setEditingPermissions(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
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
              <p className="text-xs">Share your email with your team to get started.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
