import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, LogOut, Settings, Bell, HelpCircle, ChevronRight, Crown } from 'lucide-react';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

const menuItems = [
  { icon: User, label: 'Edit Profile', color: 'from-blue-500/20 to-blue-500/5' },
  { icon: Bell, label: 'Notifications', color: 'from-violet-500/20 to-violet-500/5' },
  { icon: Settings, label: 'Settings', color: 'from-slate-500/20 to-slate-500/5' },
  { icon: HelpCircle, label: 'Help & Support', color: 'from-emerald-500/20 to-emerald-500/5' },
];

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const userInitials = user.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-24">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img 
              src={nevoraLogo} 
              alt="NevorAI Logo" 
              className="h-10 w-10 rounded-xl object-cover shadow-md"
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight">NevorAI</h1>
              <p className="text-[10px] text-muted-foreground font-medium">Never miss a followup Again</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-4 px-4 space-y-4">
        <div className="mb-5">
          <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
          <p className="text-sm text-muted-foreground">Manage your account</p>
          <div className="flex items-center gap-1 mt-2">
            <div className="w-8 h-1 bg-primary rounded-full" />
            <div className="w-2 h-1 bg-primary/50 rounded-full" />
            <div className="w-1 h-1 bg-primary/30 rounded-full" />
          </div>
        </div>
        {/* User Card */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 shadow-lg">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 ring-4 ring-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xl font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{user.email}</p>
              <div className="flex items-center gap-1 mt-1">
                <div className="flex items-center gap-1 text-xs bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded-full">
                  <Crown className="h-3 w-3" />
                  <span className="font-medium">Free Plan</span>
                </div>
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-primary/5" />
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-primary/5" />
        </div>

        {/* Menu Items */}
        <div className="space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className={cn(
                  "w-full relative overflow-hidden rounded-xl p-4",
                  "bg-gradient-to-r backdrop-blur-sm",
                  "border border-border/50 shadow-sm",
                  "flex items-center justify-between",
                  "transition-all duration-300 hover:shadow-md hover:scale-[1.01]",
                  item.color
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-card/50">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            );
          })}
        </div>

        {/* Sign Out */}
        <Button 
          variant="destructive" 
          className="w-full h-12 rounded-xl shadow-lg shadow-destructive/20 mt-4"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5 mr-2" />
          Sign Out
        </Button>
      </main>

      <BottomNav />
    </div>
  );
}
