import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, Shield, Users, Crown, ArrowLeft, BarChart3, MessageSquare, Tag, Sliders, Sparkles, History } from 'lucide-react';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';
import { AdminAnalyticsDashboard } from '@/components/admin/AdminAnalyticsDashboard';
import { AdminSupportPanel } from '@/components/admin/AdminSupportPanel';
import { PlansManager } from '@/components/admin/PlansManager';
import { OffersManager } from '@/components/admin/OffersManager';
import { UsageLimitsManager } from '@/components/admin/UsageLimitsManager';
import { FeatureFlagsManager } from '@/components/admin/FeatureFlagsManager';
import { EnhancedUsersTab } from '@/components/admin/EnhancedUsersTab';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading } = useAdmin();

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

  return (
    <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50 shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img 
              src={nevoraLogo} 
              alt="NevorAI Logo" 
              className="h-10 w-10 rounded-xl object-cover shadow-md"
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight">Admin Panel</h1>
              <p className="text-[10px] text-muted-foreground font-medium">Manage user subscriptions</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        </div>
      </header>

      <main className="scrollable-content">
        <div className="container py-4 px-4 pb-24 space-y-5">
          {/* Admin Tabs */}
          <Tabs defaultValue="users" className="w-full">
            <ScrollArea className="w-full">
              <TabsList className="inline-flex w-max gap-1">
                <TabsTrigger value="users" className="text-xs px-3">
                  <Users className="h-3.5 w-3.5 mr-1" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="analytics" className="text-xs px-3">
                  <BarChart3 className="h-3.5 w-3.5 mr-1" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="plans" className="text-xs px-3">
                  <Crown className="h-3.5 w-3.5 mr-1" />
                  Plans
                </TabsTrigger>
                <TabsTrigger value="offers" className="text-xs px-3">
                  <Tag className="h-3.5 w-3.5 mr-1" />
                  Offers
                </TabsTrigger>
                <TabsTrigger value="limits" className="text-xs px-3">
                  <Sliders className="h-3.5 w-3.5 mr-1" />
                  Limits
                </TabsTrigger>
                <TabsTrigger value="features" className="text-xs px-3">
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Features
                </TabsTrigger>
              <TabsTrigger value="support" className="text-xs px-3">
                  <MessageSquare className="h-3.5 w-3.5 mr-1" />
                  Support
                </TabsTrigger>
                <TabsTrigger value="audit" className="text-xs px-3">
                  <History className="h-3.5 w-3.5 mr-1" />
                  Audit Log
                </TabsTrigger>
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {/* Users Tab - Enhanced */}
            <TabsContent value="users" className="mt-4">
              <EnhancedUsersTab />
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="mt-4">
              <AdminAnalyticsDashboard />
            </TabsContent>

            {/* Plans Tab */}
            <TabsContent value="plans" className="mt-4">
              <PlansManager />
            </TabsContent>

            {/* Offers Tab */}
            <TabsContent value="offers" className="mt-4">
              <OffersManager />
            </TabsContent>

            {/* Limits Tab */}
            <TabsContent value="limits" className="mt-4">
              <UsageLimitsManager />
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features" className="mt-4">
              <FeatureFlagsManager />
            </TabsContent>

            {/* Support Tab */}
            <TabsContent value="support" className="mt-4">
              <AdminSupportPanel />
            </TabsContent>

            {/* Audit Log Tab */}
            <TabsContent value="audit" className="mt-4">
              <AuditLogViewer />
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
