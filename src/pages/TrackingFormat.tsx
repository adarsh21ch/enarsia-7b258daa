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
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Sticky header */}
      <header className="flex-shrink-0 bg-background border-b border-border/50 z-30">
        <div className="flex items-center gap-3 px-4 py-3 max-w-3xl mx-auto w-full">
          <button
            onClick={() => navigate('/profile')}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">Tracking Format</h1>
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto w-full px-4 py-5 pb-28">
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
