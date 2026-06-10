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
import { Crown, CalendarDays, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useTrackingSourcePreferences, type TrackingSource } from '@/hooks/useTrackingSourcePreferences';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { useFunnelConfig } from '@/hooks/useFunnelConfig';
import { getTierDisplayName } from '@/config/tierLabels';

interface TrackingSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditFunnelConfig?: () => void;
}

export function TrackingSettingsDialog({ open, onOpenChange, onEditFunnelConfig }: TrackingSettingsDialogProps) {
  const { personalSource, teamSource, setPreferences, isUpdating } = useTrackingSourcePreferences();
  const { checkFeature } = usePermissions();
  const { config } = useAdminConfig();
  const { getEffectiveConfig, isReadOnly: funnelReadOnly, leaderName } = useFunnelConfig();
  const effectiveFunnel = getEffectiveConfig();

  const canPersonalAuto = checkFeature('personal_auto_tracking');
  const canTotalAuto = checkFeature('total_auto_tracking');
  const [localPersonal, setLocalPersonal] = useState<TrackingSource>(personalSource);
  const [localTeam, setLocalTeam] = useState<TrackingSource>(teamSource);

  // Get dynamic tier labels from feature flags
  const personalAutoTier = config.features['personal_auto_tracking']?.required_tier;
  const totalAutoTier = config.features['total_auto_tracking']?.required_tier;
  const personalTierLabel = personalAutoTier ? getTierDisplayName(personalAutoTier) : 'Basic';
  const totalTierLabel = totalAutoTier ? getTierDisplayName(totalAutoTier) : 'Basic';

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
                    <Crown className="h-3 w-3" /> {personalTierLabel}
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
                    <Crown className="h-3 w-3" /> {totalTierLabel}
                  </Badge>
                )}
              </div>
            </RadioGroup>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Automatic total tracking calculates your personal + team data automatically.
            </p>
          </div>

          {/* Funnel Configuration entry */}
          {onEditFunnelConfig && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Funnel Configuration</h3>
              <button
                type="button"
                onClick={onEditFunnelConfig}
                className="w-full flex items-center justify-between gap-3 rounded-lg border bg-muted/30 hover:bg-muted/60 transition px-3 py-2.5 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                    <CalendarDays className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {funnelReadOnly ? 'View funnel setup' : 'Edit funnel setup'}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {effectiveFunnel?.day_1_start && effectiveFunnel?.funnel_length
                        ? `Day 1: ${format(new Date(effectiveFunnel.day_1_start), 'MMM d, yyyy')} • ${effectiveFunnel.funnel_length} ${effectiveFunnel.funnel_length === 1 ? 'day' : 'days'}`
                        : 'Not configured yet — tap to set up'}
                      {funnelReadOnly && leaderName ? ` (from ${leaderName})` : ''}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            </div>
          )}
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
