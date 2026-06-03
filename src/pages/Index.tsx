// Index - Entry Point Router with Leader Share Link + mode-aware landing
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { getMode } from '@/config/modes';
import { Loader2 } from 'lucide-react';
import Landing from './Landing';

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    if (loading) return;

    const leaderParam = searchParams.get('leader');

    if (user) {
      if (leaderParam) {
        sessionStorage.setItem('pending_leader_id', leaderParam);
      }
      if (profileLoading) return;
      const mode = getMode(profile?.mode);
      const landing = mode.nav[0]?.path || '/dashboard';
      navigate(landing, { replace: true });
      return;
    }

    // Check for persisted session before treating as logged out
    const hasStoredSession = (() => {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
            const raw = localStorage.getItem(key);
            if (raw && raw.includes('access_token')) return true;
          }
        }
      } catch {}
      return false;
    })();

    if (hasStoredSession) return;

    // Logged out + referral link → go straight to signup
    if (leaderParam) {
      navigate(`/auth?leader=${leaderParam}`, { replace: true });
      return;
    }

    // Installed PWA (Add to Home Screen) → skip marketing, go straight to auth
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(display-mode: standalone)').matches ||
        // @ts-expect-error legacy iOS standalone flag
        window.navigator.standalone === true);
    if (isStandalone) {
      navigate('/auth', { replace: true });
      return;
    }

    // Logged out, no leader, browser → show marketing landing page
    setShowLanding(true);
  }, [user, loading, profile, profileLoading, navigate, searchParams]);

  if (showLanding) return <Landing />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default Index;
