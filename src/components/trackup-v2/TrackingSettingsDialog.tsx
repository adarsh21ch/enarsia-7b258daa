import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';
import { useTrackingSourcePreferences, type TrackingSource } from '@/hooks/useTrackingSourcePreferences';
import { usePermissions } from '@/contexts/PermissionsContext';

interface TrackingSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrackingSettingsDialog({ open, onOpenChange }: TrackingSettingsDialogProps) {
  const { personalSource, teamSource, setPreferences, isUpdating } = useTrackingSourcePreferences();
  const { checkFeature } = usePermissions();

  const canPersonalAuto = checkFeature('personal_auto_tracking');
  const canTotalAuto = checkFeature('total_auto_tracking');
  const [localPersonal, setLocalPersonal] = useState<TrackingSource>(personalSource);
  const [localTeam, setLocalTeam] = useState<TrackingSource>(teamSource);

  // Sync local state when dialog opens, and enforce permissions
  useEffect(() => {
    if (open) {
      setLocalPersonal(!canPersonalAuto && personalSource === 'AUTO' ? 'MANUAL' : personalSource);
      setLocalTeam(!canTotalAuto && teamSource === 'AUTO' ? 'MANUAL' : teamSource);
    }
  }, [open, personalSource, teamSource, canPersonalAuto, canTotalAuto]);

  const handleSave = async () => {
    try {
      await setPreferences({
        personal_source: localPersonal,
        team_source: localTeam,
      });
      toast.success('Tracking settings saved');
      onOpenChange(false);
    } catch {
      toast.error('Failed to save settings');
    }
  };

  const hasChanges = localPersonal !== personalSource || localTeam !== teamSource;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Tracking Settings</DialogTitle>
          <DialogDescription>Choose how your tracking data is recorded.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Personal Tracking Mode */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Personal Tracking Mode</h3>
            <RadioGroup
              value={localPersonal}
              onValueChange={(v) => setLocalPersonal(v as TrackingSource)}
              className="gap-3"
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="MANUAL" id="personal-manual" className="mt-0.5" />
                <Label htmlFor="personal-manual" className="text-sm font-normal cursor-pointer">
                  Manual Entry
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <RadioGroupItem value="AUTO" id="personal-auto" className="mt-0.5" disabled={!canPersonalAuto} />
                <Label htmlFor="personal-auto" className={`text-sm font-normal ${canPersonalAuto ? 'cursor-pointer' : 'text-muted-foreground cursor-not-allowed'}`}>
                  Automatic (From Application)
                </Label>
                {!canPersonalAuto && (
                  <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/50 text-amber-600">
                    <Crown className="h-3 w-3" /> Pro
                  </Badge>
                )}
              </div>
            </RadioGroup>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Automatic mode updates your tracking from app activities like calling, follow-ups, and enrollments.
            </p>
          </div>

          {/* Total Tracking Mode */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Total Tracking Mode</h3>
            <RadioGroup
              value={localTeam}
              onValueChange={(v) => setLocalTeam(v as TrackingSource)}
              className="gap-3"
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="MANUAL" id="total-manual" className="mt-0.5" />
                <Label htmlFor="total-manual" className="text-sm font-normal cursor-pointer">
                  Manual Entry
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <RadioGroupItem value="AUTO" id="total-auto" className="mt-0.5" disabled={!canTotalAuto} />
                <Label htmlFor="total-auto" className={`text-sm font-normal ${canTotalAuto ? 'cursor-pointer' : 'text-muted-foreground cursor-not-allowed'}`}>
                  Automatic (Personal + Team Auto Calculation)
                </Label>
                {!canTotalAuto && (
                  <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/50 text-amber-600">
                    <Crown className="h-3 w-3" /> Pro
                  </Badge>
                )}
              </div>
            </RadioGroup>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Automatic total tracking calculates your personal + team data automatically.
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isUpdating || !hasChanges}
          className="w-full mt-2"
        >
          {isUpdating ? 'Saving...' : 'Save Settings'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
