import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { refetch } = useSubscription();
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'missing_params'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
      return;
    }

    if (user) {
      verifyAndActivate();
    }
  }, [user, authLoading]);

  const verifyAndActivate = async () => {
    try {
      const razorpayPaymentId = searchParams.get('razorpay_payment_id');
      const razorpayOrderId = searchParams.get('razorpay_order_id');
      const razorpaySignature = searchParams.get('razorpay_signature');

      // Check if we have all required parameters
      if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
        console.error('Missing payment parameters');
        setStatus('missing_params');
        setErrorMessage('Payment information is incomplete. If you completed payment, please contact support.');
        return;
      }

      console.log('Verifying payment...', { razorpayPaymentId, razorpayOrderId });

      // Verify payment on server
      const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
        body: {
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: razorpaySignature,
          user_id: user!.id,
        },
      });

      if (error || !data?.success) {
        console.error('Verification failed:', error || data);
        setErrorMessage(error?.message || data?.error || 'Payment verification failed');
        setStatus('error');
        return;
      }

      await refetch();
      setStatus('success');
      
      toast({
        title: "Pro Plan Activated!",
        description: "Welcome to NevorAI Pro! Enjoy all premium features for 30 days.",
      });
    } catch (err: any) {
      console.error('Activation error:', err);
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
            alt="NevorAI Logo" 
            className="h-16 w-16 rounded-2xl object-cover shadow-lg"
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
            <p className="text-muted-foreground">Your Pro plan is now active for 30 days.</p>
            
            <div className="bg-card border border-border/50 rounded-2xl p-4 mt-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-primary" />
                <span className="font-semibold">Pro Features Unlocked</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ TrackUp - Funnel & Leads Tracker</li>
                <li>✓ ActionUp - Activity Center</li>
                <li>✓ Advanced Analytics</li>
              </ul>
            </div>

            <Button 
              onClick={() => navigate('/dashboard')} 
              className="w-full h-12 mt-6"
            >
              Go to Dashboard
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
              If you've completed payment, please contact teamnevorai@gmail.com with your payment details.
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
              If the issue persists, contact us at teamnevorai@gmail.com
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
