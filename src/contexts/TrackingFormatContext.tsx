import React, { createContext, useContext, useCallback } from 'react';
import { useTrackingFormat, TrackingTag, TrackingFormat } from '@/hooks/useTrackingFormat';
import { toast } from 'sonner';

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
  // Helper to handle target completion
  handleTargetComplete: (tagName: string, prospectName?: string) => void;
  // Get all options for dropdowns (tracking + custom)
  getDropdownOptions: () => string[];
}

const TrackingFormatContext = createContext<TrackingFormatContextType | null>(null);

export function TrackingFormatProvider({ children }: { children: React.ReactNode }) {
  const trackingFormatHook = useTrackingFormat();

  // Handle target completion when final tag is selected
  const handleTargetComplete = useCallback((tagName: string, prospectName?: string) => {
    if (trackingFormatHook.isFinalTarget(tagName)) {
      toast.success(`🎯 Target Complete! ${prospectName ? `(${prospectName})` : ''}`, {
        duration: 2000,
      });
      // Future: increment target counter in database
    }
  }, [trackingFormatHook.isFinalTarget]);

  // Get all options for dropdowns
  const getDropdownOptions = useCallback(() => {
    const tracking = trackingFormatHook.trackingTagNames || [];
    const nonTracking = trackingFormatHook.nonTrackingTags || [];
    return [...tracking, ...nonTracking];
  }, [trackingFormatHook.trackingTagNames, trackingFormatHook.nonTrackingTags]);

  const value: TrackingFormatContextType = {
    ...trackingFormatHook,
    handleTargetComplete,
    getDropdownOptions,
  };

  return (
    <TrackingFormatContext.Provider value={value}>
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
