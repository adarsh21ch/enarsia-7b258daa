import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Bell, TrendingUp, Sparkles, Play } from 'lucide-react';
import enarsiaSymbol from '@/assets/enarsia-symbol.png';

const INTRO_VIDEO_URL = 'https://<R2_PUBLIC_URL>/enarsia-intro.mp4';
const INTRO_POSTER_URL = ''; // optional poster image URL

const benefits = [
  { icon: Users, title: 'All your leads in one place', desc: 'No more scattered contacts across notebooks and chats.' },
  { icon: Bell, title: 'Never miss a follow-up', desc: 'Smart reminders so no lead goes cold.' },
  { icon: TrendingUp, title: 'Close more deals', desc: 'Track every conversation from first call to done.' },
  { icon: Sparkles, title: 'AI does the boring part', desc: 'Let AI help you write, organize, and stay on top.' },
];

const steps = [
  { n: '1', title: 'Add your leads', desc: 'Import or add contacts in seconds.' },
  { n: '2', title: 'Follow up on time', desc: 'Get reminders that keep you consistent.' },
  { n: '3', title: 'Close more deals', desc: 'Track every conversation to the win.' },
];

export default function Landing() {
  const [videoPlaying, setVideoPlaying] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={enarsiaSymbol} alt="Enarsia" className="h-7 w-7 object-contain" />
            <span className="font-semibold text-base tracking-tight">Enarsia</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/auth" className="text-sm font-medium px-3 py-2 hover:text-primary transition-colors">
              Login
            </Link>
            <Link to="/auth">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Sign up free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 sm:px-6 pt-10 sm:pt-16 pb-12 sm:pb-20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
              The smart CRM<br />for your work
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl">
              Keep all your leads and contacts in one place, follow up on time, and close more deals — with a little help from AI.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
              <Link to="/auth">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto px-8">
                  Start free
                </Button>
              </Link>
              <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Already have an account? <span className="text-primary underline">Log in</span>
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              7-day free trial · No card needed · Made in India 🇮🇳
            </p>
          </div>

          <div className="relative flex items-center justify-center animate-in fade-in zoom-in-95 duration-1000">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent rounded-full blur-3xl" />
            <img
              src={enarsiaSymbol}
              alt="Enarsia"
              className="relative w-56 sm:w-72 md:w-80 h-auto object-contain animate-pulse-slow"
              style={{ animation: 'float 6s ease-in-out infinite' }}
            />
          </div>
        </div>

        {/* Who it's for */}
        <div className="max-w-6xl mx-auto mt-12 flex flex-wrap gap-2 justify-center">
          {['Network marketers', 'Sales professionals', 'Working professionals'].map(p => (
            <span key={p} className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs sm:text-sm font-medium">
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* Intro video */}
      <section className="px-4 sm:px-6 py-12 sm:py-16 bg-secondary/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            See Enarsia in 60 seconds
          </h2>
          <p className="mt-3 text-muted-foreground">Watch how it works, then start free.</p>

          <div className="mt-8 relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl border border-border">
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
                className="absolute inset-0 w-full h-full flex items-center justify-center group bg-gradient-to-br from-primary/20 to-background/40"
                aria-label="Play intro video"
              >
                {INTRO_POSTER_URL && (
                  <img src={INTRO_POSTER_URL} alt="Video thumbnail" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                  <Play className="h-7 w-7 sm:h-8 sm:w-8 ml-1" fill="currentColor" />
                </div>
              </button>
            )}
          </div>

          <div className="mt-6">
            <Link to="/auth">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8">
                Start free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-center">
            Everything you need to stay on top
          </h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {benefits.map(b => (
              <div key={b.title} className="p-6 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <b.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-base">{b.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 bg-secondary/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-center">
            How it works
          </h2>
          <div className="mt-10 grid sm:grid-cols-3 gap-6 sm:gap-8">
            {steps.map(s => (
              <div key={s.n} className="text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  {s.n}
                </div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 sm:px-6 py-16 sm:py-24 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Ready to get organized?
          </h2>
          <p className="mt-4 text-primary-foreground/85">Join thousands closing more deals with Enarsia.</p>
          <div className="mt-7">
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="bg-background text-foreground hover:bg-background/90 px-8">
                Start free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-6 py-10 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={enarsiaSymbol} alt="Enarsia" className="h-6 w-6 object-contain" />
            <div>
              <div className="font-semibold text-sm">Enarsia</div>
              <div className="text-xs text-muted-foreground">The smart CRM for your work</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/refund" className="hover:text-foreground">Refund</Link>
            <span>Made in India 🇮🇳</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
}
