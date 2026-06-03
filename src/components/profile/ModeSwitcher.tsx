import { useState, type ComponentType } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useMode, writeCachedMode } from '@/hooks/useMode';

import { MODES, getAddonModes, normalizeEnabledModes, type ModeId } from '@/config/modes';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Users, Clapperboard, Rocket, Check, Loader2, Plus } from 'lucide-react';

/** Icon per profession. */
const MODE_ICONS: Record<ModeId, ComponentType<{ className?: string }>> = {
  network_marketing: Users,
  content_creator: Clapperboard,
  founder: Rocket,
};

/**
 * Profession picker for the Profile page.
 *
 * Everyone starts on their base profession (Network Marketing). This shows the
 * professions the user has chosen (`profiles.enabled_modes`) as switchable
 * rows, plus an "Add a profession" list of available add-ons (e.g. Content
 * Creator). Switching writes `profiles.mode`; adding appends to
 * `enabled_modes` and switches to it. `useMode()` reads `mode`, so the bottom
 * nav + terminology re-skin live.
 */
export function ModeSwitcher() {
  const { profile, updateProfile, updating } = useProfile();
  const { modeId: activeModeId } = useMode();
  const [pendingId, setPendingId] = useState<ModeId | null>(null);

  const enabled = normalizeEnabledModes(profile?.enabled_modes);
  // All live add-on professions are available to every user. Add-ons are
  // appended to `enabled_modes` and become switchable from the list above.
  const addable = getAddonModes().filter((m) => !enabled.includes(m.id));


  // Nothing actionable for a single-profession user → render nothing (keeps
  // normal users' Profile clean; no lone "Network Marketing" row).
  if (enabled.length <= 1 && addable.length === 0) return null;

  const handleSwitch = async (id: ModeId) => {
    if (id === activeModeId || updating) return;
    setPendingId(id);
    const { error } = await updateProfile({ mode: id });
    setPendingId(null);
    if (error) return toast.error('Could not switch profession.');
    toast.success(`Switched to ${MODES[id].label}`);
  };

  const handleAdd = async (id: ModeId) => {
    if (updating) return;
    setPendingId(id);
    const { error } = await updateProfile({ mode: id, enabled_modes: [...enabled, id] });
    setPendingId(null);
    if (error) return toast.error('Could not add profession.');
    toast.success(`Added ${MODES[id].label}`);
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] uppercase tracking-[1.2px] text-muted-foreground font-semibold pt-3 pb-1 px-1">
        Profession
      </p>

      {/* Chosen professions — switch between them */}
      <div className="rounded-2xl bg-card border border-border/50 overflow-hidden divide-y divide-border/50">
        {enabled.map((id) => {
          const m = MODES[id];
          const Icon = MODE_ICONS[id];
          const isActive = id === activeModeId;
          const isPending = pendingId === id;
          return (
            <button
              key={id}
              type="button"
              disabled={updating}
              onClick={() => handleSwitch(id)}
              className={cn(
                'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors',
                isActive ? 'bg-primary/5' : 'hover:bg-muted/50',
              )}
            >
              <div className={cn('p-2 rounded-xl shrink-0', isActive ? 'bg-primary/15' : 'bg-muted')}>
                <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
              </div>
              <div className="flex-1 min-w-0">
                <span className={cn('font-medium text-sm', isActive && 'text-primary')}>{m.label}</span>
                <span className="text-[11px] text-muted-foreground truncate block">{m.terms.tagline}</span>
              </div>
              <div className="shrink-0">
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : isActive ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                    <Check className="h-3.5 w-3.5" /> Active
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">Switch</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Add another profession */}
      {addable.length > 0 && (
        <div className="rounded-2xl bg-card border border-dashed border-border/60 overflow-hidden divide-y divide-border/50">
          {addable.map((m) => {
            const Icon = MODE_ICONS[m.id];
            const isPending = pendingId === m.id;
            return (
              <button
                key={m.id}
                type="button"
                disabled={updating}
                onClick={() => handleAdd(m.id)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="p-2 rounded-xl bg-muted shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">Add {m.label}</span>
                  <span className="text-[11px] text-muted-foreground truncate block">{m.terms.tagline}</span>
                </div>
                <div className="shrink-0">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
