import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageCircle, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  openWhatsAppWith,
  setWhatsAppPreference,
  type WhatsAppApp,
} from '@/lib/whatsappPreference';

type Pending = { phone: string; message?: string } | null;
type Choice = 'whatsapp' | 'whatsapp_business';

/**
 * Mount once near the app root. Listens for `enarsia:whatsapp-open-request`
 * events and prompts the user to pick WhatsApp vs WhatsApp Business.
 */
export function WhatsAppChoiceProvider() {
  const [pending, setPending] = useState<Pending>(null);
  const [choice, setChoice] = useState<Choice>('whatsapp');
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ phone: string; message?: string }>;
      if (!ev.detail?.phone) return;
      setChoice('whatsapp');
      setRemember(true);
      setPending(ev.detail);
    };
    window.addEventListener('enarsia:whatsapp-open-request', handler);
    return () => window.removeEventListener('enarsia:whatsapp-open-request', handler);
  }, []);

  const close = () => setPending(null);

  const confirm = () => {
    if (!pending) return;
    if (remember) setWhatsAppPreference(choice as WhatsAppApp);
    const { phone, message } = pending;
    close();
    // Defer to next tick so the dialog can unmount cleanly before navigating away.
    setTimeout(() => openWhatsAppWith(choice, phone, message), 50);
  };

  return (
    <Dialog open={!!pending} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">Open with</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Which WhatsApp app should we use to send this message?
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 py-2">
          <button
            type="button"
            onClick={() => setChoice('whatsapp')}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
              choice === 'whatsapp'
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-border hover:border-emerald-500/40'
            )}
          >
            <MessageCircle className="h-7 w-7 text-emerald-600" />
            <span className="text-sm font-medium">WhatsApp</span>
            <span className="text-[10px] text-muted-foreground">Personal</span>
          </button>

          <button
            type="button"
            onClick={() => setChoice('whatsapp_business')}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
              choice === 'whatsapp_business'
                ? 'border-emerald-700 bg-emerald-700/10'
                : 'border-border hover:border-emerald-700/40'
            )}
          >
            <Briefcase className="h-7 w-7 text-emerald-800 dark:text-emerald-500" />
            <span className="text-sm font-medium">WA Business</span>
            <span className="text-[10px] text-muted-foreground">Business app</span>
          </button>
        </div>

        <label className="flex items-center gap-2 px-1 cursor-pointer select-none">
          <Checkbox
            checked={remember}
            onCheckedChange={(v) => setRemember(!!v)}
          />
          <span className="text-xs text-foreground">Remember my decision</span>
        </label>

        <DialogFooter className="flex gap-2 sm:gap-2 pt-2">
          <Button variant="ghost" onClick={close} className="flex-1">
            Cancel
          </Button>
          <Button onClick={confirm} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
            Confirm & Open
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
