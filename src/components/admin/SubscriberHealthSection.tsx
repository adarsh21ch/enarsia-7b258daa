import { useSubscriberHealth, useProUsers } from '@/hooks/useAdminAnalytics';
import { Badge } from '@/components/ui/badge';
import { Heart, CreditCard, Shield, RefreshCw, Loader2, Bell } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

type DrawerType = 'active' | 'dormant' | 'organic' | 'admin' | 'repeat' | 'renewals' | null;

export function SubscriberHealthSection() {
  const { data, isLoading } = useSubscriberHealth();
  const { data: proUsers } = useProUsers();
  const [drawer, setDrawer] = useState<DrawerType>(null);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-4 flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const activePercent = data.totalPaid > 0 ? Math.round((data.activePaid / data.totalPaid) * 100) : 0;
  const dormantPercent = 100 - activePercent;

  const allPaid = proUsers || [];

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
      <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-bold font-heading">Subscriber Health</h3>
        </div>

        {/* Active vs Dormant Bar */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <button onClick={() => setDrawer('active')} className="hover:text-foreground transition-colors cursor-pointer">
              Active (using app) <span className="font-bold text-foreground">{data.activePaid}</span>
            </button>
            <button onClick={() => setDrawer('dormant')} className="hover:text-foreground transition-colors cursor-pointer">
              Dormant <span className="font-bold text-foreground">{data.dormantPaid}</span>
            </button>
          </div>
          <div className="w-full h-3 rounded-full bg-muted overflow-hidden flex">
            <div className="h-full bg-emerald-500 rounded-l-full transition-all" style={{ width: `${activePercent}%` }} />
            <div className="h-full bg-red-400/50 rounded-r-full transition-all" style={{ width: `${dormantPercent}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">{activePercent}% active</span>
            <span className="text-[10px] text-muted-foreground">{dormantPercent}% dormant</span>
          </div>
        </div>

        {/* Dormant Warning + CTA */}
        {data.dormantPaid > 0 && (
          <div className="rounded-xl bg-amber-500/8 dark:bg-amber-500/10 border border-amber-500/20 p-3">
            <p className="text-xs text-amber-800 dark:text-amber-300 mb-2">
              ⚠️ {data.dormantPaid} paid users haven't opened app in 7 days
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
            >
              <Bell className="h-3 w-3 mr-1.5" />
              Send Re-engagement Notification →
            </Button>
          </div>
        )}

        {/* Subscriber Type Badges */}
        <div className="grid grid-cols-4 gap-2">
          <TypeBadge icon={<CreditCard className="h-3.5 w-3.5" />} label="Organic" value={data.organicPaid} color="emerald" onClick={() => setDrawer('organic')} />
          <TypeBadge icon={<Shield className="h-3.5 w-3.5" />} label="Admin" value={data.adminGranted} color="purple" onClick={() => setDrawer('admin')} />
          <TypeBadge icon={<RefreshCw className="h-3.5 w-3.5" />} label="Repeat" value={data.repeatBuyers} color="blue" onClick={() => setDrawer('repeat')} />
          <TypeBadge icon={<RefreshCw className="h-3.5 w-3.5" />} label="Renewals" value={data.renewalsThisMonth} color="amber" onClick={() => setDrawer('renewals')} />
        </div>
      </div>

      {/* Drawer */}
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
                      <Badge variant="outline" className="text-[9px] px-1 py-0">Pro</Badge>
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

function TypeBadge({ icon, label, value, color, onClick }: {
  icon: React.ReactNode; label: string; value: number; color: string; onClick: () => void;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-500/20',
    purple: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:bg-purple-500/20',
    blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-500/20',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-500/20',
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border transition-all cursor-pointer ${colorMap[color] || ''}`}
    >
      {icon}
      <p className="text-base font-bold leading-tight">{value}</p>
      <p className="text-[9px] opacity-70 leading-tight">{label}</p>
    </button>
  );
}
