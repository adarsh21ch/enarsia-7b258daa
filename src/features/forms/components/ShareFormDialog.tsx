import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Copy, MessageCircle, Check, Link, Users, Send, Loader2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useDirectTeam } from '@/hooks/useDirectTeam';
import { useSharedLeads } from '@/hooks/useSharedLeads';
import type { Prospect } from '@/types/prospect';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string;
  formTitle: string;
  /** Optional: form submissions packaged as lead-like data for team sharing */
  formLeads?: Array<{ name: string; phone: string; [key: string]: any }>;
}

export function ShareFormDialog({ open, onOpenChange, shareUrl, formTitle, formLeads }: Props) {
  const [copied, setCopied] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);

  const { members, loading: teamLoading } = useDirectTeam();
  const { shareLeads } = useSharedLeads();

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Form link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Fill out this form: ${formTitle}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const handleShareToTeam = async () => {
    if (selectedMembers.size === 0) return;
    setSharing(true);

    // Package form link as a lead snapshot so receivers get the form URL
    const leadsToShare: Prospect[] = (formLeads && formLeads.length > 0)
      ? formLeads.map((l, i) => ({
          id: `form-lead-${i}`,
          user_id: '',
          name: l.name || 'Form Lead',
          phone: l.phone || '',
          notes: `From form: ${formTitle}\n${shareUrl}`,
          sheet_name: formTitle,
        } as unknown as Prospect))
      : [{
          id: 'form-link',
          user_id: '',
          name: `Form: ${formTitle}`,
          phone: '',
          notes: `Form link: ${shareUrl}`,
          sheet_name: formTitle,
        } as unknown as Prospect];

    const success = await shareLeads(Array.from(selectedMembers), leadsToShare, formTitle);
    setSharing(false);

    if (success) {
      toast.success(`Form shared with ${selectedMembers.size} team member${selectedMembers.size > 1 ? 's' : ''}`);
      setSelectedMembers(new Set());
      setShowTeam(false);
      onOpenChange(false);
    } else {
      toast.error('Failed to share. Make sure receivers are in your direct team.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold">Share Form</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Form link */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Link className="h-3.5 w-3.5" /> Form Link
            </label>
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="text-sm bg-blue-50/50 dark:bg-blue-950/20 border-blue-100/50 dark:border-blue-900/30 rounded-xl" />
              <Button
                variant="outline"
                size="icon"
                onClick={copyLink}
                className="shrink-0 rounded-xl border-blue-200/50 dark:border-blue-800/50 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-blue-500" />}
              </Button>
            </div>
          </div>

          {/* Primary actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={copyLink} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
              <Copy className="h-4 w-4 mr-2" /> Copy Link
            </Button>
            <Button onClick={shareWhatsApp} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
              <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
            </Button>
          </div>

          {/* Separator */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/60" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Share to Team toggle */}
          <Button
            variant="outline"
            className="w-full rounded-xl gap-2 justify-between"
            onClick={() => setShowTeam(!showTeam)}
          >
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Share to Team Members
            </span>
            {showTeam ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {/* Team member list */}
          {showTeam && (
            <div className="space-y-3">
              {teamLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-4 space-y-1">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">No direct team members found</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5 max-h-[35vh] overflow-y-auto">
                    {members.map(member => (
                      <label
                        key={member.user_id}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedMembers.has(member.user_id)}
                          onCheckedChange={() => toggleMember(member.user_id)}
                        />
                        <span className="text-sm font-medium truncate flex-1">{member.display_name || 'Unnamed'}</span>
                        <Badge variant="secondary" className="text-[10px] shrink-0">Team</Badge>
                      </label>
                    ))}
                  </div>
                  <Button
                    onClick={handleShareToTeam}
                    disabled={selectedMembers.size === 0 || sharing}
                    className="w-full rounded-xl gap-2"
                  >
                    {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send to {selectedMembers.size || ''} Member{selectedMembers.size !== 1 ? 's' : ''}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
