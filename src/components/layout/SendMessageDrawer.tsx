import { useState, useEffect } from 'react';
import { useDirectTeam } from '@/hooks/useDirectTeam';
import { useSendMessage } from '@/hooks/useSendMessage';
import { useLeaderLevels } from '@/hooks/useLeaderLevels';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from '@/components/ui/drawer';
import { Send, Loader2, Users, X } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type TargetType = 'all' | 'level' | 'single';

interface DeepLinkOption {
  label: string;
  route: string | null;
}

const DEEP_LINK_OPTIONS: DeepLinkOption[] = [
  { label: 'None', route: null },
  { label: 'Open To-Do Daily Tasks (today)', route: `/action?tab=daily&date=${format(new Date(), 'yyyy-MM-dd')}` },
  { label: 'Open To-Do List', route: '/action?tab=list' }
];

interface OverrideMember {
  user_id: string;
  display_name: string | null;
  level_id: string | null;
  level_position: number | null;
}
interface OverrideLevel {
  id: string;
  position: number;
  label: string;
}

interface SendMessageDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Use these members instead of useDirectTeam (e.g. dual-key discovery in /team-tracking) */
  membersOverride?: OverrideMember[];
  levelsOverride?: OverrideLevel[];
  /** Preselect a single member (sets targetType='single' on open) */
  preselectedMemberId?: string | null;
}

export function SendMessageDrawer({ open, onOpenChange, membersOverride, levelsOverride, preselectedMemberId }: SendMessageDrawerProps) {
  const isMobile = useIsMobile();
  const directTeam = useDirectTeam();
  const directLevels = useLeaderLevels();
  const members = membersOverride ?? directTeam.members;
  const levels = levelsOverride ?? directLevels.levels;
  const hasDirectTeam = membersOverride ? members.length > 0 : directTeam.hasDirectTeam;
  const teamLoading = membersOverride ? false : directTeam.loading;
  const levelsLoading = levelsOverride ? false : directLevels.loading;
  const { sendMessage, sending } = useSendMessage();

  const [targetType, setTargetType] = useState<TargetType>('all');
  const [targetLevel, setTargetLevel] = useState<string>('');
  const [targetMember, setTargetMember] = useState<string>('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deepLink, setDeepLink] = useState<string>('None');
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);

  const hasContent = title.trim() || body.trim();

  const resetForm = () => {
    setTitle('');
    setBody('');
    setDeepLink('None');
    setTargetType('all');
    setTargetLevel('');
    setTargetMember('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && hasContent) {
      setPendingClose(true);
      setShowDiscardDialog(true);
      return;
    }
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleConfirmDiscard = () => {
    setShowDiscardDialog(false);
    setPendingClose(false);
    resetForm();
    onOpenChange(false);
  };

  const handleCancelDiscard = () => {
    setShowDiscardDialog(false);
    setPendingClose(false);
  };

  const handleSend = async () => {
    if (!body.trim()) return;

    if (!hasDirectTeam) {
      return;
    }

    const selectedDeepLink = DEEP_LINK_OPTIONS.find(o => o.label === deepLink)?.route || null;

    const result = await sendMessage({
      title: title.trim() || 'Message from Leader',
      body: body.trim(),
      deepLinkRoute: selectedDeepLink,
      targetType,
      targetLevelPosition: targetType === 'level' ? parseInt(targetLevel) : null,
      targetUserId: targetType === 'single' ? targetMember : null,
      members
    });

    if (result.success) {
      resetForm();
      onOpenChange(false);
    }
  };

  const getMembersForLevel = (position: number) => {
    return members.filter(m => m.level_position === position);
  };

  const getRecipientCount = () => {
    if (targetType === 'all') return members.length;
    if (targetType === 'level' && targetLevel) {
      return getMembersForLevel(parseInt(targetLevel)).length;
    }
    if (targetType === 'single' && targetMember) return 1;
    return 0;
  };

  const isLoading = teamLoading || levelsLoading;

  const formContent = (
    <div className="space-y-4 p-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !hasDirectTeam ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No team members</p>
          <p className="text-sm">You don't have any direct team members to message.</p>
        </div>
      ) : (
        <>
          {/* Target Type */}
          <div className="space-y-2">
            <Label>Send to</Label>
            <Select value={targetType} onValueChange={(v) => setTargetType(v as TargetType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select recipients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All team ({members.length})</SelectItem>
                <SelectItem value="level">By level</SelectItem>
                <SelectItem value="single">Single member</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Level selector */}
          {targetType === 'level' && (
            <div className="space-y-2">
              <Label>Select Level</Label>
              <Select value={targetLevel} onValueChange={setTargetLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose level" />
                </SelectTrigger>
                <SelectContent>
                  {levels.map(level => {
                    const count = getMembersForLevel(level.position).length;
                    return (
                      <SelectItem key={level.id} value={level.position.toString()}>
                        {level.label} ({count} member{count !== 1 ? 's' : ''})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Single member selector */}
          {targetType === 'single' && (
            <div className="space-y-2">
              <Label>Select Member</Label>
              <Select value={targetMember} onValueChange={setTargetMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map(member => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.display_name || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label>Title (optional)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 60))}
              placeholder="Message title"
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground text-right">{title.length}/60</p>
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label>Message *</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 500))}
              placeholder="Write your message..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{body.length}/500</p>
          </div>

          {/* Deep Link */}
          <div className="space-y-2">
            <Label>Quick action link (optional)</Label>
            <Select value={deepLink} onValueChange={setDeepLink}>
              <SelectTrigger>
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent>
                {DEEP_LINK_OPTIONS.map(option => (
                  <SelectItem key={option.label} value={option.label}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!body.trim() || sending || getRecipientCount() === 0}
            className="w-full"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Send to {getRecipientCount()} member{getRecipientCount() !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );

  // Mobile: Bottom sheet (Drawer)
  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <DrawerTitle className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Send Message
                  </DrawerTitle>
                  <DrawerDescription>
                    Send a message to your team members
                  </DrawerDescription>
                </div>
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>
            <div className="overflow-y-auto">
              {formContent}
            </div>
          </DrawerContent>
        </Drawer>

        <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard message?</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved content. Are you sure you want to close and discard your message?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelDiscard}>Keep editing</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDiscard}>Discard</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Desktop: Right-side sheet
  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader className="border-b border-border/50 pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Send Message
            </SheetTitle>
            <SheetDescription>
              Send a message to your team members
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto max-h-[calc(100vh-120px)]">
            {formContent}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard message?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved content. Are you sure you want to close and discard your message?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDiscard}>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDiscard}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
