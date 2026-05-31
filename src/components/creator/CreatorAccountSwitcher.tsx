import { useState } from 'react';
import { Instagram, Youtube, Plus, ChevronDown, Check, Loader2, AtSign } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useContentAccounts, type ContentAccount } from '@/hooks/useContentAccounts';
import { useCreatorAccount } from '@/contexts/CreatorAccountContext';
import { cn } from '@/lib/utils';

/**
 * Top-right account switcher for Content Creator tabs.
 * Top-anchored popover — opens directly under the trigger.
 * Mode switching lives in Profile.
 */
function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  if (platform === 'youtube') return <Youtube className={className} />;
  return <Instagram className={className} />;
}

export function CreatorAccountSwitcher() {
  const { accounts, isLoading, createAccount, creating } = useContentAccounts();
  const { activeAccountId, setActiveAccountId } = useCreatorAccount();
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const [platform, setPlatform] = useState<'instagram' | 'youtube'>('instagram');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [url, setUrl] = useState('');

  const active = accounts.find((a) => a.id === activeAccountId) || null;

  const handleAdd = async () => {
    if (!name.trim()) return;
    const created = await createAccount({ platform, name, username, url });
    setActiveAccountId(created.id);
    setName(''); setUsername(''); setUrl('');
    setAddOpen(false);
    setOpen(false);
  };

  const triggerLabel = active?.username || active?.name || (accounts.length === 0 ? 'Add Account' : 'Select');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/60 hover:bg-muted border border-border/50 transition-colors max-w-[180px]"
        >
          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <PlatformIcon platform={active?.platform || 'instagram'} className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-xs font-semibold truncate">
            {active?.username ? `@${active.username.replace(/^@/, '')}` : triggerLabel}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-72 p-3 rounded-xl">
        <p className="text-[10px] uppercase tracking-[1.2px] text-muted-foreground font-semibold px-1 pb-2">
          Switch account
        </p>

        <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : accounts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No accounts yet. Add your first one below.</p>
          ) : (
            accounts.map((a: ContentAccount) => {
              const isActive = a.id === activeAccountId;
              return (
                <button
                  key={a.id}
                  onClick={() => { setActiveAccountId(a.id); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-2.5 p-2 rounded-lg border transition-colors text-left',
                    isActive ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/60',
                  )}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <PlatformIcon platform={a.platform} className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{a.name}</p>
                    {a.username && (
                      <p className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5">
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
          <Button onClick={() => setAddOpen(true)} variant="outline" size="sm" className="w-full mt-3 h-8 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add account
          </Button>
        ) : (
          <div className="mt-3 space-y-2 rounded-lg border border-border/50 p-2.5">
            <div className="flex gap-1.5">
              {(['instagram', 'youtube'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border text-[11px] font-semibold capitalize',
                    platform === p ? 'border-primary bg-primary/10 text-primary' : 'border-border/50',
                  )}
                >
                  <PlatformIcon platform={p} className="h-3 w-3" />
                  {p}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Account name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My main account" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Username (optional)</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="yourhandle" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Profile URL (optional)</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://instagram.com/yourhandle" className="h-8 text-xs" />
            </div>
            <div className="flex gap-1.5">
              <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleAdd} disabled={!name.trim() || creating}>
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
