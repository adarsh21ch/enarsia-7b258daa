import { useState, useEffect, useCallback } from "react";
import { APP_VERSION, VERSION_STORAGE_KEY } from "@/config/appVersion";

export function useVersionCheck() {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

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

  const dismissBanner = useCallback(() => {
    setShowUpdateBanner(false);
    // Don't update localStorage - banner will show again next session
  }, []);

  const refreshApp = useCallback(async () => {
    // Update localStorage first
    localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION);

    // Check for waiting service worker
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration?.waiting) {
          // Tell the waiting service worker to activate
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
          
          // Wait a moment for the new SW to take over
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error("Service worker update failed:", error);
      }
    }

    // Hard reload the page
    window.location.reload();
  }, []);

  return {
    showUpdateBanner,
    dismissBanner,
    refreshApp,
    currentVersion: APP_VERSION,
  };
}
