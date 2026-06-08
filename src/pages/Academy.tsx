import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useMemo, useState } from 'react';
import {
  useAcademyCategories,
  useAcademyTutorials,
  useAcademyProgress,
  formatDuration,
  type AcademyTutorial,
  type AcademyFormat,
} from '@/hooks/useAcademy';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GraduationCap,
  CheckCircle2,
  PlayCircle,
  ArrowLeft,
  Loader2,
  Search as SearchIcon,
  Smartphone,
  Monitor,
} from 'lucide-react';
import nevoraLogo from '@/assets/nevorai-call-logo.png';
import { cn } from '@/lib/utils';

export default function Academy() {
  const { categories } = useAcademyCategories();
  const { tutorials, loading } = useAcademyTutorials();
  const { completedIds } = useAcademyProgress();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [format, setFormat] = useState<AcademyFormat>('mobile');

  const mobileCount = tutorials.filter((t) => (t.format || 'mobile') === 'mobile').length;
  const desktopCount = tutorials.filter((t) => t.format === 'desktop').length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byFormat = tutorials.filter((t) => (t.format || 'mobile') === format);
    if (!q) return byFormat;
    return byFormat.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [tutorials, search, format]);

  const grouped = useMemo(() => {
    const byCat = new Map<string, AcademyTutorial[]>();
    filtered.forEach((t) => {
      const arr = byCat.get(t.category) ?? [];
      arr.push(t);
      byCat.set(t.category, arr);
    });
    const known = new Set(categories.map((c) => c.category));
    const sections = categories
      .map((c) => ({ ...c, items: byCat.get(c.category) ?? [] }))
      .filter((c) => c.items.length > 0);
    Array.from(byCat.entries())
      .filter(([cat]) => !known.has(cat))
      .forEach(([cat, items]) =>
        sections.push({ category: cat, label: cat, order_index: 999, items })
      );
    return sections;
  }, [filtered, categories]);

  const scopedTotal = filtered.length;
  const scopedCompleted = filtered.filter((t) => completedIds.has(t.id)).length;
  const pct = scopedTotal ? Math.round((scopedCompleted / scopedTotal) * 100) : 0;

  const isMobileFormat = format === 'mobile';

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-background via-background to-muted/20">
      <Helmet>
        <title>Enarsia Academy — Learn Enarsia</title>
        <meta
          name="description"
          content="In-app tutorials to master Enarsia — Mobile View shorts and Desktop View deep dives."
        />
        <link rel="canonical" href="https://enarsia.nevorai.com/academy" />
      </Helmet>

      <header className="shrink-0 sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              to={user ? '/profile' : '/'}
              aria-label="Back"
              className="p-2 -ml-1 rounded-lg hover:bg-muted/60 active:scale-95 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <img src={nevoraLogo} alt="Enarsia" className="h-8 w-8 rounded-lg" />
            <div className="min-w-0">
              <h1 className="text-base font-bold leading-tight truncate">Enarsia Academy</h1>
              <p className="text-[10px] text-muted-foreground truncate">
                Tutorials to master Enarsia
              </p>
            </div>
          </div>
          {!user && (
            <Link to="/auth">
              <Button size="sm">Sign up free</Button>
            </Link>
          )}
        </div>
        <div className="max-w-3xl mx-auto px-3 sm:px-4 pb-2.5">
          <Tabs value={format} onValueChange={(v) => setFormat(v as AcademyFormat)}>
            <TabsList className="grid grid-cols-2 w-full h-10 rounded-xl bg-muted/60">
              <TabsTrigger value="mobile" className="text-[13px] font-semibold gap-1.5 rounded-lg data-[state=active]:shadow-sm">
                <Smartphone className="h-4 w-4" />
                Mobile View
                <span className="text-[10px] opacity-70">({mobileCount})</span>
              </TabsTrigger>
              <TabsTrigger value="desktop" className="text-[13px] font-semibold gap-1.5 rounded-lg data-[state=active]:shadow-sm">
                <Monitor className="h-4 w-4" />
                Desktop View
                <span className="text-[10px] opacity-70">({desktopCount})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 pb-24 space-y-3">
          {user && scopedTotal > 0 && (
            <div className="rounded-xl bg-card border border-border/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Your progress
                </span>
                <span className="text-xs font-semibold">
                  {scopedCompleted} of {scopedTotal} completed
                </span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          )}

          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${isMobileFormat ? 'Mobile View' : 'Desktop View'} tutorials…`}
              className="pl-9 h-10 rounded-xl"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-16">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {search
                  ? 'No tutorials match your search.'
                  : `No ${isMobileFormat ? 'Mobile View' : 'Desktop View'} tutorials yet — check back soon.`}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {grouped.map((g) => (
                <section key={g.category}>
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
                    {g.label || g.category}
                  </h2>
                  {isMobileFormat ? (
                    <ul className="divide-y divide-border/50 rounded-2xl bg-card border border-border/50 overflow-hidden">
                      {g.items.map((t) => {
                        const done = completedIds.has(t.id);
                        return (
                          <li key={t.id}>
                            <Link
                              to={`/academy/${t.slug}`}
                              className="flex items-stretch gap-3 p-2.5 hover:bg-muted/40 active:bg-muted/60 transition-colors min-h-[72px]"
                            >
                              {/* 9:16 thumb */}
                              <div className="relative h-[72px] w-[44px] shrink-0 rounded-lg overflow-hidden bg-muted">
                                <ThumbContent t={t} />
                              </div>
                              <div className="min-w-0 flex-1 flex flex-col justify-center">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-semibold leading-snug line-clamp-2">
                                    {t.title}
                                  </p>
                                  {done && <DoneBadge />}
                                </div>
                                {t.description && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                                    {t.description}
                                  </p>
                                )}
                                {t.duration_seconds > 0 && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {formatDuration(t.duration_seconds)}
                                  </p>
                                )}
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {g.items.map((t) => {
                        const done = completedIds.has(t.id);
                        return (
                          <Link
                            key={t.id}
                            to={`/academy/${t.slug}`}
                            className="group rounded-2xl overflow-hidden bg-card border border-border/50 hover:border-primary/50 transition-colors"
                          >
                            {/* 16:9 thumb */}
                            <div className="relative w-full aspect-video bg-muted">
                              <ThumbContent t={t} />
                            </div>
                            <div className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold leading-snug line-clamp-2">
                                  {t.title}
                                </p>
                                {done && <DoneBadge />}
                              </div>
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
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ThumbContent({ t }: { t: AcademyTutorial }) {
  return (
    <>
      {t.thumbnail_url ? (
        <img
          src={t.thumbnail_url}
          alt={t.title}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/25 to-primary/5">
          <PlayCircle className="h-7 w-7 text-primary/80" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-9 w-9 rounded-full bg-white/20 backdrop-blur ring-1 ring-white/40 flex items-center justify-center">
          <PlayCircle className="h-5 w-5 text-white" />
        </div>
      </div>
      {t.duration_seconds > 0 && (
        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-medium leading-none">
          {formatDuration(t.duration_seconds)}
        </span>
      )}
    </>
  );
}

function DoneBadge() {
  return (
    <span className={cn(
      'shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold'
    )}>
      <CheckCircle2 className="h-3 w-3" />
      Done
    </span>
  );
}
