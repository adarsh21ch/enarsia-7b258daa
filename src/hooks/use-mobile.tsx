import * as React from "react";

const MOBILE_BREAKPOINT = 768;

// Helper to get initial value synchronously (prevents flash)
function getInitialIsMobile(): boolean {
  if (typeof window === 'undefined') return true; // SSR: default to mobile (safer, less UI flash)
  return window.innerWidth < MOBILE_BREAKPOINT;
}

export function useIsMobile() {
  // Initialize with actual value to prevent flash of desktop UI on mobile
  const [isMobile, setIsMobile] = React.useState<boolean>(getInitialIsMobile);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    // Re-check on mount in case initial check was off
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
