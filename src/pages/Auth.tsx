import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, Eye, EyeOff, Phone, Bell, BarChart3, Zap, ArrowRight, User, Shield } from 'lucide-react';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';
import { signUpSchema, signInSchema, emailSchema } from '@/lib/validations';

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true); // Default to Sign Up
  const [rememberMe, setRememberMe] = useState(false);
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
    
    // Validate with zod
    const result = signInSchema.safeParse({ email, password });
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(result.data.email, result.data.password);
    
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
    
    // Validate with zod
    const result = signUpSchema.safeParse({ name, email, password });
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp(result.data.email, result.data.password);
    
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
    
    // Validate email with zod
    const result = emailSchema.safeParse(resetEmail);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(result.data, {
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

        {/* Logo & Headline */}
        <div className="absolute top-8 left-8 right-8 z-10">
          <div className="flex items-center gap-3 mb-2">
            <img 
              src={nevoraLogo} 
              alt="NevorAI Logo" 
              className="h-10 w-10 rounded-lg object-cover shadow-lg"
            />
            <span className="text-white font-bold text-xl tracking-tight">NevorAI</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col items-center justify-center w-full px-8 py-12 z-10 mt-16">
          {/* Four Feature Items */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-10">
            <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-semibold text-sm">Calling</span>
            </div>
            <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-semibold text-sm">FollowUp</span>
            </div>
            <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-semibold text-sm">TrackUp</span>
            </div>
            <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-semibold text-sm">ActionUp</span>
            </div>
          </div>

          {/* Funnel Graphic */}
          <div className="w-full max-w-sm bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8">
            <p className="text-white/70 text-xs uppercase tracking-wider mb-4 text-center font-medium">Prospect Journey</p>
            <div className="flex items-center justify-between">
              {/* Stage 1: New Lead */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center ring-2 ring-white/30">
                  <User className="w-5 h-5 text-white" />
                </div>
                <span className="text-white/90 text-xs font-medium">New Lead</span>
              </div>
              <ArrowRight className="w-4 h-4 text-white/50 flex-shrink-0" />
              {/* Stage 2: Invitation */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center ring-2 ring-white/30">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <span className="text-white/90 text-xs font-medium">Invitation</span>
              </div>
              <ArrowRight className="w-4 h-4 text-white/50 flex-shrink-0" />
              {/* Stage 3: Enrolled */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-[hsl(174,72%,50%)]/40 flex items-center justify-center ring-2 ring-[hsl(174,72%,50%)]">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-semibold text-xs">Enrolled</span>
              </div>
              <ArrowRight className="w-4 h-4 text-white/50 flex-shrink-0" />
              {/* Stage 4: FollowUp */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center ring-2 ring-white/30">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <span className="text-white/90 text-xs font-medium">FollowUp</span>
              </div>
            </div>
          </div>

          {/* Bottom Text */}
          <p className="text-white/80 text-center text-sm max-w-xs leading-relaxed">
            Organize prospects, track every touch, and never miss the next action.
          </p>
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
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {isSignUp ? 'Create your account' : 'Welcome back'}
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  {isSignUp ? 'Start managing your prospects today' : 'Sign in to continue to NevorAI'}
                </p>
                
                <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
                  {isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="John Doe"
                          className="pl-10 h-12 text-base"
                          required
                        />
                      </div>
                    </div>
                  )}
                  
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
                      <p className="text-xs text-muted-foreground">At least 8 characters with uppercase, lowercase, and number</p>
                    )}
                  </div>

                  {/* Remember Me & Forgot Password for Sign In */}
                  {!isSignUp && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="remember" 
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                        />
                        <label 
                          htmlFor="remember" 
                          className="text-sm text-muted-foreground cursor-pointer select-none"
                        >
                          Remember me
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-[hsl(221,83%,53%)] hover:text-[hsl(221,83%,45%)] font-medium transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}
                  
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

                {/* Footer Link */}
                <div className="text-center mt-6">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isSignUp ? (
                      <>Already have an account? <span className="text-[hsl(221,83%,53%)] font-medium">Sign In</span></>
                    ) : (
                      <>New here? <span className="text-[hsl(221,83%,53%)] font-medium">Create an account</span></>
                    )}
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
