import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useChurnRiskUsers } from '@/hooks/useAdminAnalytics';
import { Loader2, AlertTriangle, Clock, UserX, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function ChurnRiskAlert() {
  const { data, isLoading, error } = useChurnRiskUsers();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        Failed to load churn risk data
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-4 pb-3 text-center">
          <div className="text-green-600 text-sm font-medium">
            🎉 No at-risk users detected!
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            All users are actively engaged
          </p>
        </CardContent>
      </Card>
    );
  }

  const trialExpiring = data.filter(u => u.riskType === 'trial_expiring');
  const becomingInactive = data.filter(u => u.riskType === 'becoming_inactive');
  const atRisk = data.filter(u => u.riskType === 'at_risk');

  const getRiskIcon = (type: string) => {
    switch (type) {
      case 'trial_expiring': return <Timer className="h-3 w-3 text-yellow-600" />;
      case 'becoming_inactive': return <Clock className="h-3 w-3 text-orange-600" />;
      case 'at_risk': return <UserX className="h-3 w-3 text-red-600" />;
      default: return <AlertTriangle className="h-3 w-3" />;
    }
  };

  const getRiskBadge = (type: string) => {
    switch (type) {
      case 'trial_expiring': 
        return <Badge className="bg-yellow-100 text-yellow-800 text-[9px]">Trial Expiring</Badge>;
      case 'becoming_inactive': 
        return <Badge className="bg-orange-100 text-orange-800 text-[9px]">Becoming Inactive</Badge>;
      case 'at_risk': 
        return <Badge className="bg-red-100 text-red-800 text-[9px]">At Risk</Badge>;
      default: 
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className={trialExpiring.length > 0 ? 'border-yellow-500/30 bg-yellow-500/5' : ''}>
          <CardContent className="pt-3 pb-2 text-center">
            <Timer className="h-4 w-4 mx-auto mb-1 text-yellow-600" />
            <p className="text-lg font-bold">{trialExpiring.length}</p>
            <p className="text-[10px] text-muted-foreground">Trial Expiring</p>
          </CardContent>
        </Card>
        <Card className={becomingInactive.length > 0 ? 'border-orange-500/30 bg-orange-500/5' : ''}>
          <CardContent className="pt-3 pb-2 text-center">
            <Clock className="h-4 w-4 mx-auto mb-1 text-orange-600" />
            <p className="text-lg font-bold">{becomingInactive.length}</p>
            <p className="text-[10px] text-muted-foreground">Going Inactive</p>
          </CardContent>
        </Card>
        <Card className={atRisk.length > 0 ? 'border-red-500/30 bg-red-500/5' : ''}>
          <CardContent className="pt-3 pb-2 text-center">
            <UserX className="h-4 w-4 mx-auto mb-1 text-red-600" />
            <p className="text-lg font-bold">{atRisk.length}</p>
            <p className="text-[10px] text-muted-foreground">At Risk</p>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            At-Risk Users
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-80 overflow-y-auto">
          {data.map((user, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-2 min-w-0">
                {getRiskIcon(user.riskType)}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.displayName || user.email?.split('@')[0] || 'Unknown'}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {user.neveraiId || user.email}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 ml-2">
                {getRiskBadge(user.riskType)}
                <span className="text-[10px] text-muted-foreground">
                  {user.riskType === 'trial_expiring' 
                    ? `${user.trialDaysRemaining}d left`
                    : `${user.daysSinceActive}d ago`
                  }
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Action Suggestions */}
      <Card className="border-primary/30">
        <CardContent className="pt-4 pb-3">
          <div className="text-xs font-medium text-primary mb-2">💡 Suggested Actions</div>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Send reminder emails to users with expiring trials</li>
            <li>• Offer limited-time discounts to inactive users</li>
            <li>• Reach out personally to high-value at-risk users</li>
            <li>• Consider extending trials for engaged but not converted users</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
