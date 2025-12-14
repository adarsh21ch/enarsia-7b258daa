// Follow Up Page - View leads by tags (Personal Data Only)
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProspects } from '@/hooks/useProspects';
import { BottomNav } from '@/components/layout/BottomNav';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Filter, ChevronDown, ChevronUp, Tags, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTagStyle } from '@/lib/tagColors';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';
import { Prospect } from '@/types/prospect';

// WhatsApp outline icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1Zm0 0a5 5 0 0 0 5 5m0 0a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1h1Z" />
  </svg>
);

// Phone outline icon
const PhoneOutlineIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

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
      try { await onRefresh(); } finally { setIsRefreshing(false); }
    }
    setPullDistance(0);
    startY.current = 0;
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { containerRef, isRefreshing, pullDistance, showIndicator: pullDistance > 20 || isRefreshing };
}

export default function ListUp() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { prospects, loading: prospectsLoading, refetch } = useProspects();
  
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
  const { containerRef, isRefreshing, pullDistance, showIndicator } = usePullToRefresh(handleRefresh);

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Get tags separated into categories
  const { responseTags, stageTags, qualityTags } = useMemo(() => {
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

  // Check if any filters are active
  const hasActiveFilters = selectedResponses.length > 0 || selectedStages.length > 0 || selectedQualities.length > 0;

  // Filter prospects by selected tags (AND between categories, OR within category)
  const filteredProspects = useMemo(() => {
    if (!hasActiveFilters) return prospects;
    
    return prospects.filter(p => {
      // Check responses (OR within category)
      const matchesResponse = selectedResponses.length === 0 || 
        (p.action_taken && selectedResponses.includes(p.action_taken));
      
      // Check stages (OR within category)
      const matchesStage = selectedStages.length === 0 || 
        (p.funnel_stage && selectedStages.includes(p.funnel_stage));
      
      // Check qualities (OR within category)
      const matchesQuality = selectedQualities.length === 0 || 
        (p.prospect_status && selectedQualities.includes(p.prospect_status));
      
      // AND between categories
      return matchesResponse && matchesStage && matchesQuality;
    });
  }, [prospects, selectedResponses, selectedStages, selectedQualities, hasActiveFilters]);

  // Group prospects by their primary tag for display
  const prospectsByTag = useMemo(() => {
    if (!hasActiveFilters) {
      return { 'All Leads': filteredProspects };
    }

    const grouped: Record<string, Prospect[]> = {};
    
    // Group by all selected tags
    [...selectedResponses, ...selectedStages, ...selectedQualities].forEach(tag => {
      const tagType = selectedResponses.includes(tag) ? 'Response' : 
                      selectedStages.includes(tag) ? 'Stage' : 'Quality';
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
      return { 'Filtered Leads': filteredProspects };
    }
    
    return grouped;
  }, [filteredProspects, selectedResponses, selectedStages, selectedQualities, hasActiveFilters]);

  const toggleResponse = (tag: string) => {
    setSelectedResponses(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleStage = (tag: string) => {
    setSelectedStages(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleQuality = (tag: string) => {
    setSelectedQualities(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearAllFilters = () => {
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

  const isLoading = authLoading || prospectsLoading;
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img 
              src={nevoraLogo} 
              alt="NevorAI Logo" 
              className="h-10 w-10 rounded-xl object-cover shadow-md"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Follow Up</h1>
              <p className="text-xs text-muted-foreground font-medium">View by Tags</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs gap-1">
                <X className="h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </header>

      <main ref={containerRef} className="scrollable-content relative pb-20">
        <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} showIndicator={showIndicator} />
        <div className="container py-3 px-4 space-y-4">

          {/* Grouped Tag Filters */}
          <div className="bg-card rounded-xl p-4 border border-border/50 space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter by Tags</span>
            </div>

            {/* Responses Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Responses</h4>
              {responseTags.length === 0 ? (
                <p className="text-xs text-muted-foreground/70">No response tags</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {responseTags.map(tag => {
                    const isSelected = selectedResponses.includes(tag);
                    const style = getTagStyle(tag, 'response', null, isSelected, true);
                    return (
                      <Badge
                        key={`response-${tag}`}
                        variant="outline"
                        className="cursor-pointer text-xs transition-all border"
                        style={style}
                        onClick={() => toggleResponse(tag)}
                      >
                        {tag}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Stages Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stages</h4>
              {stageTags.length === 0 ? (
                <p className="text-xs text-muted-foreground/70">No stage tags</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {stageTags.map(tag => {
                    const isSelected = selectedStages.includes(tag);
                    const style = getTagStyle(tag, 'stage', null, isSelected, true);
                    return (
                      <Badge
                        key={`stage-${tag}`}
                        variant="outline"
                        className="cursor-pointer text-xs transition-all border"
                        style={style}
                        onClick={() => toggleStage(tag)}
                      >
                        {tag}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quality Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quality</h4>
              {qualityTags.length === 0 ? (
                <p className="text-xs text-muted-foreground/70">No quality tags</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {qualityTags.map(tag => {
                    const isSelected = selectedQualities.includes(tag);
                    const style = getTagStyle(tag, 'quality', null, isSelected, true);
                    return (
                      <Badge
                        key={`quality-${tag}`}
                        variant="outline"
                        className="cursor-pointer text-xs transition-all border"
                        style={style}
                        onClick={() => toggleQuality(tag)}
                      >
                        {tag}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Prospects grouped by tags */}
          {Object.entries(prospectsByTag).map(([tagName, tagProspects]) => (
            <div key={tagName} className="bg-card rounded-xl border border-border/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <Tags className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">{tagName}</h3>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {tagProspects.length}
                </Badge>
              </div>

              {tagProspects.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No leads</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {tagProspects.map(prospect => {
                    const isExpanded = expandedProspectId === prospect.id;
                    return (
                      <div key={prospect.id}>
                        <button
                          onClick={() => toggleProspect(prospect.id)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                        >
                          <span className="text-sm font-medium">{prospect.name}</span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-3 space-y-2 bg-muted/20">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{prospect.phone}</span>
                              {prospect.address && (
                                <>
                                  <span>•</span>
                                  <span>{prospect.address}</span>
                                </>
                              )}
                            </div>
                            
                            {/* Tags */}
                            <div className="flex flex-wrap gap-1">
                              {prospect.funnel_stage && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs border"
                                  style={getTagStyle(prospect.funnel_stage, 'stage')}
                                >
                                  {prospect.funnel_stage}
                                </Badge>
                              )}
                              {prospect.action_taken && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs border"
                                  style={getTagStyle(prospect.action_taken, 'response')}
                                >
                                  {prospect.action_taken}
                                </Badge>
                              )}
                              {prospect.prospect_status && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs border"
                                  style={getTagStyle(prospect.prospect_status, 'quality')}
                                >
                                  {prospect.prospect_status}
                                </Badge>
                              )}
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCall(prospect.phone);
                                }}
                                className="gap-1.5"
                              >
                                <PhoneOutlineIcon className="h-3.5 w-3.5" />
                                Call
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleWhatsApp(prospect.phone);
                                }}
                                className="gap-1.5 border-green-500/50 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
                              >
                                <WhatsAppIcon className="h-3.5 w-3.5" />
                                WhatsApp
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {filteredProspects.length === 0 && hasActiveFilters && (
            <div className="bg-card rounded-xl p-8 border border-border/50 text-center">
              <Tags className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground mb-2">
                No leads match the selected tags
              </p>
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
