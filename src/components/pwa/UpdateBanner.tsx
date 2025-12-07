import { useVersionCheck } from "@/hooks/useVersionCheck";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UpdateBanner() {
  const { showUpdateBanner, dismissBanner, refreshApp } = useVersionCheck();

  if (!showUpdateBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4 flex items-center gap-3">
        <RefreshCw className="h-5 w-5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">A new version of NevorAI is available.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={refreshApp}
            className="text-xs px-3"
          >
            Refresh
          </Button>
          <button
            onClick={dismissBanner}
            className="p-1 hover:bg-primary-foreground/20 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
