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
import { Loader2, Shield, Users, Crown, ArrowLeft, BarChart3, IndianRupee, Wrench, Megaphone, Tag } from 'lucide-react';
import nevoraLogo from '@/assets/nevorai-call-logo.png';
import { AdminAnalyticsDashboard } from '@/components/admin/AdminAnalyticsDashboard';
import { EnhancedUsersTab } from '@/components/admin/EnhancedUsersTab';
import { NewSignupsView } from '@/components/admin/NewSignupsView';
import { RevenueTab } from '@/components/admin/RevenueTab';
import { PlansTab } from '@/components/admin/PlansTab';
import { ManageTab } from '@/components/admin/ManageTab';
import { BroadcastTab } from '@/components/admin/BroadcastTab';



export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading } = useAdmin();
  const { data: analytics } = useAdminAnalytics();
  const [activeTab, setActiveTab] = useState('overview');

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
              alt="Nevorai CRM Logo" 
              className="h-9 w-9 object-contain"
            />
            <div>
              <h1 className="text-base font-bold tracking-tight font-heading">Admin Panel</h1>
              <p className="text-[10px] text-muted-foreground font-medium">Admin Dashboard</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        </div>

        {/* Persistent 3-metric quick bar */}
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
            <TabsList className="w-full grid grid-cols-6 h-10">
              <TabsTrigger value="overview" className="text-[10px] px-1 h-8 gap-1">
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="text-[10px] px-1 h-8 gap-1">
                <Users className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="plans" className="text-[10px] px-1 h-8 gap-1">
                <Tag className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Plans</span>
              </TabsTrigger>
              <TabsTrigger value="revenue" className="text-[10px] px-1 h-8 gap-1">
                <IndianRupee className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Revenue</span>
              </TabsTrigger>
              <TabsTrigger value="manage" className="text-[10px] px-1 h-8 gap-1">
                <Wrench className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Manage</span>
              </TabsTrigger>
              <TabsTrigger value="broadcast" className="text-[10px] px-1 h-8 gap-1">
                <Megaphone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Broadcast</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-3">
              <AdminAnalyticsDashboard />
            </TabsContent>
            <TabsContent value="users" className="mt-3">
              <Tabs defaultValue="all-users" className="w-full">
                <TabsList className="w-full grid grid-cols-2 h-9 mb-3">
                  <TabsTrigger value="all-users" className="text-xs">All Users</TabsTrigger>
                  <TabsTrigger value="new-signups" className="text-xs">New Signups</TabsTrigger>
                </TabsList>
                <TabsContent value="all-users">
                  <EnhancedUsersTab headerPlanFilter="all" />
                </TabsContent>
                <TabsContent value="new-signups">
                  <NewSignupsView />
                </TabsContent>
              </Tabs>
            </TabsContent>
            <TabsContent value="plans" className="mt-3">
              <PlansTab />
            </TabsContent>
            <TabsContent value="revenue" className="mt-3">
              <RevenueTab />
            </TabsContent>

            <TabsContent value="manage" className="mt-3">
              <ManageTab />
            </TabsContent>
            <TabsContent value="broadcast" className="mt-3">
              <BroadcastTab />
            </TabsContent>
          </Tabs>

          <Link to="/profile">
            <Button variant="outline" className="w-full rounded-xl">
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
