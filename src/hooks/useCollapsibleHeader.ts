import { useState, useRef, useCallback, useEffect } from 'react';

const SCROLL_THRESHOLD = 30; // Minimum scroll before toggling

export function useCollapsibleHeader() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const currentScrollY = container.scrollTop;
    const diff = currentScrollY - lastScrollY.current;

    // Only toggle if scroll threshold exceeded
    if (Math.abs(diff) < SCROLL_THRESHOLD) return;

    if (diff > 0 && currentScrollY > 50) {
      // Scrolling DOWN - collapse
      setIsCollapsed(true);
    } else if (diff < 0) {
      // Scrolling UP - expand
      setIsCollapsed(false);
    }

    lastScrollY.current = currentScrollY;
  }, []);

  // Attach scroll listener to the container
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const expandHeader = useCallback(() => {
    setIsCollapsed(false);
  }, []);

  return {
    isCollapsed,
    scrollContainerRef,
    expandHeader,
  };
}
