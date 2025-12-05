import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, Eye, EyeOff, Users, Bell, Target, CheckCircle2, ArrowRight, Shield } from 'lucide-react';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Please confirm your email first');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Welcome back!');
      navigate('/dashboard');
    }
    setIsSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp(email, password);
    
    if (error) {
      if (error.message.includes('User already registered')) {
        toast.error('An account with this email already exists');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Account created! You can now sign in.');
      navigate('/dashboard');
    }
    setIsSubmitting(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Please enter your email');
      return;
    }

    setIsResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password reset link sent! Check your email.');
      setShowForgotPassword(false);
      setResetEmail('');
    }
    setIsResetting(false);
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      toast.error(error.message);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(221,83%,53%)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Illustration Panel */}
      <div className="hidden lg:flex lg:w-[40%] relative overflow-hidden bg-gradient-to-br from-[hsl(221,83%,35%)] via-[hsl(200,80%,40%)] to-[hsl(174,72%,40%)]">
        {/* Network Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="network-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="2" fill="white" />
                <circle cx="50" cy="30" r="1.5" fill="white" />
                <circle cx="90" cy="60" r="2" fill="white" />
                <circle cx="30" cy="80" r="1.5" fill="white" />
                <circle cx="70" cy="90" r="2" fill="white" />
                <line x1="10" y1="10" x2="50" y2="30" stroke="white" strokeWidth="0.5" />
                <line x1="50" y1="30" x2="90" y2="60" stroke="white" strokeWidth="0.5" />
                <line x1="90" y1="60" x2="70" y2="90" stroke="white" strokeWidth="0.5" />
                <line x1="70" y1="90" x2="30" y2="80" stroke="white" strokeWidth="0.5" />
                <line x1="30" y1="80" x2="10" y2="10" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#network-pattern)" />
          </svg>
        </div>

        {/* Logo */}
        <div className="absolute top-8 left-8 flex items-center gap-3 z-10">
          <img 
            src={nevoraLogo} 
            alt="NevorAI Logo" 
            className="h-10 w-10 rounded-lg object-cover shadow-lg"
          />
          <span className="text-white font-bold text-xl tracking-tight">NevorAI</span>
        </div>

        {/* Main Illustration Content */}
        <div className="flex flex-col items-center justify-center w-full p-12 z-10">
          {/* Workflow Icons */}
          <div className="flex flex-col items-center gap-8 mb-12">
            {/* Workflow Steps */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg hover:scale-105 transition-transform duration-300">
                <Users className="w-10 h-10 text-white" />
              </div>
              <ArrowRight className="w-6 h-6 text-white/70" />
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg hover:scale-105 transition-transform duration-300">
                <Bell className="w-10 h-10 text-white" />
              </div>
              <ArrowRight className="w-6 h-6 text-white/70" />
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg hover:scale-105 transition-transform duration-300">
                <Target className="w-10 h-10 text-white" />
              </div>
              <ArrowRight className="w-6 h-6 text-white/70" />
              <div className="w-20 h-20 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center shadow-lg hover:scale-105 transition-transform duration-300 ring-2 ring-white/40">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
            </div>

            {/* Labels */}
            <div className="flex items-center gap-4 text-white/80 text-sm font-medium">
              <span className="w-20 text-center">Prospects</span>
              <span className="w-6"></span>
              <span className="w-20 text-center">Reminders</span>
              <span className="w-6"></span>
              <span className="w-20 text-center">Funnel</span>
              <span className="w-6"></span>
              <span className="w-20 text-center">Success</span>
            </div>
          </div>

          {/* Tagline */}
          <div className="text-center text-white max-w-md">
            <h2 className="text-3xl font-bold mb-4">Streamline Your Network Marketing</h2>
            <p className="text-white/80 text-lg leading-relaxed">
              Track prospects, automate follow-ups, and close more enrollments with the power of AI-driven organization.
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-12 mt-12">
            <div className="text-center">
              <div className="text-4xl font-bold text-white">1,000+</div>
              <div className="text-white/70 text-sm">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white">50K+</div>
              <div className="text-white/70 text-sm">Follow-ups Tracked</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white">95%</div>
              <div className="text-white/70 text-sm">Success Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white dark:bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img 
              src={nevoraLogo} 
              alt="NevorAI Logo" 
              className="h-16 w-16 rounded-xl object-cover shadow-lg mb-4"
            />
            <h1 className="text-2xl font-bold text-foreground">NevorAI</h1>
            <p className="text-muted-foreground text-sm">Never miss a followup Again</p>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:block text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img 
                src={nevoraLogo} 
                alt="NevorAI Logo" 
                className="h-12 w-12 rounded-xl object-cover shadow-md"
              />
              <h1 className="text-3xl font-bold text-foreground">NevorAI</h1>
            </div>
            <p className="text-lg font-medium text-muted-foreground mb-2">
              Never miss a followup Again
            </p>
            <p className="text-sm text-muted-foreground">
              Organize prospects • Automate reminders • Close more enrollments
            </p>
          </div>

          {/* Form Container */}
          <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-8">
            {showForgotPassword ? (
              <>
                <h2 className="text-xl font-semibold text-foreground mb-2">Reset Password</h2>
                <p className="text-sm text-muted-foreground mb-6">Enter your email to receive a reset link</p>
                
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-sm font-medium">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="pl-10 h-12 text-base"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[hsl(221,83%,53%)] to-[hsl(174,72%,50%)] hover:from-[hsl(221,83%,45%)] hover:to-[hsl(174,72%,42%)] text-white shadow-lg hover:shadow-xl transition-all duration-300" 
                    disabled={isResetting}
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full h-10"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    ← Back to Sign In
                  </Button>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-foreground mb-6">
                  {isSignUp ? 'Create your account' : 'Welcome back'}
                </h2>
                
                <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="pl-10 h-12 text-base"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10 pr-10 h-12 text-base"
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {isSignUp && (
                      <p className="text-xs text-muted-foreground">At least 6 characters</p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[hsl(221,83%,53%)] to-[hsl(174,72%,50%)] hover:from-[hsl(221,83%,45%)] hover:to-[hsl(174,72%,42%)] text-white shadow-lg hover:shadow-xl transition-all duration-300" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {isSignUp ? 'Creating account...' : 'Signing in...'}
                      </>
                    ) : (
                      isSignUp ? 'Create Account' : 'Sign In'
                    )}
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">OR</span>
                  </div>
                </div>

                {/* Google Sign In */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 text-base font-medium border-2 hover:bg-muted/50 transition-colors"
                  onClick={handleGoogleSignIn}
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>

                {/* Footer Links */}
                <div className="flex items-center justify-between mt-6 text-sm">
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-[hsl(221,83%,53%)] hover:text-[hsl(221,83%,45%)] font-medium transition-colors"
                    >
                      Forgot Password?
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-[hsl(221,83%,53%)] hover:text-[hsl(221,83%,45%)] font-medium transition-colors ml-auto"
                  >
                    {isSignUp ? 'Already have an account? Sign In' : 'Create Account'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Trust Badge */}
          <div className="flex items-center justify-center gap-2 mt-8 text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span className="text-sm">Trusted by 1,000+ network marketers</span>
          </div>
        </div>
      </div>
    </div>
  );
}
