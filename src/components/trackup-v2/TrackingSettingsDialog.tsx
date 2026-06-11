import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, CalendarDays, ChevronRight, Pencil, Sparkles, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
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

        <div className="space-y-5 pt-2">
          {/* Front Tracking Mode (Front = personal_snapshot_v2, terminology rename only) */}
          <ModeToggle
            title="Front Tracking"
            value={localPersonal}
            onChange={setLocalPersonal}
            autoDisabled={!canPersonalAuto}
            lockedTierLabel={personalTierLabel}
            description={
              localPersonal === 'AUTO'
                ? 'Updates automatically from your in-app activity — calls, follow-ups, and enrollments.'
                : 'You enter your own numbers each day. Nothing is tracked from the app.'
            }
          />

          {/* Total Tracking Mode */}
          <ModeToggle
            title="Total Tracking"
            value={localTeam}
            onChange={setLocalTeam}
            autoDisabled={!canTotalAuto}
            lockedTierLabel={totalTierLabel}
            description={
              localTeam === 'AUTO'
                ? 'Calculates your total as Personal + Team automatically.'
                : 'You enter total numbers manually. Team data is not added.'
            }
          />

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

interface ModeToggleProps {
  title: string;
  value: TrackingSource;
  onChange: (v: TrackingSource) => void;
  autoDisabled: boolean;
  lockedTierLabel: string;
  description: string;
}

function ModeToggle({ title, value, onChange, autoDisabled, lockedTierLabel, description }: ModeToggleProps) {
  const isAuto = value === 'AUTO';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {autoDisabled && (
          <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/50 text-amber-600">
            <Crown className="h-3 w-3" /> {lockedTierLabel}
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted/60 border border-border/60">
        <button
          type="button"
          onClick={() => onChange('MANUAL')}
          className={cn(
            'flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all duration-200',
            !isAuto
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Pencil className="h-3.5 w-3.5" />
          Manual
        </button>
        <button
          type="button"
          disabled={autoDisabled}
          onClick={() => !autoDisabled && onChange('AUTO')}
          className={cn(
            'flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all duration-200',
            isAuto
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
            autoDisabled && 'opacity-50 cursor-not-allowed hover:text-muted-foreground'
          )}
        >
          {autoDisabled ? <Lock className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
          Automatic
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed px-0.5">
        {description}
      </p>
    </div>
  );
}
