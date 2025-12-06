import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed the banner
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check for iOS (no beforeinstallprompt event)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS && !window.matchMedia('(display-mode: standalone)').matches) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (isInstalled || !showBanner) {
    return null;
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className={cn(
      "fixed bottom-20 left-4 right-4 z-50",
      "bg-gradient-to-r from-primary to-blue-500 text-primary-foreground",
      "rounded-xl shadow-lg p-4",
      "animate-slide-up"
    )}>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 p-2 bg-white/20 rounded-lg">
          <Smartphone className="h-6 w-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Install NevorAI</h3>
          <p className="text-xs opacity-90 mt-0.5">
            {isIOS 
              ? "Tap Share, then 'Add to Home Screen'" 
              : "Add to home screen for quick access"
            }
          </p>
        </div>
        
        {!isIOS && (
          <Button
            onClick={handleInstall}
            size="sm"
            variant="secondary"
            className="flex-shrink-0 bg-white text-primary hover:bg-white/90"
          >
            <Download className="h-4 w-4 mr-1" />
            Install
          </Button>
        )}
      </div>
    </div>
  );
}
