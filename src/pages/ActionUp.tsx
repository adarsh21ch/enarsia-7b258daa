import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProspects } from '@/hooks/useProspects';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { useSubscription } from '@/hooks/useSubscription';
import { BottomNav } from '@/components/layout/BottomNav';
import { UpgradeBar } from '@/components/subscription/UpgradeBar';
import { StageBadge, StatusBadge } from '@/components/prospects/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Activity, Clock, UserPlus, GitBranch, CheckCircle, Bell, Sparkles, Filter, Search } from 'lucide-react';
import { formatDistanceToNow, parseISO, isToday, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

type ActivityFilter = 'all' | 'prospect_added' | 'stage_change' | 'enrollment' | 'action_change' | 'note_added';

export default function ActionUp() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { prospects } = useProspects();
  const { activities, loading: activitiesLoading } = useActivityLogs(100);
  const { isPro, loading: subLoading } = useSubscription();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>('all');

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const today = new Date();
    const followUpsDueToday = prospects.filter(p => 
      p.last_contact_date && (isToday(parseISO(p.last_contact_date)) || isPast(parseISO(p.last_contact_date)))
    ).length;
    
    const newProspectsToday = prospects.filter(p => 
      isToday(parseISO(p.date_added))
    ).length;
    
    const enrollmentsToday = prospects.filter(p => 
      p.enrollment_status === 'Enrolled' && isToday(parseISO(p.updated_at))
    ).length;

    return { followUpsDueToday, newProspectsToday, enrollmentsToday };
  }, [prospects]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    let filtered = activities;
    
    if (activeFilter !== 'all') {
      filtered = filtered.filter(a => a.activity_type === activeFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.description.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [activities, activeFilter, searchQuery]);

  // Generate activity from prospects if no activity logs yet
  const recentProspectActivity = useMemo(() => {
    if (activities.length > 0) return [];
    
    return [...prospects]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 20)
      .map(p => ({
        id: p.id,
        prospect_name: p.name,
        activity_type: 'prospect_update',
        description: `${p.funnel_stage}${p.prospect_status ? ` • ${p.prospect_status}` : ''}`,
        created_at: p.updated_at,
        funnel_stage: p.funnel_stage,
        prospect_status: p.prospect_status,
      }));
  }, [prospects, activities]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'prospect_added': return UserPlus;
      case 'stage_change': return GitBranch;
      case 'enrollment': return CheckCircle;
      case 'action_change': return Activity;
      default: return Clock;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'prospect_added': return 'text-blue-500 bg-blue-500/10';
      case 'stage_change': return 'text-purple-500 bg-purple-500/10';
      case 'enrollment': return 'text-green-500 bg-green-500/10';
      case 'action_change': return 'text-amber-500 bg-amber-500/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const filterOptions: { value: ActivityFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'prospect_added', label: 'New Prospects' },
    { value: 'stage_change', label: 'Stage Changes' },
    { value: 'enrollment', label: 'Enrollments' },
    { value: 'action_change', label: 'Actions' },
  ];

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-24">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img 
              src={nevoraLogo} 
              alt="NevorAI Logo" 
              className="h-10 w-10 rounded-xl object-cover shadow-md"
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight">NevorAI</h1>
              <p className="text-[10px] text-muted-foreground font-medium">Never miss a followup Again</p>
            </div>
          </div>
        </div>
      </header>

      <main className={cn("container py-4 px-4 space-y-5", !isPro && "pb-32")}>
        <div className="mb-2">
          <h2 className="text-2xl font-bold tracking-tight">ActionUp</h2>
          <p className="text-sm text-muted-foreground">Your Action Center</p>
          <div className="flex items-center gap-1 mt-2">
            <div className="w-8 h-1 bg-primary rounded-full" />
            <div className="w-2 h-1 bg-primary/50 rounded-full" />
            <div className="w-1 h-1 bg-primary/30 rounded-full" />
          </div>
        </div>

        {/* Summary Chips */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1.5 py-1.5 px-3 bg-amber-500/10 text-amber-600 border-amber-500/30">
            <Bell className="h-3.5 w-3.5" />
            {summaryStats.followUpsDueToday} Follow-ups due
          </Badge>
          <Badge variant="outline" className="gap-1.5 py-1.5 px-3 bg-blue-500/10 text-blue-600 border-blue-500/30">
            <UserPlus className="h-3.5 w-3.5" />
            {summaryStats.newProspectsToday} New today
          </Badge>
          <Badge variant="outline" className="gap-1.5 py-1.5 px-3 bg-green-500/10 text-green-600 border-green-500/30">
            <CheckCircle className="h-3.5 w-3.5" />
            {summaryStats.enrollmentsToday} Enrolled
          </Badge>
        </div>

        {/* AI Smart Summary Panel */}
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-4 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">AI Smart Daily Summary</h3>
              <p className="text-xs text-muted-foreground">Get insights and recommendations</p>
            </div>
          </div>
          <div className="bg-card/50 rounded-xl p-3 text-sm text-muted-foreground min-h-[80px]">
            <p>📊 You have <strong>{prospects.length}</strong> total prospects.</p>
            <p className="mt-1">🔔 <strong>{summaryStats.followUpsDueToday}</strong> prospects need follow-up today.</p>
            <p className="mt-1">💡 <strong>Tip:</strong> Focus on +VE prospects with pending follow-ups first.</p>
          </div>
          <Button variant="outline" size="sm" className="mt-3 w-full" disabled>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate AI Summary (Coming Soon)
          </Button>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {filterOptions.map(option => (
              <Button
                key={option.value}
                variant={activeFilter === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter(option.value)}
                className="shrink-0 text-xs h-8"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Recent Activity</h3>
          </div>
          
          {activitiesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredActivities.length > 0 ? (
            <div className="space-y-2">
              {filteredActivities.map((activity) => {
                const Icon = getActivityIcon(activity.activity_type);
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className={cn("p-2 rounded-lg shrink-0", getActivityColor(activity.activity_type))}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.description}</p>
                      {activity.old_value && activity.new_value && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {activity.old_value} → {activity.new_value}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(parseISO(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : recentProspectActivity.length > 0 ? (
            <div className="space-y-2">
              {recentProspectActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-muted shrink-0">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.prospect_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StageBadge stage={activity.funnel_stage} />
                      {activity.prospect_status && <StatusBadge status={activity.prospect_status} />}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(parseISO(activity.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No activity yet</p>
              <p className="text-xs mt-1">Start adding prospects to see activity here</p>
            </div>
          )}
        </div>
      </main>

      {/* Upgrade Bar for Free Users */}
      <UpgradeBar />

      <BottomNav />
    </div>
  );
}
