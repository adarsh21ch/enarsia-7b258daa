import { useState, useEffect, useCallback } from "react";
import { APP_VERSION, VERSION_STORAGE_KEY } from "@/config/appVersion";

function isPwaUpdateCapableContext() {
  const hostname = window.location.hostname;

  return (
    import.meta.env.PROD &&
    window.self === window.top &&
    !hostname.startsWith("id-preview--") &&
    !hostname.startsWith("preview--") &&
    hostname !== "lovableproject.com" &&
    !hostname.endsWith(".lovableproject.com") &&
    hostname !== "lovableproject-dev.com" &&
    !hostname.endsWith(".lovableproject-dev.com") &&
    hostname !== "beta.lovable.dev" &&
    !hostname.endsWith(".beta.lovable.dev")
  );
}

export function useVersionCheck() {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false);

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem(VERSION_STORAGE_KEY);

    if (!lastSeenVersion) {
      // First time user - set current version silently
      localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION);
      return;
    }

    if (lastSeenVersion !== APP_VERSION && APP_VERSION > lastSeenVersion) {
      // New version available
      setShowUpdateBanner(true);
    }
  }, []);

  // Check for service worker updates
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !isPwaUpdateCapableContext()) return;

    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          // Check for updates
          if (registration.installing || registration.waiting || registration.active) {
            await registration.update();
          }
          
          // Listen for new service worker
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // New content available
                  setSwUpdateAvailable(true);
                  setShowUpdateBanner(true);
                }
              });
            }
          });

          // Check if there's already a waiting worker
          if (registration.waiting) {
            setSwUpdateAvailable(true);
            setShowUpdateBanner(true);
          }
        }
      } catch (error) {
        console.error("Service worker update check failed:", error);
      }
    };

    checkForUpdates();

    // Check for updates periodically (every 5 minutes)
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);

    // Also check when the app becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdates();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const dismissBanner = useCallback(() => {
    setShowUpdateBanner(false);
    // Don't update localStorage - banner will show again next session
  }, []);

  const refreshApp = useCallback(async () => {
    // Update localStorage first
    localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION);

    // Check for waiting service worker
    if ("serviceWorker" in navigator && isPwaUpdateCapableContext()) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration?.waiting) {
          // Tell the waiting service worker to activate
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
          
          // Wait a moment for the new SW to take over
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error("Service worker update failed:", error);
      }
    }

    // Hard reload the page to get fresh content
    window.location.reload();
  }, []);

  return {
    showUpdateBanner: showUpdateBanner || swUpdateAvailable,
    dismissBanner,
    refreshApp,
    currentVersion: APP_VERSION,
  };
}