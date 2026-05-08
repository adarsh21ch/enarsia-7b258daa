import { useState, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Check } from 'lucide-react';

const WA_COMMUNITY_LINK = 'https://chat.whatsapp.com/YOUR_GROUP_INVITE_LINK'; // TODO: Replace with actual link

interface WhatsAppCommunityPopupProps {
  onDismiss: () => void;
}

export function WhatsAppCommunityPopup({ onDismiss }: WhatsAppCommunityPopupProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(true);

  const handleJoin = async () => {
    // Track join
    if (user) {
      await supabase
        .from('profiles')
        .update({
          whatsapp_community_joined: true,
          whatsapp_joined_at: new Date().toISOString(),
          whatsapp_popup_shown: true,
        } as any)
        .eq('user_id', user.id);
    }
    localStorage.setItem('whatsapp_popup_shown', 'true');
    window.open(WA_COMMUNITY_LINK, '_blank');
    setOpen(false);
    onDismiss();
  };

  const handleSkip = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ whatsapp_popup_shown: true } as any)
        .eq('user_id', user.id);
    }
    localStorage.setItem('whatsapp_popup_shown', 'true');
    setOpen(false);
    onDismiss();
  };

  const benefits = [
    'Daily tips from top users',
    'Exclusive nCall updates first',
    'Direct support from the founder',
  ];

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleSkip(); }}>
      <SheetContent side="bottom" className="rounded-t-3xl px-6 pt-8 pb-6 max-h-[80vh]">
        <div className="flex flex-col items-center text-center gap-5">
          {/* WhatsApp Icon */}
          <div className="w-14 h-14 rounded-2xl bg-[#25D366]/15 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#25D366]" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>

          <div>
            <h2 className="text-[22px] font-extrabold text-foreground font-heading leading-tight">
              Join Nevorai Leaders Community
            </h2>
            <p className="text-[15px] text-muted-foreground mt-2 font-body leading-relaxed">
              Connect with 4,000+ network marketers using nCall. Get tips, share wins, and grow together.
            </p>
          </div>

          <div className="w-full space-y-2.5 text-left">
            {benefits.map((b) => (
              <div key={b} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#25D366]/15 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-[#25D366]" />
                </div>
                <span className="text-sm text-foreground font-body">{b}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={handleJoin}
            className="w-full h-12 rounded-xl font-bold text-base bg-[#25D366] hover:bg-[#20bd5a] text-white"
          >
            Join WhatsApp Community 🟢
          </Button>

          <button
            onClick={handleSkip}
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors font-body"
          >
            Maybe Later — skip for now
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
