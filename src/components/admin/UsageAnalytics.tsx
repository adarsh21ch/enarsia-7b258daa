import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePowerUsers, ActiveUsageStats } from '@/hooks/useAdminAnalytics';
import { Upload, Phone, TrendingUp, Crown, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UsageAnalyticsProps {
  activeUsage: ActiveUsageStats;
}

export function UsageAnalytics({ activeUsage }: UsageAnalyticsProps) {
  const { data: powerUsers, isLoading } = usePowerUsers(10);

  return (
    <div className="space-y-4">
      {/* Active Usage KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Upload className="h-3 w-3" />
              Lead Importers Today
            </div>
            <p className="text-2xl font-bold mt-1">{activeUsage.leadsImportersToday}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {activeUsage.leadsImportersWeek} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Phone className="h-3 w-3" />
              Active Callers Today
            </div>
            <p className="text-2xl font-bold mt-1">{activeUsage.activeCallersToday}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {activeUsage.activeCallersWeek} this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Explanation Cards */}
      <div className="grid grid-cols-1 gap-3">
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Upload className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Lead Importers</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Users who manually added leads or imported Excel/CSV files today. 
                  This shows who is actively building their prospect list.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Active Callers</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Users who updated prospect status today (marked calls, responses, stages). 
                  This shows who is actively working their leads.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Power Users */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-500" />
            Power Users (Top 10)
            <Badge variant="secondary" className="text-xs ml-auto">This Week</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {(powerUsers || []).map((user, index) => (
                  <div 
                    key={user.user_id} 
                    className="flex items-center gap-3 p-2 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500 text-yellow-950' :
                      index === 1 ? 'bg-gray-300 text-gray-700' :
                      index === 2 ? 'bg-amber-600 text-amber-50' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {user.display_name || (user.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : 'User')}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email ? user.email.split('@')[0] : ''}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        {user.leads_this_week}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {user.total_leads} total
                      </p>
                    </div>
                  </div>
                ))}

                {(powerUsers || []).length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    No activity this week
                  </p>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Usage Tips */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Power users are ranked by leads added this week. 
            Use this to identify your most active users for testimonials or case studies.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
