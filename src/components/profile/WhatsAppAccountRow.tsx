import { useEffect, useState } from 'react';
import { MessageCircle, ChevronRight, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getWhatsAppPreference,
  setWhatsAppPreference,
  clearWhatsAppPreference,
  type WhatsAppApp,
} from '@/lib/whatsappPreference';
import { toast } from 'sonner';

const LABELS: Record<WhatsAppApp, string> = {
  ask: 'Ask every time',
  whatsapp: 'WhatsApp (Personal)',
  whatsapp_business: 'WhatsApp Business',
};

export function WhatsAppAccountRow() {
  const [pref, setPref] = useState<WhatsAppApp>(getWhatsAppPreference());
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<WhatsAppApp>(pref);

  useEffect(() => {
    const onChange = (e: Event) => {
      const ev = e as CustomEvent<WhatsAppApp>;
      setPref(ev.detail || getWhatsAppPreference());
    };
    window.addEventListener('enarsia:whatsapp-pref-changed', onChange);
    return () => window.removeEventListener('enarsia:whatsapp-pref-changed', onChange);
  }, []);

  const openDialog = () => {
    setDraft(pref);
    setOpen(true);
  };

  const save = () => {
    if (draft === 'ask') clearWhatsAppPreference();
    else setWhatsAppPreference(draft);
    setPref(draft);
    setOpen(false);
    toast.success('WhatsApp account updated');
  };

  return (
    <>
      <button
        onClick={openDialog}
        className="w-full rounded-xl px-4 py-2.5 bg-card border border-border/50 flex items-center justify-between transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-2.5">
          <MessageCircle className="h-4 w-4 text-emerald-600" />
          <div className="flex flex-col items-start">
            <span className="font-medium text-sm">WhatsApp Account</span>
            <span className="text-[11px] text-muted-foreground">{LABELS[pref]}</span>
          </div>
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Choose WhatsApp Account</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Pick which app to use when sending WhatsApp messages from Enarsia.
            </p>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {(['whatsapp', 'whatsapp_business', 'ask'] as WhatsAppApp[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setDraft(opt)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left',
                  draft === opt
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-border hover:border-emerald-500/40'
                )}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{LABELS[opt]}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {opt === 'ask' && 'Show the picker before each message'}
                    {opt === 'whatsapp' && 'Open the personal WhatsApp app'}
                    {opt === 'whatsapp_business' && 'Open the WhatsApp Business app'}
                  </span>
                </div>
                {draft === opt && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
              </button>
            ))}
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={save} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
