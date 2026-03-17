import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePowerUsers, ActiveUsageStats } from '@/hooks/useAdminAnalytics';
import { Upload, Phone, TrendingUp, Crown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UsageAnalyticsProps {
  activeUsage: ActiveUsageStats;
}

export function UsageAnalytics({ activeUsage }: UsageAnalyticsProps) {
  const { data: powerUsers, isLoading } = usePowerUsers(10);

  return (
    <div className="space-y-3">
      {/* Compact KPIs + Explanations */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Upload className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs font-medium">Importers</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold">{activeUsage.leadsImportersToday}</span>
              <span className="text-[10px] text-muted-foreground">today</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{activeUsage.leadsImportersWeek} wk</span>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1">Users who added/imported leads</p>
          </CardContent>
        </Card>

        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Phone className="h-3.5 w-3.5 text-green-500" />
              <span className="text-xs font-medium">Callers</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold">{activeUsage.activeCallersToday}</span>
              <span className="text-[10px] text-muted-foreground">today</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{activeUsage.activeCallersWeek} wk</span>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1">Users who updated prospect status</p>
          </CardContent>
        </Card>
      </div>

      {/* Power Users - Compact */}
      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5 text-yellow-500" />
            Power Users (Top 10)
            <Badge variant="secondary" className="text-[10px] ml-auto">This Week</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-2 px-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <ScrollArea className="h-[250px]">
              <div className="space-y-1">
                {(powerUsers || []).map((user, index) => (
                  <div key={user.user_id} className="flex items-center gap-2 p-1.5 rounded-md border hover:bg-accent/50 transition-colors">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      index === 0 ? 'bg-yellow-500 text-yellow-950' :
                      index === 1 ? 'bg-gray-300 text-gray-700' :
                      index === 2 ? 'bg-amber-600 text-amber-50' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">
                        {user.display_name || (user.email ? user.email.split('@')[0] : 'User')}
                      </p>
                      <p className="text-[9px] text-muted-foreground truncate">{user.email?.split('@')[0]}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-0.5 text-xs font-medium">
                        <TrendingUp className="h-2.5 w-2.5 text-green-500" />
                        {user.leads_this_week}
                      </div>
                      <p className="text-[9px] text-muted-foreground">{user.total_leads} total</p>
                    </div>
                  </div>
                ))}
                {(powerUsers || []).length === 0 && (
                  <p className="text-center text-muted-foreground text-xs py-4">No activity</p>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
