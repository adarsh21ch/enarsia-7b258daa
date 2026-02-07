import { useState, useCallback } from 'react';

export type DataMode = 'personal' | 'total';
export type ViewType = 'leads' | 'funnel';
export type ViewMode = 'date-wise' | 'funnel-wise' | 'monthly-totals' | 'summary';

const LEADS_DEFAULT_VIEW: ViewMode = 'date-wise';
const FUNNEL_DEFAULT_VIEW: ViewMode = 'funnel-wise';

const LEADS_VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'date-wise', label: 'Date-wise' },
  { value: 'monthly-totals', label: 'Monthly Totals' },
  { value: 'summary', label: 'Summary' },
];

const FUNNEL_VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'funnel-wise', label: 'Funnel-wise' },
  { value: 'monthly-totals', label: 'Monthly Totals' },
  { value: 'summary', label: 'Summary' },
];

export function useTrackingModes() {
  const [dataMode, setDataMode] = useState<DataMode>('personal');
  const [viewType, setViewType] = useState<ViewType>('leads');
  const [viewMode, setViewMode] = useState<ViewMode>(LEADS_DEFAULT_VIEW);

  const handleDataModeChange = useCallback((mode: DataMode) => {
    setDataMode(mode);
  }, []);

  const handleViewTypeChange = useCallback((type: ViewType) => {
    setViewType(type);
    // Auto-switch view mode to the default for the new view type
    setViewMode(type === 'leads' ? LEADS_DEFAULT_VIEW : FUNNEL_DEFAULT_VIEW);
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  const viewModeOptions = viewType === 'leads' ? LEADS_VIEW_OPTIONS : FUNNEL_VIEW_OPTIONS;

  return {
    dataMode,
    viewType,
    viewMode,
    viewModeOptions,
    setDataMode: handleDataModeChange,
    setViewType: handleViewTypeChange,
    setViewMode: handleViewModeChange,
  };
}
