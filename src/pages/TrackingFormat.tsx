import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { LeaderTrackingFormatSettings } from '@/components/profile/LeaderTrackingFormatSettings';
import { BottomNav } from '@/components/layout/BottomNav';
import { ArrowLeft, Users } from 'lucide-react';

export default function TrackingFormat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, updateProfile, updating, updateUplineByEmail, clearLeaderHierarchy } = useProfile();

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto w-full">
          <button
            onClick={() => navigate('/profile')}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Upline Tracking Format</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto w-full px-4 py-4">
          <LeaderTrackingFormatSettings
            profile={profile}
            updating={updating}
            onUpdateProfile={updateProfile}
            onUpdateUplineByEmail={updateUplineByEmail}
            onClearLeaderHierarchy={clearLeaderHierarchy}
          />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
