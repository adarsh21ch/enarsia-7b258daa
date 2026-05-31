import { useState } from 'react';
import { Instagram, Youtube, Plus, ChevronDown, Check, Loader2, AtSign } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useContentAccounts, type ContentAccount } from '@/hooks/useContentAccounts';
import { useCreatorAccount } from '@/contexts/CreatorAccountContext';
import { cn } from '@/lib/utils';

/**
 * Top-right account switcher for Content Creator tabs.
 * Mode switching lives in Profile — this is account-only.
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
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
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Switch account</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-1.5 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No accounts yet. Add your first one below.</p>
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
          <Button onClick={() => setAddOpen(true)} variant="outline" className="w-full mt-4">
            <Plus className="h-4 w-4 mr-1.5" /> Add account
          </Button>
        ) : (
          <div className="mt-4 space-y-3 rounded-xl border border-border/50 p-3">
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
      </SheetContent>
    </Sheet>
  );
}
