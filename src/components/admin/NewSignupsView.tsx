import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Phone, MessageCircle, Mail, Check, Circle } from 'lucide-react';
import { format, isToday, isYesterday, subDays } from 'date-fns';
import { buildWhatsAppLink } from '@/lib/whatsapp';

interface NewSignup {
  user_id: string;
  display_name: string | null;
  email: string | null;
  phone_number: string | null;
  created_at: string;
  onboarding_step: number;
  onboarding_completed: boolean;
  whatsapp_community_joined: boolean;
}

function groupByDay(signups: NewSignup[]) {
  const groups: { label: string; items: NewSignup[] }[] = [];
  const map = new Map<string, NewSignup[]>();
  
  signups.forEach(s => {
    const d = new Date(s.created_at);
    let label: string;
    if (isToday(d)) label = `Today (${format(d, 'MMM d')})`;
    else if (isYesterday(d)) label = `Yesterday (${format(d, 'MMM d')})`;
    else label = format(d, 'EEEE (MMM d)');
    
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(s);
  });
  
  map.forEach((items, label) => groups.push({ label, items }));
  return groups;
}

function getOnboardingLabel(s: NewSignup) {
  if (s.onboarding_completed) {
    if (s.onboarding_step === -1) return <Badge variant="secondary" className="text-[10px]">⏭ Skipped</Badge>;
    return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-0 text-[10px]">✅ Completed</Badge>;
  }
  if (s.onboarding_step > 0) return <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-300">⏳ Step {s.onboarding_step}/11</Badge>;
  return <Badge variant="secondary" className="text-[10px]">○ Not Started</Badge>;
}

export function NewSignupsView() {
  const [signups, setSignups] = useState<NewSignup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, email, phone_number, created_at, onboarding_step, onboarding_completed, whatsapp_community_joined')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (!error && data) {
        setSignups(data as unknown as NewSignup[]);
      }
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (signups.length === 0) {
    return <p className="text-center text-muted-foreground py-8 text-sm">No signups in the last 7 days.</p>;
  }

  const groups = groupByDay(signups);
  const founderMessage = (name: string) =>
    `Hi ${name || 'there'}! I'm Adarsh, founder of Nevorai. I noticed you signed up recently — wanted to personally check if you have any questions or need help getting started. 😊`;

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">{signups.length} signups in the last 7 days</p>

      {groups.map(g => (
        <div key={g.label}>
          <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">{g.label}</h3>
          <div className="space-y-3">
            {g.items.map((s, idx) => (
              <div key={s.user_id} className="rounded-xl border border-border/60 bg-card p-3.5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground tabular-nums">{idx + 1}.</span>
                      <span className="font-semibold text-sm truncate">{s.display_name || 'Unnamed'}</span>
                    </div>
                    {s.phone_number && (
                      <p className="text-xs text-muted-foreground mt-0.5 ml-5">📱 {s.phone_number}</p>
                    )}
                    {s.email && (
                      <p className="text-xs text-muted-foreground mt-0.5 ml-5 truncate">{s.email}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {format(new Date(s.created_at), 'h:mm a')}
                  </span>
                </div>

                <div className="flex items-center gap-2 ml-5 mb-3">
                  <span className="text-[11px] text-muted-foreground">Onboarding:</span>
                  {getOnboardingLabel(s)}
                  <span className="text-[11px] text-muted-foreground ml-2">WA:</span>
                  {s.whatsapp_community_joined ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
                  )}
                </div>

                <div className="flex gap-2 ml-5">
                  {s.phone_number && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => window.open(`tel:${s.phone_number}`, '_self')}
                      >
                        <Phone className="h-3 w-3" /> Call
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 text-[#25D366] border-[#25D366]/30 hover:bg-[#25D366]/10"
                        onClick={() => window.open(
                          buildWhatsAppLink(s.phone_number!, founderMessage(s.display_name || '')),
                          '_blank'
                        )}
                      >
                        <MessageCircle className="h-3 w-3" /> WhatsApp
                      </Button>
                    </>
                  )}
                  {s.email && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => window.open(`mailto:${s.email}`, '_blank')}
                    >
                      <Mail className="h-3 w-3" /> Email
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
