// Index - Entry Point Router with Leader Share Link Support
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      // Get the leader parameter from share link
      const leaderParam = searchParams.get('leader');
      
      if (user) {
        // If there's a leader param, store it for processing after profile loads
        if (leaderParam) {
          sessionStorage.setItem('pending_leader_id', leaderParam);
        }
        // Default tab is now Calling (/dashboard)
        navigate('/dashboard', { replace: true });
      } else {
        // Not logged in - redirect to auth with leader param preserved
        if (leaderParam) {
          navigate(`/auth?leader=${leaderParam}`, { replace: true });
        } else {
          navigate('/auth', { replace: true });
        }
      }
    }
  }, [user, loading, navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default Index;
