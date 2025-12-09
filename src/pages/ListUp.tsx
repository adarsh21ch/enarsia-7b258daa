// ListUp Page - View prospects by tags
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProspects } from '@/hooks/useProspects';
import { useSharedProspects } from '@/hooks/useSharedProspects';
import { BottomNav } from '@/components/layout/BottomNav';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { TeamAccessDialog } from '@/components/team/TeamAccessDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Filter, Phone, MessageCircle, ChevronDown, ChevronUp, Tags, X, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';
import { Prospect } from '@/types/prospect';

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
  const { prospects: myProspects, loading: prospectsLoading, refetch } = useProspects();
  const { sharedOwners, selectedOwnerId, setSelectedOwnerId, prospects: sharedProspects, loading: sharedLoading, refetch: refetchShared } = useSharedProspects();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expandedProspectId, setExpandedProspectId] = useState<string | null>(null);

  // Determine which prospects to show
  const prospects = selectedOwnerId ? sharedProspects : myProspects;
  const isViewingShared = !!selectedOwnerId;

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    if (selectedOwnerId) {
      await refetchShared?.();
    } else {
      await refetch?.();
    }
  }, [refetch, refetchShared, selectedOwnerId]);
  const { containerRef, isRefreshing, pullDistance, showIndicator } = usePullToRefresh(handleRefresh);

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Get all unique tags from prospects (both stages and responses)
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    prospects.forEach(p => {
      if (p.funnel_stage) tags.add(`Stage: ${p.funnel_stage}`);
      if (p.action_taken) tags.add(`Response: ${p.action_taken}`);
      if (p.prospect_status) tags.add(`Quality: ${p.prospect_status}`);
    });
    return Array.from(tags).sort();
  }, [prospects]);

  // Filter prospects by selected tags
  const filteredProspects = useMemo(() => {
    if (selectedTags.length === 0) return prospects;
    
    return prospects.filter(p => {
      return selectedTags.some(tag => {
        if (tag.startsWith('Stage: ')) {
          return p.funnel_stage === tag.replace('Stage: ', '');
        }
        if (tag.startsWith('Response: ')) {
          return p.action_taken === tag.replace('Response: ', '');
        }
        if (tag.startsWith('Quality: ')) {
          return p.prospect_status === tag.replace('Quality: ', '');
        }
        return false;
      });
    });
  }, [prospects, selectedTags]);

  // Group prospects by their tags
  const prospectsByTag = useMemo(() => {
    if (selectedTags.length === 0) {
      return { 'All Prospects': filteredProspects };
    }

    const grouped: Record<string, Prospect[]> = {};
    selectedTags.forEach(tag => {
      grouped[tag] = filteredProspects.filter(p => {
        if (tag.startsWith('Stage: ')) {
          return p.funnel_stage === tag.replace('Stage: ', '');
        }
        if (tag.startsWith('Response: ')) {
          return p.action_taken === tag.replace('Response: ', '');
        }
        if (tag.startsWith('Quality: ')) {
          return p.prospect_status === tag.replace('Quality: ', '');
        }
        return false;
      });
    });
    return grouped;
  }, [filteredProspects, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearTags = () => {
    setSelectedTags([]);
  };

  const toggleProspect = (id: string) => {
    setExpandedProspectId(prev => prev === id ? null : id);
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.location.href = `whatsapp://send?phone=${cleanPhone}`;
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const isLoading = authLoading || prospectsLoading || (selectedOwnerId && sharedLoading);
  
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
              <h1 className="text-xl font-bold tracking-tight">ListUp</h1>
              <p className="text-xs text-muted-foreground font-medium">
                {isViewingShared ? `Viewing ${sharedOwners.find(o => o.user_id === selectedOwnerId)?.display_name}'s data` : 'View by Tags'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedTags.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearTags} className="text-xs gap-1">
                <X className="h-3 w-3" />
                Clear
              </Button>
            )}
            <TeamAccessDialog />
          </div>
        </div>
      </header>

      <main ref={containerRef} className="scrollable-content relative pb-20">
        <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} showIndicator={showIndicator} />
        <div className="container py-3 px-4 space-y-4">
          {/* Team Data Selector */}
          {sharedOwners.length > 0 && (
            <div className="bg-card rounded-xl p-3 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">View Team Data</span>
              </div>
              <Select 
                value={selectedOwnerId || 'my-data'} 
                onValueChange={(val) => setSelectedOwnerId(val === 'my-data' ? null : val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select whose data to view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="my-data">My Prospects</SelectItem>
                  {sharedOwners.map(owner => (
                    <SelectItem key={owner.user_id} value={owner.user_id}>
                      {owner.display_name}'s Prospects
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tag Filter Bar */}
          <div className="bg-card rounded-xl p-3 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Filter by Tags</span>
            </div>
            {allTags.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No tags found. Add tags to prospects in Follow Up.
              </p>
            ) : (
              <ScrollArea className="w-full">
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {allTags.map(tag => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer text-xs transition-all",
                        selectedTags.includes(tag) 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted"
                      )}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            )}
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
                  <p className="text-sm text-muted-foreground">No prospects</p>
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
                                <Badge variant="outline" className="text-xs">
                                  Stage: {prospect.funnel_stage}
                                </Badge>
                              )}
                              {prospect.action_taken && (
                                <Badge variant="outline" className="text-xs">
                                  Response: {prospect.action_taken}
                                </Badge>
                              )}
                              {prospect.prospect_status && (
                                <Badge variant="outline" className="text-xs">
                                  Quality: {prospect.prospect_status}
                                </Badge>
                              )}
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCall(prospect.phone);
                                }}
                                className="gap-1.5"
                              >
                                <Phone className="h-3.5 w-3.5" />
                                Call
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleWhatsApp(prospect.phone);
                                }}
                                className="gap-1.5 bg-green-600 hover:bg-green-700"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
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

          {filteredProspects.length === 0 && selectedTags.length > 0 && (
            <div className="bg-card rounded-xl p-8 border border-border/50 text-center">
              <Tags className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground mb-2">
                No prospects match the selected tags
              </p>
              <Button variant="outline" size="sm" onClick={clearTags}>
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
