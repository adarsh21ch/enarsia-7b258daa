import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import nevoraLogo from '@/assets/nevorai-call-logo.png';

// Format duration dynamically based on days
const formatDuration = (days: number): string => {
  if (days >= 365) {
    const years = Math.floor(days / 365);
    return years === 1 ? '1 year' : `${years} years`;
  }
  if (days >= 180) return '6 months';
  if (days >= 120) return '4 months';
  if (days >= 90) return '3 months';
  if (days >= 60) return '2 months';
  const months = Math.round(days / 30);
  if (months >= 1) return `${months} month${months > 1 ? 's' : ''}`;
  return `${days} days`;
};

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { refetch } = useSubscription();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'missing_params'>('processing');
  const [errorMessage, setErrorMessage] = useState('');
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [planScope, setPlanScope] = useState<'app' | 'funnels' | 'combined'>('app');

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
      return;
    }

    if (user) {
      const type = searchParams.get('type');
      if (type === 'subscription') {
        handleSubscriptionActivation();
      } else {
        verifyAndActivate();
      }
    }
  }, [user, authLoading]);

  // Poll for subscription activation via webhook
  const handleSubscriptionActivation = async () => {
    setStatus('processing');
    const subId = searchParams.get('subscription_id');
    
    // Poll user_subscriptions for up to 30 seconds
    for (let i = 0; i < 10; i++) {
      const { data } = await supabase
        .from('user_subscriptions')
        .select('plan, status, expires_at, razorpay_subscription_id')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .maybeSingle();

      if (data && data.plan === 'pro' && (data.razorpay_subscription_id === subId || !subId)) {
        await refetch();
        setStatus('success');
        setPlanScope('app');
        toast({ title: "Plan Activated!", description: "Your recurring subscription is now active." });
        return;
      }
      await new Promise(r => setTimeout(r, 3000));
    }

    // If we get here, webhook hasn't fired yet but payment went through
    setStatus('success');
    setPlanScope('app');
    toast({ title: "Subscription Initiated!", description: "Your plan will activate shortly." });
  };

  const verifyAndActivate = async () => {
    try {
      const razorpayPaymentId = searchParams.get('razorpay_payment_id');
      const razorpayOrderId = searchParams.get('razorpay_order_id');
      const razorpaySignature = searchParams.get('razorpay_signature');

      if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
        setStatus('missing_params');
        setErrorMessage('Payment information is incomplete. If you completed payment, please contact support.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
        body: {
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: razorpaySignature,
          user_id: user!.id,
        },
      });

      if (error || !data?.success) {
        setErrorMessage(error?.message || data?.error || 'Payment verification failed');
        setStatus('error');
        return;
      }

      if (data?.duration_days) setDurationDays(data.duration_days);
      const scope = data?.plan_scope || 'app';
      setPlanScope(scope);

      await refetch();
      if (scope === 'funnels' || scope === 'combined') {
        queryClient.invalidateQueries({ queryKey: ['funnel-subscription'] });
      }
      setStatus('success');
      
      const durationText = data?.duration_days ? formatDuration(data.duration_days) : '';
      const scopeTitle = scope === 'combined' ? 'All-in-One Pro Activated!' : scope === 'funnels' ? 'Funnels Pro Activated!' : 'Plan Activated!';
      toast({ title: scopeTitle, description: `Enjoy all features${durationText ? ` for ${durationText}` : ''}.` });
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong');
      setStatus('error');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img 
            src={nevoraLogo} 
            alt="Enarsia Logo" 
            className="h-16 w-16 object-contain"
          />
        </div>

        {status === 'processing' && (
          <div className="text-center space-y-4">
            <div className="p-6 rounded-full bg-primary/10 inline-block">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Verifying Payment...</h1>
            <p className="text-muted-foreground">Please wait while we confirm your payment.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center space-y-4">
            <div className="p-6 rounded-full bg-green-500/10 inline-block">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-green-600">Payment Successful!</h1>
            <p className="text-muted-foreground">
              {planScope === 'combined'
                ? `Your All-in-One Pro plan is now active${durationDays ? ` for ${formatDuration(durationDays)}` : ''}.`
                : planScope === 'funnels'
                ? `Your Funnels Pro plan is now active${durationDays ? ` for ${formatDuration(durationDays)}` : ''}.`
                : `Your Pro plan is now active${durationDays ? ` for ${formatDuration(durationDays)}` : ''}.`}
            </p>
            
            <div className="bg-card border border-border/50 rounded-2xl p-4 mt-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                {planScope === 'combined' ? <Sparkles className="h-5 w-5 text-primary" /> : <Crown className="h-5 w-5 text-primary" />}
                <span className="font-semibold">
                  {planScope === 'combined' ? 'All-in-One Pro Unlocked' : planScope === 'funnels' ? 'Funnels Pro Unlocked' : 'Features Unlocked'}
                </span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                {(planScope === 'app' || planScope === 'combined') && (
                  <>
                    <li>✓ Tracking - Funnel & Leads Tracker</li>
                    <li>✓ ActionUp - Activity Center</li>
                    <li>✓ Advanced Analytics</li>
                  </>
                )}
                {(planScope === 'funnels' || planScope === 'combined') && (
                  <>
                    <li>✓ Unlimited Video Funnels</li>
                    <li>✓ Multiple Price Options & QR Codes</li>
                    <li>✓ Advanced Funnel Analytics</li>
                  </>
                )}
              </ul>
            </div>

            <Button 
              onClick={() => navigate(planScope === 'funnels' ? '/funnels' : '/dashboard')} 
              className="w-full h-12 mt-6"
            >
              {planScope === 'funnels' ? 'Go to Funnels' : 'Go to Dashboard'}
            </Button>
          </div>
        )}

        {status === 'missing_params' && (
          <div className="text-center space-y-4">
            <div className="p-6 rounded-full bg-amber-500/10 inline-block">
              <XCircle className="h-12 w-12 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-amber-600">Payment Incomplete</h1>
            <p className="text-muted-foreground">{errorMessage}</p>
            
            <div className="space-y-2 mt-6">
              <Button 
                onClick={() => navigate('/profile')} 
                className="w-full h-12"
              >
                Go to Profile
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              If you've completed payment, please contact support@nevorai.com with your payment details.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-4">
            <div className="p-6 rounded-full bg-destructive/10 inline-block">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-destructive">Verification Failed</h1>
            <p className="text-muted-foreground">{errorMessage || 'Something went wrong. Please contact support.'}</p>
            
            <div className="space-y-2 mt-6">
              <Button 
                onClick={verifyAndActivate} 
                className="w-full h-12"
              >
                Try Again
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/profile')} 
                className="w-full h-12"
              >
                Go to Profile
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              If the issue persists, contact us at support@nevorai.com
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
