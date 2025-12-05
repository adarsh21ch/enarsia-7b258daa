import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft, User } from 'lucide-react';
import splashBg from '@/assets/nevorai-splash.jpeg';

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/home');
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
      toast.error(error.message || 'Sign in failed');
    } else {
      toast.success('Welcome back!');
      navigate('/home');
    }
    setIsSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
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
      toast.error(error.message || 'Sign up failed');
    } else {
      toast.success('Account created! You can now sign in.');
      navigate('/home');
    }
    setIsSubmitting(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
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
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: `url(${splashBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  // Form Card Component
  const FormCard = ({ children }: { children: React.ReactNode }) => (
    <div className="w-full max-w-md bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 mx-4">
      {children}
    </div>
  );

  // Forgot Password View
  if (isForgotPassword) {
    return (
      <div 
        className="min-h-screen flex flex-col md:items-center md:justify-center"
        style={{
          backgroundImage: `url(${splashBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Mobile: Form at bottom */}
        <div className="flex-1 md:hidden" />
        <div className="md:flex md:items-center md:justify-center w-full">
          <FormCard>
            <button
              type="button"
              onClick={() => setIsForgotPassword(false)}
              className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Sign In
            </button>

            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
              <p className="text-gray-500 text-sm mt-2">
                Enter your email and we'll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-gray-700">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#2196F3] hover:bg-[#1976D2] text-white font-semibold py-3 rounded-xl"
                disabled={isSubmitting}
              >
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
          </FormCard>
        </div>
        <div className="h-8 md:hidden" />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col md:items-center md:justify-center"
      style={{
        backgroundImage: `url(${splashBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Mobile: Push form to bottom half */}
      <div className="flex-1 md:hidden" />
      
      <div className="md:flex md:items-center md:justify-center w-full">
        <FormCard>
          {/* Logo & Tagline */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#2196F3] to-[#00BCD4] flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-white">N</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Nevorai</h1>
            <p className="text-gray-500 text-sm mt-1">Never Miss a Followup</p>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>

          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="pl-10 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-700">Password</Label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs text-[#2196F3] hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#2196F3] hover:bg-[#1976D2] text-white font-semibold py-3 rounded-xl"
              disabled={isSubmitting}
            >
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

          <p className="text-center text-sm text-gray-500 mt-6">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[#2196F3] hover:underline font-medium"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </FormCard>
      </div>
      
      {/* Spacer for mobile */}
      <div className="h-8 md:hidden" />
    </div>
  );
}
