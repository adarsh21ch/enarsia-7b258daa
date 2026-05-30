import { useState, type ComponentType } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useMode } from '@/hooks/useMode';
import { useAdmin } from '@/hooks/useAdmin';
import { MODES, type ModeId } from '@/config/modes';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Users, Clapperboard, Rocket, Check, Loader2, Lock, Eye } from 'lucide-react';

/** Icon per mode, used only in the switcher list. */
const MODE_ICONS: Record<ModeId, ComponentType<{ className?: string }>> = {
  network_marketing: Users,
  content_creator: Clapperboard,
  founder: Rocket,
};

/**
 * App Mode switcher.
 *
 * Lets the user pick which profession Mode the whole app runs as. Selecting a
 * mode writes `profiles.mode`; `useMode()` reads it, so the bottom nav and
 * terminology re-skin live (optimistic cache update in useProfile).
 *
 * Enabled modes are selectable by everyone. Modes still under construction
 * (`enabled: false`) show "Coming soon" to regular users, but admins can flip
 * into them as a "Preview" to build/dogfood (pages may 404 until built).
 */
export function ModeSwitcher() {
  const { profile, updateProfile, updating } = useProfile();
  const { modeId: activeModeId } = useMode();
  const { isAdmin } = useAdmin();
  const [pendingId, setPendingId] = useState<ModeId | null>(null);

  const modes = Object.values(MODES);

  const handleSelect = async (id: ModeId) => {
    if (id === activeModeId || updating) return;
    setPendingId(id);
    const { error } = await updateProfile({ mode: id });
    setPendingId(null);
    if (error) {
      toast.error('Could not switch mode. Make sure the profiles.mode column exists.');
      return;
    }
    toast.success(`Switched to ${MODES[id].label}`);
  };

  return (
    <div className="rounded-2xl bg-card border border-border/50 overflow-hidden divide-y divide-border/50">
      {modes.map((m) => {
        const Icon = MODE_ICONS[m.id];
        const isActive = m.id === activeModeId;
        const isLocked = !m.enabled && !isAdmin;
        const isPreview = !m.enabled && isAdmin;
        const isPending = pendingId === m.id;

        return (
          <button
            key={m.id}
            type="button"
            disabled={isLocked || updating}
            onClick={() => handleSelect(m.id)}
            className={cn(
              'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors',
              isActive ? 'bg-primary/5' : 'hover:bg-muted/50',
              isLocked && 'opacity-60 cursor-not-allowed',
            )}
          >
            <div
              className={cn(
                'p-2 rounded-xl shrink-0',
                isActive ? 'bg-primary/15' : 'bg-muted',
              )}
            >
              <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('font-medium text-sm', isActive && 'text-primary')}>{m.label}</span>
                {isPreview && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <Eye className="h-2.5 w-2.5" />
                    Preview
                  </span>
                )}
                {isLocked && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border/50">
                    Coming soon
                  </span>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground truncate block">{m.terms.tagline}</span>
            </div>
            <div className="shrink-0">
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : isActive ? (
                <Check className="h-4 w-4 text-primary" />
              ) : isLocked ? (
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
