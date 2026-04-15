import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/lib/fetchWithTimeout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft, User, Phone } from 'lucide-react';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';
import { getPasswordRecoveryRedirectUrl, PUBLISHED_APP_URL } from '@/config/siteUrl';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, loading: authLoading } = useAuth();
  const [emailOrLeaderId, setEmailOrLeaderId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  const [signupStep, setSignupStep] = useState<'form' | 'otp'>('form');
  const [pendingSignupData, setPendingSignupData] = useState<{
    email: string;
    password: string;
    name: string;
  } | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  const uplineParam = searchParams.get('upline');

  useEffect(() => {
    if (user && !authLoading) {
      if (uplineParam) {
        sessionStorage.setItem('pending_upline_email', uplineParam);
      }
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate, uplineParam]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrLeaderId || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsSubmitting(true);
    const email = emailOrLeaderId.trim().toLowerCase();
    
    try {
      const { error } = await signIn(email, password);
      if (error) {
        const errorMessage = error.message?.toLowerCase() || '';
        if (errorMessage.includes('timed out') || errorMessage.includes('connection is slow')) {
          toast.error('Connection is slow. Please check your internet and try again.');
        } else if (errorMessage.includes('invalid login credentials') || errorMessage.includes('invalid credentials')) {
          try {
            const { data: provisionedData } = await withTimeout(
              Promise.resolve(supabase.rpc('check_provisioned_user', { target_email: email })),
              5000, 'Provisioned user check'
            );
            if (provisionedData && provisionedData.length > 0 && provisionedData[0].is_provisioned) {
              const { error: resetError } = await withTimeout(
                supabase.auth.resetPasswordForEmail(email, { redirectTo: getPasswordRecoveryRedirectUrl() }),
                5000, 'Password reset'
              );
              if (!resetError) {
                toast.success(
                  `Your account was created via ${provisionedData[0].source_app === 'achievers_club' ? 'Achievers Club' : 'another app'}. We've sent you an email to set your password. Please check your inbox!`,
                  { duration: 8000 }
                );
                return;
              }
            }
          } catch (checkError) {
            console.error('Error checking provisioned user:', checkError);
          }
          toast.error('Invalid email or password. Please check your credentials or use "Forgot Password" to reset.');
        } else if (errorMessage.includes('email not confirmed')) {
          toast.error('Please confirm your email before signing in.');
        } else if (errorMessage.includes('user not found')) {
          toast.error('No account found with this email. Please sign up first.');
        } else if (errorMessage.includes('too many requests')) {
          toast.error('Too many login attempts. Please wait a few minutes.');
        } else {
          toast.error(error.message || 'Sign in failed. Please try again.');
        }
      } else {
        if (uplineParam) sessionStorage.setItem('pending_upline_email', uplineParam);
        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtp = useCallback(async (emailToSend: string) => {
    const { data, error } = await supabase.functions.invoke('send-otp', {
      body: { email: emailToSend }
    });

    if (error || !data?.success) {
      let message = data?.error || 'Failed to send verification code';
      const response = typeof error === 'object' && error && 'context' in error
        ? (error as { context?: Response }).context
        : undefined;

      if (response instanceof Response) {
        try {
          const payload = await response.clone().json();
          if (
            payload &&
            typeof payload === 'object' &&
            'error' in payload &&
            typeof payload.error === 'string'
          ) {
            message = payload.error;
          }
        } catch {
          // Ignore parse errors and use the fallback message.
        }
      }

      if (message.toLowerCase().includes('already have a nevorai account')) {
        setIsSignUp(false);
        setSignupStep('form');
        setPendingSignupData(null);
        setOtpCode('');
      }

      toast.error(message);
      return false;
    }

    toast.success('Verification code sent to your email!');
    return true;
  }, []);

  // Normalize phone to +91XXXXXXXXXX format
  const normalizePhone = (raw: string): string | null => {
    const digits = raw.replace(/[\s\-+()]/g, '');
    if (!digits) return null;
    if (digits.length === 10 && /^\d{10}$/.test(digits)) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (digits.length === 13 && digits.startsWith('91')) return `+${digits}`;
    // Other country codes
    if (digits.length >= 10) return `+${digits}`;
    return null;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !emailOrLeaderId || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (!phoneNumber.trim()) {
      toast.error('Please enter your WhatsApp number');
      return;
    }
    const normalizedPhone = normalizePhone(phoneNumber);
    if (!normalizedPhone) {
      toast.error('Please enter a valid phone number (10 digits)');
      return;
    }
    if (!emailOrLeaderId.includes('@')) {
      toast.error('Please enter a valid email address for sign up');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setOtpSending(true);
    const email = emailOrLeaderId.trim().toLowerCase();
    const success = await handleSendOtp(email);
    if (success) {
      setPendingSignupData({ email, password, name: name.trim() });
      setSignupStep('otp');
      setResendCooldown(60);
    }
    setOtpSending(false);
  };

  const handleVerifyOtp = async () => {
    if (!pendingSignupData) return;
    if (otpCode.length !== 4) {
      toast.error('Please enter the 4-digit verification code');
      return;
    }
    setOtpVerifying(true);
    const normalizedPhone = normalizePhone(phoneNumber);
    const { data, error } = await supabase.functions.invoke('verify-otp-and-signup', {
      body: {
        email: pendingSignupData.email,
        otp_code: otpCode,
        password: pendingSignupData.password,
        name: pendingSignupData.name,
        phone_number: normalizedPhone
      }
    });
    if (error || !data?.success) {
      toast.error(data?.error || 'Verification failed. Please try again.');
      setOtpVerifying(false);
      return;
    }
    if (data.is_achievers_club_member) {
      toast.success('Welcome! Your Achievers Club membership has been linked!', { duration: 5000 });
    } else {
      toast.success('Account created successfully!');
    }
    if (uplineParam) sessionStorage.setItem('pending_upline_email', uplineParam);
    const { error: loginError } = await signIn(pendingSignupData.email, pendingSignupData.password);
    if (loginError) {
      toast.info('Account created! Please sign in.');
      setSignupStep('form');
      setIsSignUp(false);
    } else {
      navigate('/dashboard');
    }
    setOtpVerifying(false);
  };

  const handleResendOtp = async () => {
    if (!pendingSignupData || resendCooldown > 0) return;
    setOtpSending(true);
    const success = await handleSendOtp(pendingSignupData.email);
    if (success) {
      setResendCooldown(60);
      setOtpCode('');
    }
    setOtpSending(false);
  };

  const handleBackFromOtp = () => {
    setSignupStep('form');
    setOtpCode('');
    setPendingSignupData(null);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrLeaderId) { toast.error('Please enter your email'); return; }
    if (!emailOrLeaderId.includes('@')) { toast.error('Please enter a valid email address'); return; }
    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(emailOrLeaderId, {
      redirectTo: getPasswordRecoveryRedirectUrl(),
    });
    if (error) toast.error(error.message || 'Failed to send reset email');
    else { toast.success('Password reset email sent! Check your inbox.'); setIsForgotPassword(false); }
    setIsSubmitting(false);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${PUBLISHED_APP_URL}/dashboard`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) { toast.error(error.message || 'Failed to sign in with Google'); setIsGoogleLoading(false); }
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  // --- Loading state ---
  if (authLoading) {
    return (
      <div className="auth-page-layout bg-background">
        <div className="auth-page-content flex flex-col items-center gap-4">
          <img src={nevoraLogo} alt="NevorAI Logo" className="w-16 h-16 rounded-2xl shadow-lg" />
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-body">Loading...</p>
        </div>
      </div>
    );
  }

  // --- Shared header ---
  const AuthHeader = () => (
    <div className="text-center mb-8">
      <div className="relative inline-block mb-4">
        <img
          src={nevoraLogo}
          alt="NevorAI Logo"
          className="w-[72px] h-[72px] rounded-2xl shadow-lg dark:shadow-[0_0_30px_rgba(59,111,255,0.25)]"
        />
      </div>
      <h1 className="text-[28px] font-extrabold text-foreground font-heading tracking-tight">
        Nevorai
      </h1>
      <p className="text-muted-foreground text-[15px] mt-1 italic font-body">
        Never miss a followup Again
      </p>
    </div>
  );

  // --- Forgot Password ---
  if (isForgotPassword) {
    return (
      <div className="auth-page-layout bg-background dark:bg-gradient-to-b dark:from-[hsl(233,40%,3%)] dark:to-[hsl(240,35%,8%)]">
        <div className="auth-page-content">
          <div className="w-full max-w-md px-6 py-8">
            <AuthHeader />

            <button
              type="button"
              onClick={() => setIsForgotPassword(false)}
              className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-premium"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Sign In
            </button>

            <h2 className="text-xl font-bold text-foreground font-heading mb-2">Reset Password</h2>
            <p className="text-sm text-muted-foreground mb-6 font-body">
              Enter your email and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    value={emailOrLeaderId}
                    onChange={(e) => setEmailOrLeaderId(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 h-12 rounded-xl bg-secondary border-border focus:border-primary focus:ring-2 focus:ring-primary/15"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 rounded-xl font-bold text-base btn-press" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : 'Send Reset Link'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- OTP Verification ---
  if (signupStep === 'otp' && pendingSignupData) {
    return (
      <div className="auth-page-layout bg-background dark:bg-gradient-to-b dark:from-[hsl(233,40%,3%)] dark:to-[hsl(240,35%,8%)]">
        <div className="auth-page-content">
          <div className="w-full max-w-md px-6 py-8">
            <AuthHeader />

            <button
              type="button"
              onClick={handleBackFromOtp}
              className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-premium"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </button>

            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-foreground font-heading mb-2">Verify Your Email</h2>
              <p className="text-sm text-muted-foreground font-body">
                We sent a 4-digit code to
              </p>
              <p className="text-sm font-semibold text-foreground">{pendingSignupData.email}</p>
            </div>

            <div className="flex justify-center mb-8">
              <InputOTP maxLength={4} value={otpCode} onChange={setOtpCode} className="gap-3">
                <InputOTPGroup className="gap-3">
                  <InputOTPSlot index={0} className="w-14 h-16 text-xl font-bold rounded-xl border-border bg-secondary" />
                  <InputOTPSlot index={1} className="w-14 h-16 text-xl font-bold rounded-xl border-border bg-secondary" />
                  <InputOTPSlot index={2} className="w-14 h-16 text-xl font-bold rounded-xl border-border bg-secondary" />
                  <InputOTPSlot index={3} className="w-14 h-16 text-xl font-bold rounded-xl border-border bg-secondary" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              onClick={handleVerifyOtp}
              className="w-full h-12 rounded-xl font-bold text-base btn-press mb-4"
              disabled={otpVerifying || otpCode.length !== 4}
            >
              {otpVerifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : 'Verify & Create Account'}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Didn't receive the code?</p>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || otpSending}
                className="text-sm text-primary hover:underline font-semibold disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed transition-premium"
              >
                {otpSending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Auth Form ---
  return (
    <div className="auth-page-layout bg-background dark:bg-gradient-to-b dark:from-[hsl(233,40%,3%)] dark:to-[hsl(240,35%,8%)]">
      {/* Subtle radial glow in dark mode */}
      <div className="fixed inset-0 pointer-events-none dark:bg-[radial-gradient(ellipse_at_top,rgba(59,111,255,0.06)_0%,transparent_60%)]" />

      <div className="auth-page-content relative z-10">
        <div className="w-full max-w-md px-6 py-8">

          <AuthHeader />

          {/* Pill Toggle */}
          <div className="relative mb-8 p-1 bg-secondary rounded-xl flex">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-[10px] transition-all duration-300 ${
                !isSignUp
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-[10px] transition-all duration-300 ${
                isSignUp
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Google Sign-in */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl mb-5 border-border bg-card hover:bg-secondary font-semibold text-sm btn-press"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2.5 h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="auth-divider w-full" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-xs uppercase text-muted-foreground font-medium tracking-widest">or</span>
            </div>
          </div>

          {uplineParam && (
            <div className="mb-5 p-3 bg-primary/10 border border-primary/20 rounded-xl text-center">
              <p className="text-sm text-primary font-body">
                Joining via upline: <span className="font-semibold">{uplineParam}</span>
              </p>
            </div>
          )}

          <h2 className="text-xl font-bold text-foreground font-heading mb-5">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>

          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="pl-10 h-12 rounded-xl bg-secondary border-border focus:border-primary focus:ring-2 focus:ring-primary/15"
                    required
                  />
                </div>
              </div>
            )}

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">WhatsApp Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="pl-10 h-12 rounded-xl bg-secondary border-border focus:border-primary focus:ring-2 focus:ring-primary/15"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground font-body">
                  We'll use this only to help you get started with Nevorai.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={emailOrLeaderId}
                  onChange={(e) => setEmailOrLeaderId(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 h-12 rounded-xl bg-secondary border-border focus:border-primary focus:ring-2 focus:ring-primary/15"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs text-primary hover:underline font-medium transition-premium"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-12 rounded-xl bg-secondary border-border focus:border-primary focus:ring-2 focus:ring-primary/15"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-premium"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-[52px] rounded-xl font-bold text-base bg-primary hover:bg-primary/90 relative overflow-hidden shimmer-btn btn-press"
              disabled={isSubmitting || otpSending}
            >
              {isSubmitting || otpSending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isSignUp ? 'Sending verification code...' : 'Signing in...'}</>
              ) : (
                isSignUp ? 'Sign Up' : 'Sign In'
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed">
            By continuing, you agree to our{' '}
            <Link to="/terms" target="_blank" className="text-primary hover:underline">Terms & Conditions</Link>,{' '}
            <Link to="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</Link>, and{' '}
            <Link to="/refund" target="_blank" className="text-primary hover:underline">Refund Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
