import React, { createContext, useContext } from 'react';
import { useTrackingFormat, TrackingTag, TrackingFormat } from '@/hooks/useTrackingFormat';

interface TrackingFormatContextType {
  trackingFormat: TrackingFormat | null;
  loading: boolean;
  refreshFormat: () => void;
  trackingTagNames: string[];
  nonTrackingTags: string[];
  finalTargetTag: string | null;
  isFinalTarget: (tagName: string) => boolean;
  isTrackingTag: (tagName: string) => boolean;
  levels: { id: string; label: string; code?: string; isDefault: boolean }[];
  isRootLeader: boolean;
  isUsingLeaderFormat: boolean;
  rootLeaderName: string | null;
}

const TrackingFormatContext = createContext<TrackingFormatContextType | null>(null);

export function TrackingFormatProvider({ children }: { children: React.ReactNode }) {
  const trackingFormatHook = useTrackingFormat();

  return (
    <TrackingFormatContext.Provider value={trackingFormatHook}>
      {children}
    </TrackingFormatContext.Provider>
  );
}

export function useTrackingFormatContext() {
  const context = useContext(TrackingFormatContext);
  if (!context) {
    throw new Error('useTrackingFormatContext must be used within a TrackingFormatProvider');
  }
  return context;
}
