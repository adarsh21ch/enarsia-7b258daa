import { useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';

import { MODES, BASE_MODE_ID, normalizeEnabledModes, type ModeId } from '@/config/modes';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Users, Clapperboard, Check, Loader2, ArrowRight, Sparkles } from 'lucide-react';

/** Icon per profession. */
const MODE_ICONS: Partial<Record<ModeId, ComponentType<{ className?: string }>>> = {
  network_marketing: Users,
  content_creator: Clapperboard,
};

/**
 * Profession picker for the Profile page.
 *
 * Network Marketing is the permanent home of the CRM. Content Creator is an
 * opt-in sub-section the user enters via "Open Content Studio" (it does NOT
 * replace the bottom nav). Founder and other disabled modes are not shown.
 */
export function ModeSwitcher() {
  const { profile, updateProfile, updating } = useProfile();
  const navigate = useNavigate();
  const [pendingId, setPendingId] = useState<ModeId | null>(null);

  const enabled = normalizeEnabledModes(profile?.enabled_modes);
  const creatorEnabled = enabled.includes('content_creator') && MODES.content_creator.enabled;

  const handleEnableCreator = async () => {
    if (updating) return;
    setPendingId('content_creator');
    const next = Array.from(new Set([...enabled, 'content_creator']));
    const { error } = await updateProfile({ enabled_modes: next });
    setPendingId(null);
    if (error) return toast.error('Could not enable Content Creator.');
    toast.success('Content Creator enabled');
    navigate('/creator');
  };

  const openStudio = () => navigate('/creator');

  const NmIcon = MODE_ICONS.network_marketing!;
  const CcIcon = MODE_ICONS.content_creator!;

  return (
    <div className="space-y-3">
      <p className="text-[11px] uppercase tracking-[1.2px] text-muted-foreground font-semibold pt-3 pb-1 px-1">
        Profession
      </p>

      {/* Network Marketing — permanent home */}
      <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
        <div className={cn('w-full px-4 py-3 flex items-center gap-3 bg-primary/5')}>
          <div className="p-2 rounded-xl shrink-0 bg-primary/15">
            <NmIcon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm text-primary block">{MODES[BASE_MODE_ID].label}</span>
            <span className="text-[11px] text-muted-foreground truncate block">{MODES[BASE_MODE_ID].terms.tagline}</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary shrink-0">
            <Check className="h-3.5 w-3.5" /> Home
          </span>
        </div>
      </div>

      {/* Content Creator — opt-in sub-section */}
      {MODES.content_creator.enabled && (
        <div className="rounded-2xl bg-gradient-to-br from-fuchsia-500/10 via-card to-amber-400/10 border border-border/60 overflow-hidden">
          <div className="w-full px-4 py-3 flex items-center gap-3">
            <div className="p-2 rounded-xl shrink-0 bg-gradient-to-br from-fuchsia-500/20 to-amber-400/20">
              <CcIcon className="h-4 w-4 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm block flex items-center gap-1.5">
                {MODES.content_creator.label}
                {creatorEnabled && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                    <Sparkles className="h-2.5 w-2.5" /> On
                  </span>
                )}
              </span>
              <span className="text-[11px] text-muted-foreground truncate block">
                {MODES.content_creator.terms.tagline}
              </span>
            </div>
            {creatorEnabled ? (
              <button
                type="button"
                onClick={openStudio}
                className="shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                Open Studio <ArrowRight className="h-3 w-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEnableCreator}
                disabled={updating}
                className="shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {pendingId === 'content_creator' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Enable'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
