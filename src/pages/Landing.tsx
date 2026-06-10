import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Play,
  Users,
  Phone,
  Clock,
  Bot,
  TrendingUp,
  Layers,
  Zap,
  Flag,
} from 'lucide-react';
import enarsiaSymbol from '@/assets/enarsia-symbol.png';

const INTRO_VIDEO_URL = 'https://<R2_PUBLIC_URL>/enarsia-intro.mp4';
const INTRO_POSTER_URL = '';

const features = [
  { icon: Users, title: 'Track every lead', desc: 'No prospect goes cold, no follow-up ever missed.' },
  { icon: Phone, title: 'Daily calling list', desc: 'The app tells you who to call today.' },
  { icon: Clock, title: 'Smart follow-up reminders', desc: 'Reach the right prospect at the right time.' },
  { icon: Users, title: 'Team & enrolments', desc: 'Your downline and enrolments in one place.' },
  { icon: Bot, title: 'AI assistant (Inertia)', desc: 'Ask it for scripts, objection handling, and "what to do today."' },
  { icon: TrendingUp, title: 'Tracking & growth', desc: 'See your daily activity and results on one dashboard.' },
];

const benefits = [
  { icon: Layers, title: 'All your prospects in one place', desc: 'Leads, follow-ups, and enrolments — no more scattered notes.' },
  { icon: Zap, title: 'Never miss a follow-up', desc: 'Smart reminders keep every prospect moving forward.' },
  { icon: Bot, title: 'AI helps with scripts and plans', desc: 'Get calling scripts, objection replies, and daily plans in seconds.' },
  { icon: Flag, title: 'Built in India', desc: 'Simple, fast, and built for how Indian network marketers work. 🇮🇳' },
];

const steps = [
  { n: '1', title: 'Add your prospects', desc: 'Drop in leads and contacts in seconds.' },
  { n: '2', title: 'Follow up on time', desc: 'The app tells you who to call and when.' },
  { n: '3', title: 'Close more enrolments', desc: 'Track every step from first call to enrolment.' },
];

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
    >
      {children}
    </div>
  );
}

export default function Landing() {
  const [videoPlaying, setVideoPlaying] = useState(false);

  return (
    <div className="h-screen min-h-[100dvh] w-full overflow-y-auto overflow-x-hidden bg-background text-foreground">
      {/* Top nav */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={enarsiaSymbol} alt="Enarsia" className="h-10 w-10 sm:h-12 sm:w-12 object-contain" />
            <span className="font-extrabold text-xl sm:text-2xl tracking-tight">Enarsia</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/auth" className="text-sm sm:text-base font-semibold px-2 sm:px-3 py-2 hover:text-primary transition-colors">
              Login
            </Link>
            <Link to="/auth">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm shadow-primary/20">
                Start Free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-4 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-24 overflow-hidden">
        {/* ambient glow */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-primary/10 blur-[120px]" />
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-10 items-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-semibold border border-primary/20">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Built in India 🇮🇳 for Network Marketers
            </div>
            <h1 className="mt-5 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
              The personal CRM<br />
              <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                built for network marketers.
              </span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
              Manage your leads, follow up on time, and close more enrolments — all in one app, right on your phone.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
              <Link to="/auth">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto px-8 h-12 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
                  Start Free
                </Button>
              </Link>
              <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Already have an account? <span className="text-primary font-semibold underline-offset-4 hover:underline">Log in</span>
              </Link>
            </div>
            <p className="mt-5 text-xs sm:text-sm text-muted-foreground">
              7-day free trial · No card needed · Made in India 🇮🇳
            </p>
          </Reveal>

          {/* Inertia orb */}
          <Reveal delay={150}>
            <div className="relative mx-auto w-full max-w-[460px] aspect-square flex items-center justify-center">
              {/* orbiting trails */}
              <div className="absolute inset-0 rounded-full border border-primary/15 animate-[spin_22s_linear_infinite]" />
              <div className="absolute inset-6 rounded-full border border-primary/10 animate-[spin_30s_linear_infinite_reverse]" />
              <div className="absolute inset-14 rounded-full border border-accent/15 animate-[spin_18s_linear_infinite]" />

              {/* orbit dots */}
              <div className="absolute inset-0 animate-[spin_14s_linear_infinite]">
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-primary shadow-[0_0_20px_hsl(var(--primary))]" />
              </div>
              <div className="absolute inset-6 animate-[spin_20s_linear_infinite_reverse]">
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-accent shadow-[0_0_14px_hsl(var(--accent))]" />
              </div>
              <div className="absolute inset-14 animate-[spin_10s_linear_infinite]">
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-primary/80" />
              </div>

              {/* glow core */}
              <div className="absolute w-3/4 h-3/4 rounded-full bg-gradient-to-br from-primary/30 via-accent/15 to-transparent blur-2xl animate-pulse" />

              {/* logo centerpiece */}
              <div className="relative z-10 flex items-center justify-center" style={{ animation: 'floaty 6s ease-in-out infinite' }}>
                <img
                  src={enarsiaSymbol}
                  alt="Enarsia"
                  className="w-48 sm:w-60 md:w-64 h-auto object-contain drop-shadow-[0_10px_40px_hsl(var(--primary)/0.45)]"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* What you get */}
      <section className="px-4 sm:px-6 py-16 sm:py-24 bg-secondary/40 border-y border-border/60">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-primary">What you get</span>
              <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
                Everything a network marketer needs
              </h2>
              <p className="mt-4 text-muted-foreground">
                Enarsia is built around the way you work — prospecting, calling, following up, and enrolling.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 60}>
                <div className="group h-full p-6 rounded-2xl bg-card border border-border hover:border-primary/50 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-bold text-base sm:text-lg">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <p className="mt-10 text-center text-base sm:text-lg font-semibold text-foreground/80">
              From first call to enrolment — <span className="text-primary">Enarsia keeps you moving.</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* Video */}
      <section className="px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-primary">Watch</span>
            <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
              See Enarsia in 60 seconds
            </h2>
            <p className="mt-3 text-muted-foreground">Watch how it works, then start free.</p>
          </Reveal>

          <Reveal delay={150}>
            <div className="mt-10 relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl shadow-primary/10 border border-border">
              {videoPlaying ? (
                <video
                  src={INTRO_VIDEO_URL}
                  poster={INTRO_POSTER_URL || undefined}
                  controls
                  autoPlay
                  playsInline
                  preload="none"
                  className="w-full h-full"
                />
              ) : (
                <button
                  onClick={() => setVideoPlaying(true)}
                  className="absolute inset-0 w-full h-full flex items-center justify-center group bg-gradient-to-br from-primary/25 via-background/20 to-accent/15"
                  aria-label="Play intro video"
                >
                  {INTRO_POSTER_URL && (
                    <img src={INTRO_POSTER_URL} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl shadow-primary/40 group-hover:scale-110 transition-transform">
                    <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
                    <Play className="relative h-8 w-8 sm:h-10 sm:w-10 ml-1" fill="currentColor" />
                  </div>
                </button>
              )}
            </div>
          </Reveal>

          <Reveal delay={250}>
            <div className="mt-8">
              <Link to="/auth">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 font-semibold shadow-lg shadow-primary/25">
                  Start Free
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-4 sm:px-6 py-16 sm:py-24 bg-secondary/40 border-y border-border/60">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-primary">Why Enarsia</span>
              <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
                Built for your business
              </h2>
            </div>
          </Reveal>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {benefits.map((b, i) => (
              <Reveal key={b.title} delay={i * 80}>
                <div className="h-full p-6 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-lg transition-all">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20">
                    <b.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-bold">{b.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-primary">How it works</span>
              <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
                Start moving in minutes
              </h2>
            </div>
          </Reveal>
          <div className="mt-12 grid sm:grid-cols-3 gap-8 relative">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 120}>
                <div className="text-center relative">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center font-extrabold text-xl shadow-lg shadow-primary/30">
                    {s.n}
                  </div>
                  <h3 className="mt-5 font-bold text-lg">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-primary">Pricing</span>
            <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
              Just ₹599/year
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Less than ₹50 a month.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Close one prospect and the whole year pays for itself.
            </p>
            <p className="mt-2 text-xs text-primary/80">
              Launch pricing — for the first 100 subscribers only. Price goes to ₹1,499/year after that.
            </p>
            <div className="mt-8">
              <Link to="/auth">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 text-base font-semibold shadow-lg shadow-primary/25">
                  Start your free trial
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 sm:px-6 py-20 sm:py-28 bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-white/20 blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
              Your work is ready to move.
            </h2>
            <p className="mt-5 text-base sm:text-lg text-primary-foreground/90 max-w-xl mx-auto">
              Bring your leads and follow-ups into one place today.
            </p>
            <div className="mt-8">
              <Link to="/auth">
                <Button size="lg" className="bg-background text-foreground hover:bg-background/90 px-10 h-13 text-base font-bold shadow-2xl">
                  Start Free
                </Button>
              </Link>
            </div>
            <p className="mt-5 text-xs sm:text-sm text-primary-foreground/80">
              Made in India, for network marketers.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-6 py-12 border-t border-border bg-background">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={enarsiaSymbol} alt="Enarsia" className="h-9 w-9 object-contain" />
            <div>
              <div className="font-extrabold text-base">Enarsia</div>
              <div className="text-xs text-muted-foreground">Keep your work in motion.</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs sm:text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/refund" className="hover:text-foreground transition-colors">Refund</Link>
            <span>Made in India 🇮🇳</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes floaty {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
      `}</style>
    </div>
  );
}
