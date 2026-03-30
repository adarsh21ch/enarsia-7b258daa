// Follow Up Page - View leads by tags (Personal Data Only)
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProspectsQuery } from '@/hooks/useProspectsQuery';
import { BottomNav } from '@/components/layout/BottomNav';

import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { TopTabBar } from '@/components/ui/TopTabBar';
import { TrialBanner } from '@/components/subscription/TrialBanner';
import { UpgradeButton } from '@/components/subscription/UpgradeButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Filter, ChevronDown, ChevronUp, Tags, X, Eye, Search, Phone, Layers, Clock } from 'lucide-react';
import { RecentActivityView } from '@/components/todo/RecentActivityView';
import { CalendarStrip } from '@/components/calendar/CalendarStrip';
import { useCalendarStrip } from '@/hooks/useCalendarStrip';
import { isSameDay, parseISO } from 'date-fns';

type FollowUpMainTab = 'activity' | 'prospects';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getTagStyle } from '@/lib/tagColors';
import { Prospect } from '@/types/prospect';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

type LeadMode = 'leads' | 'funnel';

// WhatsApp outline icon
const WhatsAppIcon = ({
  className
}: {
  className?: string;
}) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1Zm0 0a5 5 0 0 0 5 5m0 0a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1h1Z" />
  </svg>;

// Phone outline icon
const PhoneOutlineIcon = ({
  className
}: {
  className?: string;
}) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>;

// Pull-to-refresh hook
function usePullToRefresh(onRefresh: () => Promise<void>, threshold = 80) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!startY.current || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0 && containerRef.current && containerRef.current.scrollTop === 0) {
      setPullDistance(Math.min(diff * 0.5, threshold * 1.5));
    }
  }, [isRefreshing, threshold]);
  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    startY.current = 0;
  }, [pullDistance, threshold, isRefreshing, onRefresh]);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('touchstart', handleTouchStart, {
      passive: true
    });
    container.addEventListener('touchmove', handleTouchMove, {
      passive: true
    });
    container.addEventListener('touchend', handleTouchEnd);
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
  return {
    containerRef,
    isRefreshing,
    pullDistance,
    showIndicator: pullDistance > 20 || isRefreshing
  };
}
export default function ListUp() {
  const navigate = useNavigate();
  const {
    user,
    loading: authLoading
  } = useAuth();
  const {
    prospects,
    loading: prospectsLoading,
    refetch
  } = useProspectsQuery();

  // Lead mode toggle - default to leads
  const [leadMode, setLeadMode] = useState<LeadMode>(() => {
    const saved = sessionStorage.getItem('listup-mode');
    // Migrate old 'response' value to 'leads'
    if (saved === 'response') return 'leads';
    return (saved as LeadMode) || 'leads';
  });

  // Toggle options for TopTabBar (same as Calling and Tracking tabs)
  const toggleOptions: [{ value: string; label: string; icon: typeof Phone }, { value: string; label: string; icon: typeof Layers }] = [
    { value: 'leads', label: 'Leads', icon: Phone },
    { value: 'funnel', label: 'Funnel', icon: Layers }
  ];

  // Main tab: Activity vs Prospects - persist to sessionStorage, default activity
  const [mainTab, setMainTab] = useState<FollowUpMainTab>(() => {
    const saved = sessionStorage.getItem('listup-main-tab');
    return (saved as FollowUpMainTab) || 'activity';
  });
  const mainTabOptions: [{ value: string; label: string; icon: typeof Clock }, { value: string; label: string; icon: typeof Tags }] = [
    { value: 'activity', label: 'Activity', icon: Clock },
    { value: 'prospects', label: 'Prospects', icon: Tags }
  ];
  
  // Show all tags toggle (including empty ones)
  const [showAllTags, setShowAllTags] = useState(false);
  
  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Calendar for prospects date filtering
  const prospectsCalendar = useCalendarStrip();
  const [prospectsDateFilter, setProspectsDateFilter] = useState(false);

  // Persist filters in sessionStorage so they survive tab switches
  const [selectedResponses, setSelectedResponses] = useState<string[]>(() => {
    const saved = sessionStorage.getItem('listup-responses');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedStages, setSelectedStages] = useState<string[]>(() => {
    const saved = sessionStorage.getItem('listup-stages');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedQualities, setSelectedQualities] = useState<string[]>(() => {
    const saved = sessionStorage.getItem('listup-qualities');
    return saved ? JSON.parse(saved) : [];
  });
  const [expandedProspectId, setExpandedProspectId] = useState<string | null>(null);

  // Persist lead mode and main tab to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('listup-mode', leadMode);
  }, [leadMode]);
  useEffect(() => {
    sessionStorage.setItem('listup-main-tab', mainTab);
  }, [mainTab]);

  // Persist filter selections to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('listup-responses', JSON.stringify(selectedResponses));
  }, [selectedResponses]);
  useEffect(() => {
    sessionStorage.setItem('listup-stages', JSON.stringify(selectedStages));
  }, [selectedStages]);
  useEffect(() => {
    sessionStorage.setItem('listup-qualities', JSON.stringify(selectedQualities));
  }, [selectedQualities]);

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await refetch?.();
  }, [refetch]);
  const {
    containerRef,
    isRefreshing,
    pullDistance,
    showIndicator
  } = usePullToRefresh(handleRefresh);
  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Filter prospects based on lead mode first
  const modeFilteredProspects = useMemo(() => {
    if (leadMode === 'funnel') {
      // Funnel leads: prospects that have a funnel_stage set
      return prospects.filter(p => p.funnel_stage && p.funnel_stage.trim() !== '');
    } else {
      // Leads mode: prospects that have action_taken (response) set
      return prospects.filter(p => p.action_taken && p.action_taken.trim() !== '');
    }
  }, [prospects, leadMode]);

  // Get tags separated into categories - with counts
  const {
    responseTags,
    stageTags,
    qualityTags,
    responseTagCounts,
    stageTagCounts,
    qualityTagCounts
  } = useMemo(() => {
    const responseCounts = new Map<string, number>();
    const stageCounts = new Map<string, number>();
    const qualityCounts = new Map<string, number>();
    
    modeFilteredProspects.forEach(p => {
      if (p.action_taken) {
        responseCounts.set(p.action_taken, (responseCounts.get(p.action_taken) || 0) + 1);
      }
      if (p.funnel_stage) {
        stageCounts.set(p.funnel_stage, (stageCounts.get(p.funnel_stage) || 0) + 1);
      }
      if (p.prospect_status) {
        qualityCounts.set(p.prospect_status, (qualityCounts.get(p.prospect_status) || 0) + 1);
      }
    });
    
    return {
      responseTags: Array.from(responseCounts.keys()).sort(),
      stageTags: Array.from(stageCounts.keys()).sort(),
      qualityTags: Array.from(qualityCounts.keys()).sort(),
      responseTagCounts: responseCounts,
      stageTagCounts: stageCounts,
      qualityTagCounts: qualityCounts
    };
  }, [modeFilteredProspects]);

  // Get all tags (including empty ones from all prospects) for "Show All" option
  const allTags = useMemo(() => {
    const responses = new Set<string>();
    const stages = new Set<string>();
    const qualities = new Set<string>();
    prospects.forEach(p => {
      if (p.action_taken) responses.add(p.action_taken);
      if (p.funnel_stage) stages.add(p.funnel_stage);
      if (p.prospect_status) qualities.add(p.prospect_status);
    });
    return {
      responseTags: Array.from(responses).sort(),
      stageTags: Array.from(stages).sort(),
      qualityTags: Array.from(qualities).sort()
    };
  }, [prospects]);

  // Choose which tags to display based on showAllTags toggle
  const displayResponseTags = showAllTags ? allTags.responseTags : responseTags;
  const displayStageTags = showAllTags ? allTags.stageTags : stageTags;

  // Check if any filters are active
  const hasActiveFilters = selectedResponses.length > 0 || selectedStages.length > 0 || selectedQualities.length > 0;

  // Filter prospects by selected tags (AND between categories, OR within category)
  const filteredProspects = useMemo(() => {
    let result = modeFilteredProspects;

    // Apply date filter if active
    if (prospectsDateFilter) {
      result = result.filter(p => isSameDay(parseISO(p.updated_at), prospectsCalendar.selectedDate));
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.phone.toLowerCase().includes(query) ||
        (p.address && p.address.toLowerCase().includes(query)) ||
        (p.notes && p.notes.toLowerCase().includes(query))
      );
    }
    
    // Then apply tag filters
    if (!hasActiveFilters) return result;
    return result.filter(p => {
      // Check responses (OR within category)
      const matchesResponse = selectedResponses.length === 0 || p.action_taken && selectedResponses.includes(p.action_taken);

      // Check stages (OR within category)
      const matchesStage = selectedStages.length === 0 || p.funnel_stage && selectedStages.includes(p.funnel_stage);

      // Check qualities (OR within category)
      const matchesQuality = selectedQualities.length === 0 || p.prospect_status && selectedQualities.includes(p.prospect_status);

      // AND between categories
      return matchesResponse && matchesStage && matchesQuality;
    });
  }, [modeFilteredProspects, selectedResponses, selectedStages, selectedQualities, hasActiveFilters, searchQuery, prospectsDateFilter, prospectsCalendar.selectedDate]);

  // Group prospects by their primary tag for display
  const prospectsByTag = useMemo(() => {
    if (!hasActiveFilters) {
      return {
        'All Leads': filteredProspects
      };
    }
    const grouped: Record<string, Prospect[]> = {};

    // Group by all selected tags
    [...selectedResponses, ...selectedStages, ...selectedQualities].forEach(tag => {
      const tagType = selectedResponses.includes(tag) ? 'Response' : selectedStages.includes(tag) ? 'Stage' : 'Quality';
      const displayTag = `${tagType}: ${tag}`;
      grouped[displayTag] = filteredProspects.filter(p => {
        if (selectedResponses.includes(tag)) return p.action_taken === tag;
        if (selectedStages.includes(tag)) return p.funnel_stage === tag;
        if (selectedQualities.includes(tag)) return p.prospect_status === tag;
        return false;
      });
    });

    // If filters but no grouping yet, show all filtered
    if (Object.keys(grouped).length === 0) {
      return {
        'Filtered Leads': filteredProspects
      };
    }
    return grouped;
  }, [filteredProspects, selectedResponses, selectedStages, selectedQualities, hasActiveFilters]);
  const toggleResponse = (tag: string) => {
    setSelectedResponses(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };
  const toggleStage = (tag: string) => {
    setSelectedStages(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };
  const toggleQuality = (tag: string) => {
    setSelectedQualities(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };
  const clearAllFilters = () => {
    setSelectedResponses([]);
    setSelectedStages([]);
    setSelectedQualities([]);
  };

  // Clear filters when mode changes
  const handleModeChange = (mode: LeadMode) => {
    setLeadMode(mode);
    setSelectedResponses([]);
    setSelectedStages([]);
    setSelectedQualities([]);
  };

  const toggleProspect = (id: string) => {
    setExpandedProspectId(prev => prev === id ? null : id);
  };
  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };
  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };
  // Only show loading on initial auth check - data shows instantly from cache
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  if (!user) return null;
  return <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={nevoraLogo} alt="NevorAI Logo" className="h-10 w-10 rounded-xl object-cover shadow-md" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Follow Up</h1>
              <p className="text-xs text-muted-foreground font-medium">
                {mainTab === 'prospects' 
                  ? `${leadMode === 'funnel' ? 'Funnel Leads' : 'Response Leads'} (${modeFilteredProspects.length})`
                  : 'Activity History'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && mainTab === 'prospects' && <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs gap-1">
                <X className="h-3 w-3" />
                Clear
              </Button>}
          </div>
        </div>
        
        {/* Main Tab Bar: Activity | Prospects */}
        <div className="px-4 pb-2">
          <TopTabBar options={mainTabOptions} value={mainTab} onChange={(v) => setMainTab(v as FollowUpMainTab)} />
        </div>
      </header>

      <main ref={containerRef} className="scrollable-content relative pb-20">
        <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} showIndicator={showIndicator} />
        <div className="container py-3 px-4 space-y-3">
          {/* Trial Banner */}
          <TrialBanner tabId="listup" />
          <UpgradeButton tabId="listup" variant="prominent" />

          {mainTab === 'activity' ? (
            /* Activity History View */
            <RecentActivityView />
          ) : (
            <>
              {/* Leads/Funnel sub-toggle - smaller, outline style to differentiate */}
              <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-0.5 border border-border/40">
                {toggleOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = leadMode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleModeChange(opt.value as LeadMode)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all",
                        isActive
                          ? "bg-card text-foreground shadow-sm border border-border/50"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Calendar strip for date filtering */}
              <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5">
                  <button
                    onClick={() => setProspectsDateFilter(!prospectsDateFilter)}
                    className={cn(
                      "text-[11px] font-medium transition-colors",
                      prospectsDateFilter ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {prospectsDateFilter ? '✓ Date filter ON' : 'Filter by date'}
                  </button>
                  {prospectsDateFilter && (
                    <button onClick={() => setProspectsDateFilter(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {prospectsDateFilter && (
                  <CalendarStrip
                    selectedDate={prospectsCalendar.selectedDate}
                    daysInMonth={prospectsCalendar.daysInMonth}
                    monthYearLabel={prospectsCalendar.monthYearLabel}
                    onSelectDate={prospectsCalendar.selectDate}
                    onPreviousMonth={prospectsCalendar.goToPreviousMonth}
                    onNextMonth={prospectsCalendar.goToNextMonth}
                    onTodayClick={prospectsCalendar.goToToday}
                    className="rounded-b-xl"
                  />
                )}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-card border-border/50"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Tag Filters */}
              <div className="bg-card rounded-xl p-3 border border-border/50 space-y-3">
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filter by Tags</span>
                  </div>
                  {/* Show All Tags Toggle */}
                  <button
                    onClick={() => setShowAllTags(!showAllTags)}
                    className={cn(
                      "flex items-center gap-1 text-xs transition-colors",
                      showAllTags ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                </div>

                {/* Tags based on mode */}
                {leadMode === 'funnel' ? (
                  displayStageTags.length === 0 ? (
                    <p className="text-xs text-muted-foreground/70">No funnel stages</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {displayStageTags.map(tag => {
                        const isSelected = selectedStages.includes(tag);
                        const count = stageTagCounts.get(tag) || 0;
                        const style = getTagStyle(tag, 'stage', null, isSelected, true);
                        return (
                          <Badge 
                            key={`stage-${tag}`} 
                            variant="outline" 
                            className={cn(
                              "cursor-pointer text-xs transition-all border",
                              count === 0 && "opacity-50"
                            )} 
                            style={style} 
                            onClick={() => toggleStage(tag)}
                          >
                            {tag} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                          </Badge>
                        );
                      })}
                    </div>
                  )
                ) : (
                  displayResponseTags.length === 0 ? (
                    <p className="text-xs text-muted-foreground/70">No response tags</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {displayResponseTags.map(tag => {
                        const isSelected = selectedResponses.includes(tag);
                        const count = responseTagCounts.get(tag) || 0;
                        const style = getTagStyle(tag, 'response', null, isSelected, true);
                        return (
                          <Badge 
                            key={`response-${tag}`} 
                            variant="outline" 
                            className={cn(
                              "cursor-pointer text-xs transition-all border",
                              count === 0 && "opacity-50"
                            )}
                            style={style} 
                            onClick={() => toggleResponse(tag)}
                          >
                            {tag} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                          </Badge>
                        );
                      })}
                    </div>
                  )
                )}
              </div>

              {/* Prospects grouped by tags */}
              {Object.entries(prospectsByTag).map(([tagName, tagProspects]) => <div key={tagName} className="bg-card rounded-xl border border-border/50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <Tags className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm">{tagName}</h3>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {tagProspects.length}
                    </Badge>
                  </div>

                  {tagProspects.length === 0 ? <div className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">No leads</p>
                    </div> : <div className="divide-y divide-border/30">
                      {tagProspects.map(prospect => {
                  const isExpanded = expandedProspectId === prospect.id;
                  return <div key={prospect.id}>
                            <button onClick={() => toggleProspect(prospect.id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-sm font-medium truncate">{prospect.name}</span>
                                {/* Inline tag badges */}
                                <div className="flex items-center gap-1 shrink-0">
                                  {prospect.action_taken && leadMode === 'funnel' && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary leading-none">
                                      {prospect.action_taken}
                                    </span>
                                  )}
                                  {prospect.funnel_stage && leadMode === 'leads' && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground leading-none">
                                      {prospect.funnel_stage}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                            </button>

                            {isExpanded && <div className="px-4 pb-3 space-y-2 bg-muted/20">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{prospect.phone}</span>
                                  {prospect.address && <>
                                      <span>•</span>
                                      <span>{prospect.address}</span>
                                    </>}
                                </div>
                                
                                {/* Tags */}
                                <div className="flex flex-wrap gap-1">
                                  {prospect.funnel_stage && <Badge variant="outline" className="text-xs border" style={getTagStyle(prospect.funnel_stage, 'stage')}>
                                      {prospect.funnel_stage}
                                    </Badge>}
                                  {prospect.action_taken && <Badge variant="outline" className="text-xs border" style={getTagStyle(prospect.action_taken, 'response')}>
                                      {prospect.action_taken}
                                    </Badge>}
                                  {prospect.prospect_status && <Badge variant="outline" className="text-xs border" style={getTagStyle(prospect.prospect_status, 'quality')}>
                                      {prospect.prospect_status}
                                    </Badge>}
                                </div>

                                {/* Action buttons */}
                                <div className="flex items-center gap-2 pt-1">
                                  <Button size="sm" variant="outline" onClick={e => {
                          e.stopPropagation();
                          handleCall(prospect.phone);
                        }} className="gap-1.5">
                                    <PhoneOutlineIcon className="h-3.5 w-3.5" />
                                    Call
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={e => {
                          e.stopPropagation();
                          handleWhatsApp(prospect.phone);
                        }} className="gap-1.5 border-green-500/50 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30">
                                    <WhatsAppIcon className="h-3.5 w-3.5" />
                                    WhatsApp
                                  </Button>
                                </div>
                              </div>}
                          </div>;
                })}
                    </div>}
                </div>)}

              {filteredProspects.length === 0 && hasActiveFilters && <div className="bg-card rounded-xl p-8 border border-border/50 text-center">
                  <Tags className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground mb-2">
                    No leads match the selected tags
                  </p>
                  <Button variant="outline" size="sm" onClick={clearAllFilters}>
                    Clear Filters
                  </Button>
                </div>}
            </>
          )}
        </div>
      </main>

      <BottomNav />
    </div>;
}