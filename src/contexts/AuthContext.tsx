import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getPublishedAppUrl } from '@/config/siteUrl';
import { clearTrackingFormatCache } from '@/hooks/useTrackingFormat';
import { clearFunnelConfigCache } from '@/hooks/useFunnelConfig';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session expiry buffer: refresh if expiring within 5 minutes
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

// Debug logging helper
const logAuth = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[Auth ${timestamp}] ${message}`, data ?? '');
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Track if initial session restore is complete
  const initialRestoreComplete = useRef(false);
  // Prevent concurrent refresh attempts
  const isRefreshing = useRef(false);

  // Refresh session if it's close to expiry
  const refreshSessionIfNeeded = useCallback(async () => {
    if (isRefreshing.current) {
      logAuth('Refresh already in progress, skipping');
      return;
    }

    try {
      isRefreshing.current = true;
      
      const { data: { session: currentSession }, error: getError } = await supabase.auth.getSession();
      
      if (getError) {
        logAuth('Error getting session for refresh check', getError);
        return;
      }

      if (!currentSession) {
        logAuth('No session to refresh');
        return;
      }

      const expiresAt = currentSession.expires_at;
      if (!expiresAt) {
        logAuth('Session has no expiry time');
        return;
      }

      const expiryTime = expiresAt * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeUntilExpiry = expiryTime - now;

      logAuth('Session expiry check', {
        expiresAt: new Date(expiryTime).toISOString(),
        now: new Date(now).toISOString(),
        timeUntilExpiryMinutes: Math.round(timeUntilExpiry / 60000)
      });

      // Refresh if expiring within buffer time
      if (timeUntilExpiry < REFRESH_BUFFER_MS) {
        logAuth('Session expiring soon, refreshing...');
        
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          logAuth('Session refresh failed', refreshError);
          // Don't sign out on refresh failure - let the session naturally expire
          // User will be prompted to login again only when the session is truly invalid
        } else if (refreshData.session) {
          logAuth('Session refreshed successfully', {
            newExpiresAt: new Date((refreshData.session.expires_at ?? 0) * 1000).toISOString()
          });
        }
      } else {
        logAuth('Session still valid, no refresh needed');
      }
    } catch (error) {
      logAuth('Unexpected error during session refresh', error);
    } finally {
      isRefreshing.current = false;
    }
  }, []);

  // Handle visibility change (app comes to foreground)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        logAuth('App became visible, checking session...');
        refreshSessionIfNeeded();
      }
    };

    // Also handle window focus for desktop
    const handleFocus = () => {
      logAuth('Window gained focus, checking session...');
      refreshSessionIfNeeded();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshSessionIfNeeded]);

  useEffect(() => {
    const liveUrl = getPublishedAppUrl();

    // Check if we're on a preview URL with auth tokens - redirect to live domain
    const isPreviewUrl = window.location.hostname.endsWith('.lovable.app') && window.location.origin !== liveUrl;
    const hasAuthToken = window.location.hash.includes('access_token');

    if (isPreviewUrl && hasAuthToken) {
      // Redirect to live domain preserving the current route + hash (works for password recovery too)
      window.location.href = `${liveUrl}${window.location.pathname}${window.location.search}${window.location.hash}`;
      return;
    }

    const applySession = (nextSession: Session | null, event?: AuthChangeEvent) => {
      logAuth('Applying session', { 
        event,
        hasSession: !!nextSession,
        userId: nextSession?.user?.id?.substring(0, 8),
        expiresAt: nextSession?.expires_at ? new Date(nextSession.expires_at * 1000).toISOString() : null
      });

      if (!nextSession?.access_token) {
        // No session → logged out
        // Only clear state if we're not in initial loading OR if this is an explicit sign out event
        if (initialRestoreComplete.current || event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        }
        setLoading(false);
        return;
      }

      // We have a valid session - apply it
      setSession(nextSession);
      setUser(nextSession.user);
      setLoading(false);
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      logAuth('Auth state changed', { event });
      
      // Handle specific events
      switch (event) {
        case 'SIGNED_IN':
          logAuth('User signed in');
          break;
        case 'SIGNED_OUT':
          logAuth('User signed out');
          break;
        case 'TOKEN_REFRESHED':
          logAuth('Token refreshed automatically');
          break;
        case 'USER_UPDATED':
          logAuth('User updated');
          break;
        case 'PASSWORD_RECOVERY':
          logAuth('Password recovery initiated');
          break;
      }

      applySession(nextSession, event);
    });

    // THEN check for existing session
    logAuth('Checking for existing session...');
    supabase.auth.getSession().then(({ data: { session: nextSession }, error }) => {
      if (error) {
        logAuth('Error getting initial session', error);
      } else {
        logAuth('Initial session loaded', { 
          hasSession: !!nextSession,
          userId: nextSession?.user?.id?.substring(0, 8)
        });
      }
      
      initialRestoreComplete.current = true;
      applySession(nextSession);
      
      // If we have a session, check if it needs refreshing
      if (nextSession) {
        refreshSessionIfNeeded();
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshSessionIfNeeded]);

  const signUp = async (email: string, password: string) => {
    logAuth('Sign up attempt', { email });
    // Use live domain for email redirect to avoid preview shell issues
    const liveUrl = getPublishedAppUrl();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${liveUrl}/`
      }
    });
    if (error) {
      logAuth('Sign up error', error.message);
    } else {
      logAuth('Sign up successful');
    }
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    logAuth('Sign in attempt', { email });
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      logAuth('Sign in error', error.message);
    } else {
      logAuth('Sign in successful');
    }
    return { error: error as Error | null };
  };

  const signOut = async () => {
    logAuth('Manual sign out initiated');
    try {
      await supabase.auth.signOut();
      logAuth('Sign out successful');
    } catch (error) {
      logAuth('Sign out error', error);
    }
    // Always clear local state even if server call fails
    setSession(null);
    setUser(null);
    // Clear cached tracking data
    clearTrackingFormatCache();
    clearFunnelConfigCache();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
