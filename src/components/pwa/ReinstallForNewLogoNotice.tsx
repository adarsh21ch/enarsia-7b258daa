import { useEffect, useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import nevoraLogo from '@/assets/nevorai-call-logo.png';

const ACK_KEY = 'nvc-new-logo-notice-ack-v1';

/**
 * One-time notice for users who already installed the previous PWA.
 * iOS/Android cache the home-screen icon at install time — the only way
 * to refresh the icon to the new Enarsia teal logo is to remove
 * the old icon and re-add the app to the home screen.
 */
export function ReinstallForNewLogoNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error legacy iOS API
      window.navigator.standalone === true;
    if (!isStandalone) return;

    if (localStorage.getItem(ACK_KEY)) return;
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    localStorage.setItem(ACK_KEY, '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[55] mx-auto max-w-md rounded-2xl border border-border bg-card shadow-2xl p-4 animate-in slide-in-from-bottom duration-300 safe-area-pb">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2.5 top-2.5 rounded-full p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <img src={nevoraLogo} alt="" className="h-11 w-11 rounded-xl flex-shrink-0 shadow-sm" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5 text-primary" />
            New logo &amp; theme available
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            We refreshed Enarsia. To get the new home-screen icon, please remove the old app
            from your home screen and add it back via your browser&apos;s &ldquo;Add to Home Screen&rdquo;.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={dismiss} className="h-8 px-3 text-xs rounded-lg">
              Got it
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
