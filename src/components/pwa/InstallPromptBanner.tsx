import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Share, Plus, MoreVertical, Download, Smartphone, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import nevoraLogo from '@/assets/nevorai-call-logo.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'ios-safari' | 'ios-chrome' | 'android-chrome' | 'desktop' | 'other';

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  if (isIOS) {
    // CriOS = Chrome on iOS, FxiOS = Firefox on iOS
    if (/CriOS|FxiOS|EdgiOS/.test(ua)) return 'ios-chrome';
    return 'ios-safari';
  }
  if (isAndroid) return 'android-chrome';
  if (/Mobile/.test(ua)) return 'other';
  return 'desktop';
}

const DISMISS_KEY = 'nvc-install-popup-dismissed-v2';

export function InstallPromptBanner() {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const platform = detectPlatform();

  // Only auto-show on public/auth routes — never inside the authed app
  const isPublicRoute = ['/', '/auth', '/reset-password'].includes(location.pathname);

  useEffect(() => {
    if (!isPublicRoute) return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari standalone flag
      // @ts-expect-error legacy iOS API
      window.navigator.standalone === true;
    if (isStandalone) return;

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const t = parseInt(dismissed, 10);
      if (Date.now() - t < 3 * 24 * 60 * 60 * 1000) return; // 3-day cooldown
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Show after a short delay so it doesn't fight the page paint
    const t = setTimeout(() => setOpen(true), 1200);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(t);
    };
  }, [isPublicRoute]);

  const dismiss = () => {
    setOpen(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  if (!isPublicRoute || !open) return null;

  return (
    <InstallInstructionsSheet
      open={open}
      onClose={dismiss}
      platform={platform}
      canNativeInstall={!!deferredPrompt}
      onNativeInstall={handleNativeInstall}
      dismissLabel="Maybe later"
    />
  );
}

export function InstallInstructionsSheet({
  open,
  onClose,
  platform: platformProp,
  canNativeInstall = false,
  onNativeInstall,
  dismissLabel = 'Close',
}: {
  open: boolean;
  onClose: () => void;
  platform?: Platform;
  canNativeInstall?: boolean;
  onNativeInstall?: () => void;
  dismissLabel?: string;
}) {
  const platform = platformProp ?? detectPlatform();
  if (!open) return null;
  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-foreground/30 backdrop-blur-sm animate-in fade-in duration-200"
      />
      <div
        role="dialog"
        aria-labelledby="install-title"
        className="fixed bottom-0 left-0 right-0 z-[61] mx-auto max-w-md rounded-t-3xl border border-border bg-card p-5 pb-7 shadow-2xl animate-in slide-in-from-bottom duration-300 safe-area-pb sm:bottom-4 sm:left-4 sm:right-4 sm:rounded-3xl"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/5 shadow-sm">
            <img src={nevoraLogo} alt="Nevorai Call" className="h-12 w-12 rounded-xl" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="install-title" className="text-base font-semibold text-foreground">
              Install Nevorai Call <span className="text-muted-foreground font-normal">(Add to Home Screen)</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              No app store, no download. Just add it to your home screen to open it like a real app.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <InstallSteps
            platform={platform}
            canNativeInstall={canNativeInstall}
            onNativeInstall={onNativeInstall ?? (() => {})}
          />
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {dismissLabel}
        </button>
      </div>
    </>
  );
}


function InstallSteps({
  platform,
  canNativeInstall,
  onNativeInstall,
}: {
  platform: Platform;
  canNativeInstall: boolean;
  onNativeInstall: () => void;
}) {
  if (canNativeInstall) {
    return (
      <>
        <Button onClick={onNativeInstall} className="w-full h-11 rounded-xl font-medium">
          <Download className="h-4 w-4 mr-2" />
          Add to Home Screen
        </Button>
        <p className="mt-2 text-[11px] text-muted-foreground text-center">
          Your browser will ask to add Nevorai Call to your home screen.
        </p>
      </>
    );
  }

  if (platform === 'ios-safari') {
    return (
      <Steps
        title="On iPhone — Safari"
        steps={[
          { icon: <Share className="h-4 w-4" />, text: 'Tap the Share button at the bottom of Safari' },
          { icon: <Plus className="h-4 w-4" />, text: 'Scroll down and tap "Add to Home Screen"' },
          { icon: <Smartphone className="h-4 w-4" />, text: 'Tap "Add" — the Nevorai Call icon appears on your home screen' },
        ]}
      />
    );
  }

  if (platform === 'ios-chrome') {
    return (
      <Steps
        title="On iPhone — Chrome"
        steps={[
          { icon: <Share className="h-4 w-4" />, text: 'Tap the Share icon in the address bar' },
          { icon: <Plus className="h-4 w-4" />, text: 'Tap "Add to Home Screen"' },
          { icon: <Smartphone className="h-4 w-4" />, text: 'Tip: for best results, open this page in Safari and add it from there' },
        ]}
      />
    );
  }

  if (platform === 'android-chrome') {
    return (
      <Steps
        title="On Android — Chrome"
        steps={[
          { icon: <MoreVertical className="h-4 w-4" />, text: 'Tap the three-dot menu (⋮) at the top right' },
          { icon: <Plus className="h-4 w-4" />, text: 'Tap "Add to Home screen"' },
          { icon: <Smartphone className="h-4 w-4" />, text: 'Confirm — the Nevorai Call icon appears on your home screen' },
        ]}
      />
    );
  }

  if (platform === 'desktop') {
    return (
      <Steps
        title="On desktop"
        steps={[
          { icon: <Download className="h-4 w-4" />, text: 'Click the "Add to Home Screen" icon in your browser address bar' },
          { icon: <Plus className="h-4 w-4" />, text: 'Or open the browser menu and choose "Add Nevorai Call to Home Screen"' },
        ]}
      />
    );
  }

  return (
    <Steps
      title="On your phone"
      steps={[
        { icon: <Share className="h-4 w-4" />, text: 'Open your browser menu — Share button on iPhone, three-dot menu (⋮) on Android' },
        { icon: <Plus className="h-4 w-4" />, text: 'Tap "Add to Home Screen"' },
        { icon: <Smartphone className="h-4 w-4" />, text: 'The Nevorai Call icon will appear on your home screen' },
      ]}
    />
  );
}

function Steps({ title, steps }: { title: string; steps: { icon: React.ReactNode; text: string }[] }) {
  return (
    <div className="rounded-2xl bg-muted/40 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {title}
      </p>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
              {s.icon}
            </span>
            <span className="text-sm leading-snug text-foreground">{s.text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
