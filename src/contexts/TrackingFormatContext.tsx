import React, { createContext, useContext, useCallback } from 'react';
import { useTrackingFormat, TrackingTag, StageTag, TeamLevel, TrackingFormat } from '@/hooks/useTrackingFormat';
import { toast } from 'sonner';

interface TrackingFormatContextType {
  trackingFormat: TrackingFormat | null;
  loading: boolean;
  refreshFormat: () => void;
  
  // Leads (Response) tags
  leadsTrackingTags: TrackingTag[];
  leadsNonTrackingTags: string[];
  leadsTrackingTagNames: string[];
  leadsFinalTargetTag: string | null;
  isLeadsFinalTarget: (tagName: string) => boolean;
  isLeadsTrackingTag: (tagName: string) => boolean;
  
  // Stage tags
  stageTags: StageTag[];
  stageNonTrackingTags: string[];
  stageTagNames: string[];
  stageFinalTargetTag: string | null;
  isStageFinalTarget: (tagName: string) => boolean;
  isStageTag: (tagName: string) => boolean;
  
  // Team levels
  levels: TeamLevel[];
  
  // Separate personal tags (for UI display)
  leaderLeadsPersonalTags: string[];
  leaderStagePersonalTags: string[];
  ownLeadsPersonalTags: string[];
  ownStagePersonalTags: string[];
  
  // Metadata
  isRootLeader: boolean;
  isUsingLeaderFormat: boolean;
  rootLeaderName: string | null;
  
  // Legacy aliases
  trackingTagNames: string[];
  nonTrackingTags: string[];
  finalTargetTag: string | null;
  isFinalTarget: (tagName: string) => boolean;
  isTrackingTag: (tagName: string) => boolean;
  
  // Filter tag helpers (used for Funnel tab)
  leadsStageTag: string | null;
  isLeadsStageTag: (tagName: string) => boolean;
  // Legacy aliases for backward compatibility
  leadsFilterTag: string | null;
  isLeadsFilterTag: (tagName: string) => boolean;
  
  // Helpers
  handleTargetComplete: (tagName: string, prospectName?: string) => void;
  getLeadsDropdownOptions: () => string[];
  getStageDropdownOptions: () => string[];
}

const TrackingFormatContext = createContext<TrackingFormatContextType | null>(null);

export function TrackingFormatProvider({ children }: { children: React.ReactNode }) {
  const trackingFormatHook = useTrackingFormat();

  // Get the filter tag from leader's format (for Funnel tab)
  const leadsStageTag = trackingFormatHook.trackingFormat?.leadsTrackingTags.find(t => t.isStageTag)?.name || null;

  const isLeadsStageTag = useCallback((tagName: string) => {
    return trackingFormatHook.trackingFormat?.leadsTrackingTags.find(t => t.name === tagName)?.isStageTag || false;
  }, [trackingFormatHook.trackingFormat]);

  // Handle target completion when final tag is selected
  const handleTargetComplete = useCallback((tagName: string, prospectName?: string) => {
    if (trackingFormatHook.isLeadsFinalTarget(tagName)) {
      toast.success(`🎯 Target Complete! ${prospectName ? `(${prospectName})` : ''}`, {
        duration: 2000,
      });
    } else if (trackingFormatHook.isStageFinalTarget(tagName)) {
      toast.success(`🏆 Final Stage Reached! ${prospectName ? `(${prospectName})` : ''}`, {
        duration: 2000,
      });
    }
  }, [trackingFormatHook.isLeadsFinalTarget, trackingFormatHook.isStageFinalTarget]);

  // Get Leads dropdown options (tracking + non-tracking)
  const getLeadsDropdownOptions = useCallback(() => {
    const tracking = trackingFormatHook.leadsTrackingTagNames || [];
    const nonTracking = trackingFormatHook.leadsNonTrackingTags || [];
    return [...tracking, ...nonTracking];
  }, [trackingFormatHook.leadsTrackingTagNames, trackingFormatHook.leadsNonTrackingTags]);

  // Get Stage dropdown options (tracking + non-tracking)
  const getStageDropdownOptions = useCallback(() => {
    const stages = trackingFormatHook.stageTagNames || [];
    const nonTracking = trackingFormatHook.stageNonTrackingTags || [];
    return [...stages, ...nonTracking];
  }, [trackingFormatHook.stageTagNames, trackingFormatHook.stageNonTrackingTags]);

  const value: TrackingFormatContextType = {
    ...trackingFormatHook,
    leadsStageTag,
    isLeadsStageTag,
    // Keep old names for backward compatibility
    leadsFilterTag: leadsStageTag,
    isLeadsFilterTag: isLeadsStageTag,
    handleTargetComplete,
    getLeadsDropdownOptions,
    getStageDropdownOptions,
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
