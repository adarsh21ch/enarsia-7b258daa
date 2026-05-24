import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LeadCaptureForm } from '@/components/funnels/LeadCaptureForm';
import { ControlledVideoPlayer } from '@/components/funnels/ControlledVideoPlayer';
import { UPIPaymentModal } from '@/components/funnels/UPIPaymentModal';
import { FunnelPriceOption } from '@/types/funnels';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Lock, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface PublicFunnel {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  video_asset_id: string | null;
  thumbnail_url: string | null;
  allow_speed_control: boolean;
  allow_forward_seek: boolean;
  lock_cta_until_complete: boolean;
  price: number;
  payment_type: string;
  upi_id: string | null;
  cta_button_text: string;
  cta_redirect_url: string | null;
  success_message: string | null;
  whatsapp_auto_message_enabled: boolean;
  whatsapp_auto_message: string | null;
  is_published: boolean;
}

interface LeadSession {
  leadId: string;
  accessToken: string;
}

type ViewPhase = 'loading' | 'capture' | 'video' | 'payment_pending' | 'complete' | 'error';

export default function FunnelView() {
  const { slug } = useParams();
  const [phase, setPhase] = useState<ViewPhase>('loading');
  const [funnel, setFunnel] = useState<PublicFunnel | null>(null);
  const [priceOptions, setPriceOptions] = useState<FunnelPriceOption[]>([]);
  const [leadSession, setLeadSession] = useState<LeadSession | null>(null);
  const [isCtaLocked, setIsCtaLocked] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Load funnel by slug
  useEffect(() => {
    async function loadFunnel() {
      if (!slug) {
        setError('Invalid funnel URL');
        setPhase('error');
        return;
      }

      const { data, error } = await (supabase as any)
        .from('funnels_public')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error || !data) {
        setError('Funnel not found or not published');
        setPhase('error');
        return;
      }

      setFunnel(data as PublicFunnel);

      // Load price options (UPI/QR are stripped — fetched on demand via secure RPC)
      if (data.payment_type === 'upi_manual') {
        const { data: options } = await (supabase as any)
          .from('funnel_price_options_public')
          .select('*')
          .eq('funnel_id', data.id)
          .order('sort_order', { ascending: true });

        if (options) {
          setPriceOptions(options as FunnelPriceOption[]);
        }
      }
      
      // Check if we have an existing session
      const storedSession = sessionStorage.getItem(`funnel_lead_${data.id}`);
      if (storedSession) {
        try {
          const session = JSON.parse(storedSession);
          setLeadSession(session);
          
          // Check if payment is pending
          const { data: lead } = await supabase
            .from('funnel_leads')
            .select('payment_status_cache')
            .eq('id', session.leadId)
            .single();
          
          if (lead?.payment_status_cache === 'pending') {
            setPhase('payment_pending');
          } else if (lead?.payment_status_cache === 'paid') {
            setPhase('complete');
          } else {
            setPhase('video');
          }
          return;
        } catch {
          // Invalid session, continue to capture
        }
      }

      setPhase('capture');
    }

    loadFunnel();
  }, [slug]);

  // Handle lead capture - using edge function for anonymous access
  const handleLeadCapture = async (data: { name: string; phone: string; email?: string }) => {
    if (!funnel) return;

    setIsSubmitting(true);

    try {
      // Call edge function instead of direct insert (works for anonymous users)
      const { data: result, error } = await supabase.functions.invoke('create-funnel-lead', {
        body: {
          funnel_id: funnel.id,
          name: data.name,
          phone: data.phone,
          email: data.email || undefined,
          source: 'funnel_view',
        },
      });

      if (error || !result?.success) {
        throw new Error(result?.error || 'Failed to create submission');
      }

      const session: LeadSession = {
        leadId: result.lead_id,
        accessToken: result.token,
      };

      // Store session for video access
      sessionStorage.setItem(`funnel_lead_${funnel.id}`, JSON.stringify(session));
      setLeadSession(session);

      // Trigger WhatsApp auto-message if enabled
      if (funnel.whatsapp_auto_message_enabled && funnel.whatsapp_auto_message && data.phone) {
        const message = funnel.whatsapp_auto_message
          .replace(/\{\{name\}\}/g, data.name || '')
          .replace(/\{\{phone\}\}/g, data.phone || '');
        const waLink = buildWhatsAppLink(data.phone, message);
        window.open(waLink, '_blank');
      }

      setPhase('video');
    } catch (err) {
      console.error('Lead capture error:', err);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Track video progress
  const handleProgress = useCallback(async (currentTime: number, duration: number, percentage: number) => {
    if (!leadSession || !funnel) return;

    try {
      await supabase.functions.invoke('funnel-track-progress', {
        body: {
          lead_id: leadSession.leadId,
          access_token: leadSession.accessToken,
          current_time: Math.floor(currentTime),
          duration: Math.floor(duration),
          event_type: 'progress',
        },
      });
    } catch (err) {
      console.error('Progress tracking error:', err);
    }
  }, [leadSession, funnel]);

  // Handle video completion
  const handleVideoComplete = useCallback(async () => {
    if (!leadSession) return;

    setIsCtaLocked(false);

    try {
      await supabase.functions.invoke('funnel-track-progress', {
        body: {
          lead_id: leadSession.leadId,
          access_token: leadSession.accessToken,
          current_time: 0,
          duration: 0,
          event_type: 'complete',
        },
      });
    } catch (err) {
      console.error('Completion tracking error:', err);
    }
  }, [leadSession]);

  // Handle CTA click
  const handleCtaClick = async () => {
    if (!funnel) return;

    // For UPI manual payments, fetch UPI/QR via secure RPC then show modal
    if (funnel.payment_type === 'upi_manual' && funnel.price > 0) {
      if (leadSession) {
        try {
          const { data, error } = await (supabase as any).rpc('get_funnel_payment_details', {
            p_lead_id: leadSession.leadId,
            p_access_token: leadSession.accessToken,
          });
          if (!error && data && data[0]) {
            const row = data[0];
            // Patch funnel UPI for display
            setFunnel((prev) => prev ? { ...prev, upi_id: row.funnel_upi_id ?? prev.upi_id } : prev);
            // Merge sensitive fields back into price options
            const opts = (row.options as any[]) || [];
            if (opts.length > 0) {
              setPriceOptions((prev) => prev.map((p) => {
                const match = opts.find((o) => o.id === p.id);
                return match ? { ...p, upi_id: match.upi_id, qr_image_url: match.qr_image_url } : p;
              }));
            }
          }
        } catch (err) {
          console.error('Failed to load payment details:', err);
        }
      }
      setShowPaymentModal(true);
      return;
    }


    if (funnel.price > 0 && funnel.payment_type === 'razorpay') {
      // TODO: Implement Razorpay payment flow
      toast.info('Payment integration coming soon');
      return;
    }

    if (funnel.cta_redirect_url) {
      window.location.href = funnel.cta_redirect_url;
    } else {
      setPhase('complete');
    }
  };

  // Handle payment submission
  const handlePaymentSubmitted = () => {
    setShowPaymentModal(false);
    setPhase('payment_pending');
  };

  // Render based on phase
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Oops!</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (phase === 'capture' && funnel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <LeadCaptureForm
          funnelTitle={funnel.title}
          onSubmit={handleLeadCapture}
          isLoading={isSubmitting}
        />
      </div>
    );
  }

  if (phase === 'video' && funnel && leadSession) {
    const showLockedCta = funnel.lock_cta_until_complete && isCtaLocked;

    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-4xl">
            <ControlledVideoPlayer
              assetId={funnel.video_asset_id || undefined}
              leadToken={leadSession.accessToken}
              allowSpeedControl={funnel.allow_speed_control}
              allowSeekForward={funnel.allow_forward_seek}
              onProgress={handleProgress}
              onComplete={handleVideoComplete}
            />
          </div>
        </div>

        {/* CTA Section */}
        <div className="p-6 bg-background border-t">
          <div className="max-w-md mx-auto text-center">
            <Button
              size="lg"
              className="w-full text-lg py-6"
              onClick={handleCtaClick}
              disabled={showLockedCta}
            >
              {showLockedCta ? (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Watch video to unlock
                </>
              ) : (
                <>
                  {funnel.cta_button_text}
                  {funnel.price > 0 && ` - ₹${funnel.price}`}
                </>
              )}
            </Button>
            {showLockedCta && (
              <p className="text-sm text-muted-foreground mt-2">
                Complete the video to access the next step
              </p>
            )}
          </div>
        </div>

        {/* UPI Payment Modal */}
        <UPIPaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          priceOptions={priceOptions}
          funnelId={funnel.id}
          leadId={leadSession.leadId}
          accessToken={leadSession.accessToken}
          defaultAmount={funnel.price}
          defaultUpiId={funnel.upi_id || undefined}
          onPaymentSubmitted={handlePaymentSubmitted}
        />
      </div>
    );
  }

  if (phase === 'payment_pending' && funnel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Payment Pending</h2>
          <p className="text-muted-foreground">
            Your payment screenshot has been submitted. We'll verify it and grant you access shortly.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            You'll receive access within 24 hours after verification.
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'complete' && funnel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
          <p className="text-muted-foreground">
            {funnel.success_message || 'Your submission has been received.'}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
