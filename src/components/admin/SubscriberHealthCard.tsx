import { useState } from 'react';
import { useSubscriberHealth, useProUsers } from '@/hooks/useAdminAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Shield, CreditCard, RefreshCw, Loader2, Eye, EyeOff } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { format } from 'date-fns';

type DrawerType = 'active' | 'dormant' | 'organic' | 'admin' | 'repeat' | 'renewals' | null;

export function SubscriberHealthCard() {
  const { data, isLoading } = useSubscriberHealth();
  const { data: proUsers } = useProUsers();
  const [drawer, setDrawer] = useState<DrawerType>(null);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const activePercent = data.totalPaid > 0 ? Math.round((data.activePaid / data.totalPaid) * 100) : 0;

  // Filter users for drawers
  const allPaid = proUsers || [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const getFilteredUsers = (type: DrawerType) => {
    switch (type) {
      case 'organic': return allPaid.filter(u => !u.is_admin_override);
      case 'admin': return allPaid.filter(u => u.is_admin_override);
      case 'active': return allPaid.filter(u => !u.is_expired);
      case 'dormant': return allPaid.filter(u => u.is_expired);
      default: return allPaid;
    }
  };

  const drawerTitles: Record<string, string> = {
    active: 'Active Paid Users',
    dormant: 'Dormant Paid Users',
    organic: 'Organic Paid Users',
    admin: 'Admin Granted Users',
    repeat: 'Repeat Buyers',
    renewals: 'Renewals This Month',
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-red-500" />
            Subscriber Health
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-3">
          {/* Active vs Dormant Bar */}
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
              <button onClick={() => setDrawer('active')} className="hover:text-foreground transition-colors cursor-pointer">
                Active ({data.activePaid})
              </button>
              <button onClick={() => setDrawer('dormant')} className="hover:text-foreground transition-colors cursor-pointer">
                Dormant ({data.dormantPaid})
              </button>
            </div>
            <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden flex">
              <div className="h-full bg-green-500 rounded-l-full transition-all" style={{ width: `${activePercent}%` }} />
              <div className="h-full bg-red-400/60 rounded-r-full transition-all" style={{ width: `${100 - activePercent}%` }} />
            </div>
            <p className="text-[9px] text-muted-foreground mt-0.5">{activePercent}% active in last 7 days</p>
          </div>

          {/* Compact Metrics Grid */}
          <div className="grid grid-cols-4 gap-1.5">
            <MetricButton icon={<CreditCard className="h-3 w-3" />} label="Organic" value={data.organicPaid} accent="green" onClick={() => setDrawer('organic')} />
            <MetricButton icon={<Shield className="h-3 w-3" />} label="Admin" value={data.adminGranted} accent="purple" onClick={() => setDrawer('admin')} />
            <MetricButton icon={<RefreshCw className="h-3 w-3" />} label="Repeat" value={data.repeatBuyers} accent="blue" onClick={() => setDrawer('repeat')} />
            <MetricButton icon={<RefreshCw className="h-3 w-3" />} label="Renewals" value={data.renewalsThisMonth} accent="amber" onClick={() => setDrawer('renewals')} />
          </div>
        </CardContent>
      </Card>

      {/* User List Drawer */}
      <Sheet open={drawer !== null} onOpenChange={() => setDrawer(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="text-sm flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              {drawer ? drawerTitles[drawer] : ''}
              <Badge variant="secondary" className="text-[10px]">{drawer ? getFilteredUsers(drawer).length : 0}</Badge>
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-100px)] mt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] w-6">#</TableHead>
                  <TableHead className="text-[10px]">User</TableHead>
                  <TableHead className="text-[10px]">Plan</TableHead>
                  <TableHead className="text-[10px]">Expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drawer && getFilteredUsers(drawer).map((u, i) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="py-1.5 text-[10px] text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="py-1.5">
                      <div className="text-xs font-medium truncate max-w-[140px]">{u.display_name || 'Unnamed'}</div>
                      <div className="text-[9px] text-muted-foreground truncate max-w-[160px]">{u.email}</div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {u.tier === 'premium' ? 'Pro' : 'Basic'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5 text-[10px]">
                      {u.expires_at ? format(new Date(u.expires_at), 'MMM d, yy') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {drawer && getFilteredUsers(drawer).length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-xs">No users</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

function MetricButton({ icon, label, value, accent, onClick }: { 
  icon: React.ReactNode; label: string; value: number; accent: string; onClick: () => void;
}) {
  const colors: Record<string, string> = {
    green: 'bg-green-500/10 text-green-700 border-green-200 hover:bg-green-500/20',
    purple: 'bg-purple-500/10 text-purple-700 border-purple-200 hover:bg-purple-500/20',
    blue: 'bg-blue-500/10 text-blue-700 border-blue-200 hover:bg-blue-500/20',
    amber: 'bg-amber-500/10 text-amber-700 border-amber-200 hover:bg-amber-500/20',
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg border transition-all cursor-pointer ${colors[accent] || ''}`}
    >
      {icon}
      <p className="text-xs font-bold leading-tight">{value}</p>
      <p className="text-[8px] opacity-70 leading-tight">{label}</p>
    </button>
  );
}
