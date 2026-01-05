import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Loader2, CheckCircle2 } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { toast } from 'sonner';

interface LeaderIdSetupDialogProps {
  onComplete?: () => void;
}

export function LeaderIdSetupDialog({ onComplete }: LeaderIdSetupDialogProps) {
  const { user } = useAuth();
  const { profile, loading: profileLoading, updateLeaderHierarchy, updateProfile } = useProfile();
  const { refreshFormat } = useTrackingFormatContext();
  
  const [open, setOpen] = useState(false);
  const [leaderIdInput, setLeaderIdInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const checkedRef = useRef(false);

  // Check if we should show the dialog - now using database flag
  useEffect(() => {
    if (!user || profileLoading || !profile || checkedRef.current) return;
    checkedRef.current = true;
    
    // Don't show if user already has a leader
    if (profile.leaders_id_of_my_leader) return;
    
    // Don't show if user already completed/skipped the prompt (persisted in DB)
    if (profile.leader_prompt_completed) return;
    
    // Show the dialog for first-time users without a leader
    setOpen(true);
  }, [user, profileLoading, profile]);

  const handleConnect = async () => {
    if (!leaderIdInput.trim()) return;
    
    setSaving(true);
    const result = await updateLeaderHierarchy(leaderIdInput.trim().toUpperCase());
    
    if (result.success) {
      // Set use_leader_stages to true AND mark prompt as completed
      await updateProfile({ 
        use_leader_stages: true,
        leader_prompt_completed: true 
      });
      refreshFormat();
      setSuccess(true);
      toast.success('Connected to your leader. Using their tracking format.');
      
      // Close after a brief delay to show success
      setTimeout(() => {
        setOpen(false);
        onComplete?.();
      }, 1500);
    } else {
      toast.error(result.error || 'Leader ID not found. Please check with your leader.');
    }
    
    setSaving(false);
  };

  const handleSkip = async () => {
    // Mark as completed in database so it never shows again
    setSaving(true);
    await updateProfile({ leader_prompt_completed: true });
    setSaving(false);
    setOpen(false);
    onComplete?.();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && !success) {
        handleSkip();
      }
    }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Do you have a Leader ID?
          </DialogTitle>
          <DialogDescription>
            If your leader shared their ID with you, enter it below to use their tracking format (tags, levels, and funnel settings).
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <p className="text-sm font-medium text-green-600">Connected successfully!</p>
            <p className="text-xs text-muted-foreground mt-1">Loading tracking format...</p>
          </div>
        ) : (
          <>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="leader-id">Enter your Leader's ID</Label>
                <Input
                  id="leader-id"
                  value={leaderIdInput}
                  onChange={(e) => setLeaderIdInput(e.target.value.toUpperCase())}
                  placeholder="NVR-XXXXX"
                  className="font-mono"
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  Your leader's ID looks like NVR-XXXXX. Ask your leader if you don't have it.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={handleSkip} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Skip for now
              </Button>
              <Button onClick={handleConnect} disabled={saving || !leaderIdInput.trim()}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
