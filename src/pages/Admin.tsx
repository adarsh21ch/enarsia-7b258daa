import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shield, Users, Crown, ArrowLeft, BarChart3, MessageSquare, Tag, Sliders, Sparkles, History, Bell, IndianRupee, Filter, DatabaseBackup } from 'lucide-react';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';
import { AdminAnalyticsDashboard } from '@/components/admin/AdminAnalyticsDashboard';
import { AdminSupportPanel } from '@/components/admin/AdminSupportPanel';
import { PlansManager } from '@/components/admin/PlansManager';
import { OffersManager } from '@/components/admin/OffersManager';
import { UsageLimitsManager } from '@/components/admin/UsageLimitsManager';
import { FeatureFlagsManager } from '@/components/admin/FeatureFlagsManager';
import { EnhancedUsersTab } from '@/components/admin/EnhancedUsersTab';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';
import { AdminNotificationsPanel } from '@/components/admin/AdminNotificationsPanel';
import { AdminDataRecovery } from '@/components/admin/AdminDataRecovery';

const HEADER_PLAN_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Basic' },
  { value: 'premium', label: 'Pro' },
];

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading } = useAdmin();
  const { data: analytics } = useAdminAnalytics();
  const [activeTab, setActiveTab] = useState('users');
  const [headerPlanFilter, setHeaderPlanFilter] = useState('all');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Shield className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground text-center mb-4">
          You don't have permission to access this page.
        </p>
        <Link to="/profile">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Button>
        </Link>
      </div>
    );
  }

  const formatRevenue = (amount: number) => `₹${(amount / 100).toLocaleString('en-IN')}`;

  return (
    <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50 shrink-0">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <img 
              src={nevoraLogo} 
              alt="NevorAI Logo" 
              className="h-9 w-9 rounded-xl object-cover shadow-md"
            />
            <div>
              <h1 className="text-base font-bold tracking-tight">Admin Panel</h1>
              <p className="text-[10px] text-muted-foreground font-medium">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Plan filter in header */}
            <Select value={headerPlanFilter} onValueChange={(v) => { setHeaderPlanFilter(v); setActiveTab('users'); }}>
              <SelectTrigger className="h-7 w-[80px] text-[10px] border-border/50">
                <Filter className="h-3 w-3 mr-0.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HEADER_PLAN_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]">
              <Shield className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          </div>
        </div>

        {/* Sticky KPI Bar */}
        {analytics && (
          <div className="flex items-center justify-around px-3 py-1.5 bg-muted/40 border-t border-border/30 text-[11px]">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="font-semibold">{analytics.totalSignups.toLocaleString()}</span>
              <span className="text-muted-foreground">Users</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1">
              <Crown className="h-3 w-3 text-yellow-500" />
              <span className="font-semibold">{analytics.activeProUsers}</span>
              <span className="text-muted-foreground">Paid</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1">
              <IndianRupee className="h-3 w-3 text-green-600" />
              <span className="font-semibold">{formatRevenue(analytics.revenue.totalRevenue)}</span>
            </div>
          </div>
        )}
      </header>

      <main className="scrollable-content">
        <div className="container py-3 px-3 pb-24 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <ScrollArea className="w-full">
              <TabsList className="inline-flex w-max gap-0.5 h-9">
                <TabsTrigger value="users" className="text-[11px] px-2.5 h-7">
                  <Users className="h-3 w-3 mr-1" />Users
                </TabsTrigger>
                <TabsTrigger value="analytics" className="text-[11px] px-2.5 h-7">
                  <BarChart3 className="h-3 w-3 mr-1" />Analytics
                </TabsTrigger>
                <TabsTrigger value="plans" className="text-[11px] px-2.5 h-7">
                  <Crown className="h-3 w-3 mr-1" />Plans
                </TabsTrigger>
                <TabsTrigger value="offers" className="text-[11px] px-2.5 h-7">
                  <Tag className="h-3 w-3 mr-1" />Offers
                </TabsTrigger>
                <TabsTrigger value="limits" className="text-[11px] px-2.5 h-7">
                  <Sliders className="h-3 w-3 mr-1" />Limits
                </TabsTrigger>
                <TabsTrigger value="features" className="text-[11px] px-2.5 h-7">
                  <Sparkles className="h-3 w-3 mr-1" />Features
                </TabsTrigger>
                <TabsTrigger value="support" className="text-[11px] px-2.5 h-7">
                  <MessageSquare className="h-3 w-3 mr-1" />Support
                </TabsTrigger>
                <TabsTrigger value="audit" className="text-[11px] px-2.5 h-7">
                  <History className="h-3 w-3 mr-1" />Audit
                </TabsTrigger>
                <TabsTrigger value="notify" className="text-[11px] px-2.5 h-7">
                  <Bell className="h-3 w-3 mr-1" />Notify
                </TabsTrigger>
                <TabsTrigger value="recovery" className="text-[11px] px-2.5 h-7">
                  <DatabaseBackup className="h-3 w-3 mr-1" />Recovery
                </TabsTrigger>
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <TabsContent value="users" className="mt-3">
              <EnhancedUsersTab headerPlanFilter={headerPlanFilter} />
            </TabsContent>
            <TabsContent value="analytics" className="mt-3">
              <AdminAnalyticsDashboard />
            </TabsContent>
            <TabsContent value="plans" className="mt-3">
              <PlansManager />
            </TabsContent>
            <TabsContent value="offers" className="mt-3">
              <OffersManager />
            </TabsContent>
            <TabsContent value="limits" className="mt-3">
              <UsageLimitsManager />
            </TabsContent>
            <TabsContent value="features" className="mt-3">
              <FeatureFlagsManager />
            </TabsContent>
            <TabsContent value="support" className="mt-3">
              <AdminSupportPanel />
            </TabsContent>
            <TabsContent value="audit" className="mt-3">
              <AuditLogViewer />
            </TabsContent>
            <TabsContent value="notify" className="mt-3">
              <AdminNotificationsPanel />
            </TabsContent>
            <TabsContent value="recovery" className="mt-3">
              <AdminDataRecovery />
            </TabsContent>
          </Tabs>

          <Link to="/profile">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profile
            </Button>
          </Link>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
