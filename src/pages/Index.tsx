// Index - Entry Point Router with Leader Share Link + mode-aware landing
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { getMode } from '@/config/modes';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  useEffect(() => {
    if (loading) return;

    const leaderParam = searchParams.get('leader');

    if (user) {
      if (leaderParam) {
        sessionStorage.setItem('pending_leader_id', leaderParam);
      }
      // Wait for profile so we can pick the right landing tab for the active mode.
      if (profileLoading) return;
      const mode = getMode(profile?.mode);
      const landing = mode.nav[0]?.path || '/dashboard';
      navigate(landing, { replace: true });
      return;
    }

    // No user after loading finished. Before redirecting to /auth, double-check that
    // there really is no persisted session in storage — the safety timeout can release
    // `loading` before a slow getSession() resolves.
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

    if (leaderParam) {
      navigate(`/auth?leader=${leaderParam}`, { replace: true });
    } else {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, profile, profileLoading, navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default Index;
