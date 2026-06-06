import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useMemo } from 'react';
import {
  useAcademyCategories,
  useAcademyTutorials,
  useAcademyCompletions,
  formatDuration,
  type AcademyTutorial,
} from '@/hooks/useAcademy';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, CheckCircle2, PlayCircle, ArrowLeft, Loader2 } from 'lucide-react';
import nevoraLogo from '@/assets/nevorai-call-logo.png';

export default function Academy() {
  const { categories } = useAcademyCategories();
  const { tutorials, loading } = useAcademyTutorials();
  const { completedIds } = useAcademyCompletions();
  const { user } = useAuth();

  const grouped = useMemo(() => {
    const byCat = new Map<string, AcademyTutorial[]>();
    tutorials.forEach((t) => {
      const arr = byCat.get(t.category) ?? [];
      arr.push(t);
      byCat.set(t.category, arr);
    });
    return categories
      .map((c) => ({ ...c, items: byCat.get(c.category) ?? [] }))
      .filter((c) => c.items.length > 0);
  }, [tutorials, categories]);

  const total = tutorials.length;
  const completed = tutorials.filter((t) => completedIds.has(t.id)).length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <Helmet>
        <title>Enarsia Academy — Learn Enarsia</title>
        <meta
          name="description"
          content="Free tutorials to help you master Enarsia — the personal CRM for network marketers. Calling, forms, follow-ups, TrackUp, and more."
        />
        <link rel="canonical" href="https://enarsia.nevorai.com/academy" />
        <meta property="og:title" content="Enarsia Academy — Learn Enarsia" />
        <meta
          property="og:description"
          content="Free video tutorials to help you grow with Enarsia."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://enarsia.nevorai.com/academy" />
      </Helmet>

      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to={user ? '/profile' : '/'} className="flex items-center gap-2">
            <img src={nevoraLogo} alt="Enarsia" className="h-8 w-8 rounded-lg" />
            <div>
              <h1 className="text-base font-bold leading-tight">Enarsia Academy</h1>
              <p className="text-[10px] text-muted-foreground">Learn how to grow with Enarsia</p>
            </div>
          </Link>
          {!user && (
            <Link to="/auth">
              <Button size="sm">Sign up free</Button>
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 pb-24">
        {user && total > 0 && (
          <div className="mb-5 rounded-xl bg-card border border-border/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Your progress
              </span>
              <span className="text-xs font-semibold">
                {completed} / {total} completed
              </span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
        )}

        {!user && (
          <div className="mb-5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Track your progress</p>
              <p className="text-[11px] text-muted-foreground">
                Sign up free to mark tutorials complete.
              </p>
            </div>
            <Link to="/auth">
              <Button size="sm">Sign up</Button>
            </Link>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-16">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Enarsia Academy is loading new tutorials — check back soon.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map((g) => (
              <section key={g.category}>
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2 px-1">
                  {g.label || g.category}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {g.items.map((t) => {
                    const done = completedIds.has(t.id);
                    return (
                      <Link
                        key={t.id}
                        to={`/academy/${t.slug}`}
                        className="group rounded-xl bg-card border border-border/50 overflow-hidden hover:shadow-md hover:border-primary/30 transition-all"
                      >
                        <div className="aspect-video bg-muted relative">
                          {t.thumbnail_url ? (
                            <img
                              src={t.thumbnail_url}
                              alt={t.title}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/15 to-muted">
                              <PlayCircle className="h-10 w-10 text-primary/60" />
                            </div>
                          )}
                          {done && (
                            <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-semibold">
                              <CheckCircle2 className="h-3 w-3" /> Done
                            </span>
                          )}
                          {t.duration_seconds > 0 && (
                            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px]">
                              {formatDuration(t.duration_seconds)}
                            </span>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                            {t.title}
                          </p>
                          {t.description && (
                            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                              {t.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
