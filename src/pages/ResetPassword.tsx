import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CheckCircle, Loader2 } from 'lucide-react';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';
import { passwordSchema } from '@/lib/validations';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCheckingLink, setIsCheckingLink] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);

  const code = useMemo(() => new URLSearchParams(location.search).get('code'), [location.search]);

  useEffect(() => {
    // Ensure we have an authenticated recovery session before allowing password update.
    // Supports both URL hash tokens and PKCE "code" links.
    let cancelled = false;

    const run = async () => {
      setIsCheckingLink(true);
      setLinkError(null);

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!data.session) {
          throw new Error('no_session');
        }
      } catch {
        if (!cancelled) {
          setLinkError('Invalid or expired reset link. Please request a new one.');
        }
      } finally {
        if (!cancelled) setIsCheckingLink(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (linkError) return;

    const result = passwordSchema.safeParse(password);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('invalid') || msg.includes('expired') || msg.includes('token')) {
        setLinkError('This reset link is invalid or has expired. Please request a new one.');
      } else {
        toast.error(error.message);
      }
      setIsSubmitting(false);
      return;
    }

    setIsSuccess(true);
    toast.success('Password updated successfully!');
    setIsSubmitting(false);

    // Keep user signed in (recovery session) and send them to the app.
    setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 800);
  };

  if (isCheckingLink) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (linkError) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border card-shadow">
          <CardHeader>
            <CardTitle>Reset link problem</CardTitle>
            <CardDescription>{linkError}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={() => navigate('/auth', { replace: true })}>
              Request a new reset link
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (isSuccess) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border card-shadow">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Password Updated!</h2>
            <p className="text-muted-foreground">Taking you to the dashboard…</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <header className="text-center mb-8">
          <img
            src={nevoraLogo}
            alt="NevorAI logo"
            className="h-16 w-16 rounded-xl mx-auto mb-4 object-cover shadow-lg"
          />
          <h1 className="text-2xl font-bold">Reset password</h1>
          <p className="text-sm text-muted-foreground mt-1">Set your new password</p>
        </header>

        <Card className="border-border card-shadow">
          <CardHeader>
            <CardTitle>New password</CardTitle>
            <CardDescription>Enter and confirm your new password below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={8}
                  required
                />
                <p className="text-xs text-muted-foreground">8+ characters with uppercase, lowercase, and number</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating…
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

