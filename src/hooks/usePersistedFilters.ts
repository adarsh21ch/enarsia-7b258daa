import { useState, useEffect, useCallback, useRef } from 'react';
import { FunnelStage, ProspectQuality, ExtendedActionTaken } from '@/types/prospect';

export interface Filters {
  search: string;
  stages: FunnelStage[];
  qualities: ProspectQuality[];
  actions: ExtendedActionTaken[];
  incompleteOnly: boolean;
}

interface PersistedFilterData {
  actions: string[];
  stages: string[];
  incompleteOnly: boolean;
}

const STORAGE_KEY_PREFIX = 'nevorai-filters-';

const DEFAULT_FILTERS: Filters = {
  search: '',
  stages: [],
  qualities: [],
  actions: [],
  incompleteOnly: false,
};

/**
 * Hook to persist filter state to localStorage.
 * Filters are stored per filter mode (calling vs funnel).
 */
export function usePersistedFilters(filterMode: 'calling' | 'funnel') {
  const storageKey = `${STORAGE_KEY_PREFIX}${filterMode}`;
  
  // Track if initial load is complete to prevent overwriting on mount
  const isInitializedRef = useRef(false);
  const isFirstRenderRef = useRef(true);

  // Lazy initialization: read from localStorage only once on mount
  const [filters, setFiltersState] = useState<Filters>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      console.log('[usePersistedFilters] Init:', storageKey, stored);
      if (stored) {
        const parsed: PersistedFilterData = JSON.parse(stored);
        // Mark as initialized since we found persisted data
        isInitializedRef.current = true;
        return {
          search: '', // Never persist search
          stages: Array.isArray(parsed.stages) ? parsed.stages : [],
          qualities: [], // Never persist qualities
          actions: Array.isArray(parsed.actions) ? parsed.actions : [],
          incompleteOnly: typeof parsed.incompleteOnly === 'boolean' ? parsed.incompleteOnly : false,
        };
      }
    } catch (error) {
      console.warn('Failed to read persisted filters:', error);
    }
    // No persisted data found, use defaults
    isInitializedRef.current = true;
    return DEFAULT_FILTERS;
  });

  // Save to localStorage whenever filters change
  // Skip the first render to prevent overwriting persisted data on mount
  useEffect(() => {
    // Skip the first render entirely
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    // Only save if we've been initialized
    if (!isInitializedRef.current) {
      return;
    }

    try {
      const dataToStore: PersistedFilterData = {
        actions: filters.actions,
        stages: filters.stages,
        incompleteOnly: filters.incompleteOnly,
      };
      console.log('[usePersistedFilters] Save:', storageKey, dataToStore);
      localStorage.setItem(storageKey, JSON.stringify(dataToStore));
    } catch (error) {
      console.warn('Failed to persist filters:', error);
    }
  }, [filters.actions, filters.stages, filters.incompleteOnly, storageKey]);

  // Wrapped setFilters that also clears storage when clearing filters
  const setFilters = useCallback((newFilters: Filters) => {
    setFiltersState(newFilters);
    
    // If clearing all filters, also clear from storage
    if (
      newFilters.actions.length === 0 &&
      newFilters.stages.length === 0 &&
      !newFilters.incompleteOnly
    ) {
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.warn('Failed to clear persisted filters:', error);
      }
    }
  }, [storageKey]);

  return { filters, setFilters };
}
