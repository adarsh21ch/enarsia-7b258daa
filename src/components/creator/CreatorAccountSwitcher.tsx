import { useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { Instagram, Youtube, Plus, ChevronDown, Check, Loader2, AtSign, Users, Clapperboard, Rocket } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useContentAccounts, type ContentAccount } from '@/hooks/useContentAccounts';
import { useCreatorAccount } from '@/contexts/CreatorAccountContext';
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

function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  if (platform === 'youtube') return <Youtube className={className} />;
  return <Instagram className={className} />;
}

/**
 * Mode + Account switcher used in Content Creator tab headers.
 * Trigger shows the current mode. Sheet has:
 *   1) Switch Mode — enrolled modes (writes profiles.mode, routes to that mode's first nav).
 *   2) Account — only when active mode is Content Creator; switches active IG/YT account.
 */
export function CreatorAccountSwitcher() {
  const { accounts, isLoading, createAccount, creating } = useContentAccounts();
  const { activeAccountId, setActiveAccountId } = useCreatorAccount();
  const { profile, updateProfile, updating } = useProfile();
  const { modeId: activeModeId } = useMode();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<ModeId | null>(null);

  const [platform, setPlatform] = useState<'instagram' | 'youtube'>('instagram');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [url, setUrl] = useState('');

  // Modes the user is enrolled in AND that are live.
  const enabledIds = normalizeEnabledModes(profile?.enabled_modes);
  const liveIds = new Set(getEnabledModes().map((m) => m.id));
  const modeList = enabledIds.filter((id) => liveIds.has(id));

  const activeMode = getMode(activeModeId);
  const isCreator = activeModeId === 'content_creator';

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

  const handleAdd = async () => {
    if (!name.trim()) return;
    const created = await createAccount({ platform, name, username, url });
    setActiveAccountId(created.id);
    setName(''); setUsername(''); setUrl('');
    setAddOpen(false);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/60 hover:bg-muted border border-border/50 transition-colors max-w-[180px]"
        >
          <span className="text-xs font-semibold truncate">{activeMode.label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Switch mode</SheetTitle>
        </SheetHeader>

        {/* Section 1 — Modes */}
        <div className="mt-4 space-y-1.5">
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
                  'w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left',
                  isActive ? 'border-primary bg-primary/5' : 'border-border/50 hover:bg-muted/50',
                )}
              >
                <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', isActive ? 'bg-primary/15' : 'bg-muted')}>
                  <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold truncate', isActive && 'text-primary')}>{m.label}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{m.terms.tagline}</p>
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

        {/* Section 2 — Accounts (Content Creator only) */}
        {isCreator && (
          <>
            <div className="my-4 h-px bg-border/60" />
            <p className="text-[11px] uppercase tracking-[1.2px] text-muted-foreground font-semibold px-1 mb-2">
              Account
            </p>

            <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No accounts yet. Add your first one below.</p>
              ) : (
                accounts.map((a: ContentAccount) => {
                  const isActive = a.id === activeAccountId;
                  return (
                    <button
                      key={a.id}
                      onClick={() => { setActiveAccountId(a.id); setOpen(false); }}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left',
                        isActive ? 'border-primary bg-primary/5' : 'border-border/50 hover:bg-muted/50',
                      )}
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <PlatformIcon platform={a.platform} className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{a.name}</p>
                        {a.username && (
                          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-0.5">
                            <AtSign className="h-2.5 w-2.5" />{a.username.replace(/^@/, '')}
                          </p>
                        )}
                      </div>
                      {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            {!addOpen ? (
              <Button onClick={() => setAddOpen(true)} variant="outline" className="w-full mt-3">
                <Plus className="h-4 w-4 mr-1.5" /> Add account
              </Button>
            ) : (
              <div className="mt-3 space-y-3 rounded-xl border border-border/50 p-3">
                <div className="flex gap-2">
                  {(['instagram', 'youtube'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold capitalize',
                        platform === p ? 'border-primary bg-primary/10 text-primary' : 'border-border/50',
                      )}
                    >
                      <PlatformIcon platform={p} className="h-3.5 w-3.5" />
                      {p}
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Account name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My main account" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Username (optional)</Label>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="yourhandle" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Profile URL (optional)</Label>
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://instagram.com/yourhandle" />
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={handleAdd} disabled={!name.trim() || creating}>
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
