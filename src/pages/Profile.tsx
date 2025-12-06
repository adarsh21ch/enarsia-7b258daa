import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useAdmin } from '@/hooks/useAdmin';
import { BottomNav } from '@/components/layout/BottomNav';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';
import { UpgradeCard } from '@/components/subscription/UpgradeCard';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, LogOut, ChevronRight, Crown, Phone, Building2, MapPin, Loader2, FileText, Shield, Receipt, Mail, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading, updating, updateProfile } = useProfile();
  const { isAdmin } = useAdmin();
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User';
  const userInitials = displayName.slice(0, 2).toUpperCase();

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
              <p className="font-semibold text-lg truncate">{displayName}</p>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
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

        {/* Upgrade Card */}
        <UpgradeCard />

        {/* Profile Details */}
        {(profile?.phone || profile?.company_name || profile?.city || profile?.bio) && (
          <div className="rounded-2xl p-4 bg-card border border-border/50 space-y-3">
            {profile?.phone && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{profile.phone}</p>
                </div>
              </div>
            )}
            {profile?.company_name && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <Building2 className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p className="text-sm font-medium">{profile.company_name}</p>
                </div>
              </div>
            )}
            {profile?.city && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-medium">{profile.city}</p>
                </div>
              </div>
            )}
            {profile?.bio && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Bio</p>
                <p className="text-sm">{profile.bio}</p>
              </div>
            )}
          </div>
        )}

        {/* Menu Items */}
        <div className="space-y-2">
          <button
            onClick={() => setEditOpen(true)}
            className={cn(
              "w-full relative overflow-hidden rounded-xl p-4",
              "bg-gradient-to-r backdrop-blur-sm",
              "border border-border/50 shadow-sm",
              "flex items-center justify-between",
              "transition-all duration-300 hover:shadow-md hover:scale-[1.01]",
              "from-blue-500/20 to-blue-500/5"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-card/50">
                <User className="h-5 w-5" />
              </div>
              <span className="font-medium">Edit Profile</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Admin Panel Link - Only visible to admin */}
          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                "w-full relative overflow-hidden rounded-xl p-4",
                "bg-gradient-to-r backdrop-blur-sm",
                "border border-destructive/30 shadow-sm",
                "flex items-center justify-between",
                "transition-all duration-300 hover:shadow-md hover:scale-[1.01]",
                "from-destructive/20 to-destructive/5"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Settings className="h-5 w-5 text-destructive" />
                </div>
                <span className="font-medium">Admin Panel</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          )}
        </div>

        {/* Contact Us */}
        <div className="rounded-2xl p-4 bg-card border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-3">Contact Us</h3>
          <a
            href="mailto:teamnevorai@gmail.com"
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-primary" />
              <div>
                <span className="text-sm">Email us at:</span>
                <p className="text-sm font-medium text-primary">teamnevorai@gmail.com</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>

        {/* Legal & Policies */}
        <div className="rounded-2xl p-4 bg-card border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-3">Legal & Policies</h3>
          <div className="space-y-2">
            <Link
              to="/terms"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Terms & Conditions</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              to="/privacy"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Privacy Policy</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              to="/refund"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Refund Policy</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
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

      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
        onSave={updateProfile}
        updating={updating}
      />

      <BottomNav />
    </div>
  );
}
