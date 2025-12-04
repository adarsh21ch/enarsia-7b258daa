import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, LogOut, Settings, Bell, HelpCircle } from 'lucide-react';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

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
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-4">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account</p>
      </header>

      <main className="container py-4 px-4 space-y-4">
        {/* User Info */}
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">{user.email}</p>
              <p className="text-xs text-muted-foreground">Free Plan</p>
            </div>
          </CardContent>
        </Card>

        {/* Menu Items */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-2 space-y-1">
            <Button variant="ghost" className="w-full justify-start gap-3 h-12">
              <User className="h-5 w-5" />
              Edit Profile
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 h-12">
              <Bell className="h-5 w-5" />
              Notifications
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 h-12">
              <Settings className="h-5 w-5" />
              Settings
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 h-12">
              <HelpCircle className="h-5 w-5" />
              Help & Support
            </Button>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button 
          variant="destructive" 
          className="w-full h-12"
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
