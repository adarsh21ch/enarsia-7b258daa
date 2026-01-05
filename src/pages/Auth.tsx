import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft, User } from 'lucide-react';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';
import { formatLeaderId } from '@/lib/leaderIdFormat';
import { getPasswordRecoveryRedirectUrl } from '@/config/siteUrl';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const [emailOrLeaderId, setEmailOrLeaderId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  // Get leader parameter from share link
  const leaderParam = searchParams.get('leader');

  useEffect(() => {
    if (user && !authLoading) {
      // If there's a leader param, store it for processing after profile is ready
      if (leaderParam) {
        sessionStorage.setItem('pending_leader_id', leaderParam);
      }
      navigate('/home');
    }
  }, [user, authLoading, navigate, leaderParam]);

  // Helper to check if input is an email
  const isEmail = (input: string) => input.includes('@');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrLeaderId || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsSubmitting(true);
    
    let email = emailOrLeaderId;
    
    // If not an email, look up by Leader ID
    if (!isEmail(emailOrLeaderId)) {
      const { data, error } = await supabase.rpc('get_user_email_by_leader_id', {
        target_leader_id: emailOrLeaderId.trim()
      });
      
      if (error || !data || data.length === 0) {
        toast.error('Leader ID not found. Check the ID or use your email instead.');
        setIsSubmitting(false);
        return;
      }
      
      email = data[0].email;
    }
    
    const { error } = await signIn(email, password);
    if (error) {
      // Handle specific error cases with user-friendly messages
      const errorMessage = error.message?.toLowerCase() || '';
      
      if (errorMessage.includes('invalid login credentials') || errorMessage.includes('invalid credentials')) {
        toast.error('Invalid email or password. Please check your credentials or use "Forgot Password" to reset.');
      } else if (errorMessage.includes('email not confirmed')) {
        toast.error('Please confirm your email before signing in. Check your inbox for the confirmation link.');
      } else if (errorMessage.includes('user not found')) {
        toast.error('No account found with this email. Please sign up first.');
      } else if (errorMessage.includes('too many requests')) {
        toast.error('Too many login attempts. Please wait a few minutes and try again.');
      } else {
        toast.error(error.message || 'Sign in failed. Please try again.');
      }
    } else {
      // Store leader param for processing
      if (leaderParam) {
        sessionStorage.setItem('pending_leader_id', leaderParam);
      }
      toast.success('Welcome back!');
      navigate('/home');
    }
    setIsSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !emailOrLeaderId || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (!isEmail(emailOrLeaderId)) {
      toast.error('Please enter a valid email address for sign up');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setIsSubmitting(true);
    const { error } = await signUp(emailOrLeaderId, password);
    if (error) {
      const errorMessage = error.message?.toLowerCase() || '';
      
      if (errorMessage.includes('user already registered') || errorMessage.includes('already exists')) {
        toast.error('An account with this email already exists. Please sign in instead.');
        setIsSignUp(false); // Switch to sign-in mode
      } else if (errorMessage.includes('invalid email')) {
        toast.error('Please enter a valid email address.');
      } else if (errorMessage.includes('password')) {
        toast.error('Password must be at least 6 characters long.');
      } else {
        toast.error(error.message || 'Sign up failed. Please try again.');
      }
    } else {
      // Store leader param for processing after profile is created
      if (leaderParam) {
        sessionStorage.setItem('pending_leader_id', leaderParam);
      }
      toast.success('Account created! You can now sign in.');
      navigate('/home');
    }
    setIsSubmitting(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrLeaderId) {
      toast.error('Please enter your email');
      return;
    }
    if (!isEmail(emailOrLeaderId)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(emailOrLeaderId, {
      redirectTo: getPasswordRecoveryRedirectUrl(),
    });
    if (error) {
      toast.error(error.message || 'Failed to send reset email');
    } else {
      toast.success('Password reset email sent! Check your inbox.');
      setIsForgotPassword(false);
    }
    setIsSubmitting(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Forgot Password View
  if (isForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border p-8">
          <div className="text-center mb-8">
            <img src={nevoraLogo} alt="NevorAI Logo" className="w-16 h-16 mx-auto mb-3 rounded-xl" />
            <h1 className="text-2xl font-bold text-foreground">NevorAI</h1>
            <p className="text-muted-foreground text-sm mt-1">Never miss a followup Again</p>
          </div>

          <button
            type="button"
            onClick={() => setIsForgotPassword(false)}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Sign In
          </button>

          <h2 className="text-xl font-semibold text-foreground mb-2">Reset Password</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Enter your email and we'll send you a link to reset your password.
          </p>

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  value={emailOrLeaderId}
                  onChange={(e) => setEmailOrLeaderId(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border p-8">
        <div className="text-center mb-8">
          <img src={nevoraLogo} alt="NevorAI Logo" className="w-16 h-16 mx-auto mb-3 rounded-xl" />
          <h1 className="text-2xl font-bold text-foreground">NevorAI</h1>
          <p className="text-muted-foreground text-sm mt-1">Never miss a followup Again</p>
        </div>

        {leaderParam && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-center">
            <p className="text-sm text-primary">
              You're joining via Leader ID: <span className="font-mono font-semibold">{formatLeaderId(leaderParam)}</span>
            </p>
          </div>
        )}

        <h2 className="text-xl font-semibold text-foreground mb-6">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h2>

        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="pl-10"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{isSignUp ? 'Email' : 'Email or Leader ID'}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type={isSignUp ? 'email' : 'text'}
                value={emailOrLeaderId}
                onChange={(e) => setEmailOrLeaderId(e.target.value)}
                placeholder={isSignUp ? 'you@example.com' : 'you@example.com or NVR000123'}
                className="pl-10"
                required
              />
            </div>
            {!isSignUp && (
              <p className="text-xs text-muted-foreground">
                Sign in with your email or Leader ID
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isSignUp ? 'Creating account...' : 'Signing in...'}
              </>
            ) : (
              isSignUp ? 'Sign Up' : 'Sign In'
            )}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary hover:underline font-medium"
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>

        <p className="text-center text-xs text-muted-foreground mt-4">
          By continuing, you agree to our{' '}
          <Link to="/terms" target="_blank" className="text-primary hover:underline">Terms & Conditions</Link>,{' '}
          <Link to="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</Link>, and{' '}
          <Link to="/refund" target="_blank" className="text-primary hover:underline">Refund Policy</Link>.
        </p>
      </div>
    </div>
  );
}
