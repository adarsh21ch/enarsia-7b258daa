import { useMemo, useCallback } from 'react';
import { useLifetimeLeadLimit } from './useLifetimeLeadLimit';
import { useAdminConfig } from './useAdminConfig';

/**
 * Default progressive upgrade nudge thresholds.
 * These are overridden by values from admin_usage_limits table.
 */
export const NUDGE_THRESHOLDS = {
  /** Stage 1: Soft informational banner, show once per session */
  STAGE_1: 100,
  /** Stage 2: Highlighted banner, show max once per day */
  STAGE_2: 150,
  /** Stage 3: Sticky banner, always visible on Calling tab */
  STAGE_3: 190,
  /** Stage 4: Hard limit, one-time blocking modal */
  STAGE_4: 200,
} as const;

/** Session storage keys for tracking nudge dismissals */
const SESSION_KEYS = {
  STAGE_1_DISMISSED: 'nudge_stage1_dismissed_session',
  LIMIT_MODAL_SHOWN: 'nudge_limit_modal_shown_session',
} as const;

/** Local storage keys for tracking daily nudge dismissals */
const STORAGE_KEYS = {
  STAGE_2_DISMISSED_DATE: 'nudge_stage2_dismissed_date',
} as const;

export type NudgeStage = 'none' | 'stage1' | 'stage2' | 'stage3' | 'stage4';

/**
 * Hook to manage progressive upgrade nudges based on lifetime lead count.
 * Now reads thresholds dynamically from admin_usage_limits table.
 */
export function useUpgradeNudge() {
  const { lifetimeCount, isPaid, isAtLimit, isLoading } = useLifetimeLeadLimit();
  const { config, loading: configLoading } = useAdminConfig();

  // Get dynamic thresholds from admin config with fallbacks
  const thresholds = useMemo(() => ({
    STAGE_1: config.limits.warning_threshold_1 ?? NUDGE_THRESHOLDS.STAGE_1,
    STAGE_2: config.limits.warning_threshold_2 ?? NUDGE_THRESHOLDS.STAGE_2,
    STAGE_3: config.limits.warning_threshold_3 ?? NUDGE_THRESHOLDS.STAGE_3,
    STAGE_4: config.limits.hard_limit ?? config.limits.free_total_leads ?? NUDGE_THRESHOLDS.STAGE_4,
  }), [config.limits]);

  /**
   * Determine the current nudge stage based on prospect count.
   */
  const currentStage = useMemo((): NudgeStage => {
    // Don't show any nudges while still loading subscription status
    if (isLoading || configLoading) return 'none';
    if (isPaid) return 'none';
    
    // If lead limits are disabled by admin, no nudges
    const totalLimitEnabled = config.limits_enabled?.free_total_leads !== false;
    const hardLimitEnabled = config.limits_enabled?.hard_limit !== false;
    if (!totalLimitEnabled && !hardLimitEnabled) return 'none';
    
    if (lifetimeCount >= thresholds.STAGE_4) return 'stage4';
    if (lifetimeCount >= thresholds.STAGE_3) return 'stage3';
    if (lifetimeCount >= thresholds.STAGE_2) return 'stage2';
    if (lifetimeCount >= thresholds.STAGE_1) return 'stage1';
    
    return 'none';
  }, [lifetimeCount, isPaid, isLoading, configLoading, thresholds, config.limits_enabled]);

  /**
   * Check if Stage 1 banner should be shown.
   * Only shows once per session.
   */
  const shouldShowStage1 = useMemo(() => {
    if (currentStage !== 'stage1') return false;
    
    // Check if already dismissed this session
    try {
      return sessionStorage.getItem(SESSION_KEYS.STAGE_1_DISMISSED) !== 'true';
    } catch {
      return true;
    }
  }, [currentStage]);

  /**
   * Check if Stage 2 banner should be shown.
   * Only shows max once per day.
   */
  const shouldShowStage2 = useMemo(() => {
    if (currentStage !== 'stage2') return false;
    
    try {
      const dismissedDate = localStorage.getItem(STORAGE_KEYS.STAGE_2_DISMISSED_DATE);
      if (!dismissedDate) return true;
      
      const today = new Date().toISOString().split('T')[0];
      return dismissedDate !== today;
    } catch {
      return true;
    }
  }, [currentStage]);

  /**
   * Stage 3 is sticky - always shows when on Calling tab.
   */
  const shouldShowStage3 = useMemo(() => {
    return currentStage === 'stage3';
  }, [currentStage]);

  /**
   * Check if the limit modal should be shown.
   * Only shows once per session at hard limit.
   */
  const shouldShowLimitModal = useMemo(() => {
    if (currentStage !== 'stage4') return false;
    
    try {
      return sessionStorage.getItem(SESSION_KEYS.LIMIT_MODAL_SHOWN) !== 'true';
    } catch {
      return true;
    }
  }, [currentStage]);

  /**
   * Dismiss Stage 1 banner for this session.
   */
  const dismissStage1 = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_KEYS.STAGE_1_DISMISSED, 'true');
    } catch {
      // Ignore storage errors
    }
  }, []);

  /**
   * Dismiss Stage 2 banner for today.
   */
  const dismissStage2 = useCallback(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem(STORAGE_KEYS.STAGE_2_DISMISSED_DATE, today);
    } catch {
      // Ignore storage errors
    }
  }, []);

  /**
   * Mark limit modal as shown for this session.
   */
  const markLimitModalShown = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_KEYS.LIMIT_MODAL_SHOWN, 'true');
    } catch {
      // Ignore storage errors
    }
  }, []);

  /**
   * Get remaining prospects until next threshold or limit.
   */
  const remainingToLimit = useMemo(() => {
    return Math.max(0, thresholds.STAGE_4 - lifetimeCount);
  }, [thresholds.STAGE_4, lifetimeCount]);

  return {
    // Current state
    currentStage,
    lifetimeCount,
    isPaid,
    isAtLimit,
    isLoading: isLoading || configLoading,
    remainingToLimit,
    
    // Dynamic thresholds
    thresholds,
    
    // Visibility flags
    shouldShowStage1,
    shouldShowStage2,
    shouldShowStage3,
    shouldShowLimitModal,
    
    // Dismiss actions
    dismissStage1,
    dismissStage2,
    markLimitModalShown,
  };
}
