import { useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Check, Loader2, Users, Clapperboard, Rocket } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useProfile } from '@/hooks/useProfile';
import { useMode } from '@/hooks/useMode';
import { getEnabledModes, getMode, MODES, normalizeEnabledModes, type ModeId } from '@/config/modes';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MODE_ICONS: Record<ModeId, ComponentType<{ className?: string }>> = {
  network_marketing: Users,
  content_creator: Clapperboard,
  founder: Rocket,
};

/**
 * Mode switcher — top-anchored popover.
 * Account switching intentionally hidden for now (will return later).
 */
export function CreatorAccountSwitcher() {
  const { profile, updateProfile, updating } = useProfile();
  const { modeId: activeModeId } = useMode();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<ModeId | null>(null);

  const enabledIds = normalizeEnabledModes(profile?.enabled_modes);
  const liveIds = new Set(getEnabledModes().map((m) => m.id));
  const modeList = enabledIds.filter((id) => liveIds.has(id));

  const activeMode = getMode(activeModeId);

  const handleSwitchMode = async (id: ModeId) => {
    if (id === activeModeId || updating) return;
    setPendingMode(id);
    const { error } = await updateProfile({ mode: id });
    setPendingMode(null);
    if (error) {
      toast.error('Could not switch mode.');
      return;
    }
    toast.success(`Switched to ${MODES[id].label}`);
    setOpen(false);
    const firstPath = MODES[id].nav[0]?.path;
    if (firstPath) navigate(firstPath);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/60 hover:bg-muted border border-border/50 transition-colors max-w-[180px]"
        >
          <span className="text-xs font-semibold truncate">{activeMode.label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-64 p-2 rounded-xl">
        <p className="text-[10px] uppercase tracking-[1.2px] text-muted-foreground font-semibold px-2 pt-1 pb-2">
          Switch mode
        </p>
        <div className="space-y-1">
          {modeList.map((id) => {
            const m = MODES[id];
            const Icon = MODE_ICONS[id];
            const isActive = id === activeModeId;
            const isPending = pendingMode === id;
            return (
              <button
                key={id}
                type="button"
                disabled={updating}
                onClick={() => handleSwitchMode(id)}
                className={cn(
                  'w-full flex items-center gap-2.5 p-2 rounded-lg border transition-colors text-left',
                  isActive ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/60',
                )}
              >
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', isActive ? 'bg-primary/15' : 'bg-muted')}>
                  <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold truncate', isActive && 'text-primary')}>{m.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{m.terms.tagline}</p>
                </div>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                ) : isActive ? (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                ) : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
