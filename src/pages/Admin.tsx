import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Shield, Users, Crown, ArrowLeft, Receipt } from 'lucide-react';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, users, loading, fetchAllUsers, toggleUserAccess } = useAdmin();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchAllUsers();
    }
  }, [isAdmin, fetchAllUsers]);

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
              <p className="text-[10px] text-muted-foreground font-medium">Manage user access</p>
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
          {/* Stats - Fixed at top of content */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="rounded-xl p-4 bg-card border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Total Users</span>
              </div>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
            <div className="rounded-xl p-4 bg-card border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <span className="text-sm text-muted-foreground">Pro Users</span>
              </div>
              <p className="text-2xl font-bold">
                {users.filter(u => u.plan === 'pro').length}
              </p>
            </div>
          </div>

          {/* User List - Scrollable */}
          <div className="rounded-2xl bg-card border border-border/50 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border/50 bg-muted/30 shrink-0">
              <h3 className="font-semibold">All Users</h3>
            </div>
            <div className="divide-y divide-border/50 overflow-y-auto max-h-[60vh]">
              {users.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No users found</p>
                </div>
              ) : (
                users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{u.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="outline" 
                          className={u.plan === 'pro' 
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' 
                            : 'bg-muted text-muted-foreground'
                          }
                        >
                          {u.plan === 'pro' ? (
                            <>
                              <Crown className="h-3 w-3 mr-1" />
                              Pro
                            </>
                          ) : 'Free'}
                        </Badge>
                        {u.is_admin_override && (
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                            Admin Override
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-muted-foreground">Pro</span>
                      <Switch
                        checked={u.plan === 'pro'}
                        onCheckedChange={(checked) => {
                          toggleUserAccess(u.id, checked);
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Link to="/admin-payments" className="flex-1">
              <Button variant="outline" className="w-full">
                <Receipt className="h-4 w-4 mr-2" />
                Payment Logs
              </Button>
            </Link>
            <Link to="/profile" className="flex-1">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Profile
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
