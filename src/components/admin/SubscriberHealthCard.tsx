import { useSubscriberHealth } from '@/hooks/useAdminAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, UserCheck, UserX, Shield, CreditCard, RefreshCw, Loader2 } from 'lucide-react';

export function SubscriberHealthCard() {
  const { data, isLoading } = useSubscriberHealth();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const activePercent = data.totalPaid > 0 ? Math.round((data.activePaid / data.totalPaid) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Heart className="h-4 w-4 text-red-500" />
          Subscriber Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active vs Dormant Bar */}
        <div>
          <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
            <span>Active ({data.activePaid})</span>
            <span>Dormant ({data.dormantPaid})</span>
          </div>
          <div className="w-full h-3 rounded-full bg-muted overflow-hidden flex">
            <div
              className="h-full bg-green-500 rounded-l-full transition-all"
              style={{ width: `${activePercent}%` }}
            />
            <div
              className="h-full bg-red-400/60 rounded-r-full transition-all"
              style={{ width: `${100 - activePercent}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{activePercent}% of paid users active in last 7 days</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2">
          <MetricBadge icon={<CreditCard className="h-3 w-3" />} label="Organic Paid" value={data.organicPaid} accent="green" />
          <MetricBadge icon={<Shield className="h-3 w-3" />} label="Admin Granted" value={data.adminGranted} accent="purple" />
          <MetricBadge icon={<RefreshCw className="h-3 w-3" />} label="Repeat Buyers" value={data.repeatBuyers} accent="blue" />
          <MetricBadge icon={<RefreshCw className="h-3 w-3" />} label="Renewals (Month)" value={data.renewalsThisMonth} accent="amber" />
        </div>
      </CardContent>
    </Card>
  );
}

function MetricBadge({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-500/10 text-green-700 border-green-200',
    purple: 'bg-purple-500/10 text-purple-700 border-purple-200',
    blue: 'bg-blue-500/10 text-blue-700 border-blue-200',
    amber: 'bg-amber-500/10 text-amber-700 border-amber-200',
  };

  return (
    <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border ${colors[accent] || ''}`}>
      {icon}
      <div>
        <p className="text-[10px] opacity-70">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}
