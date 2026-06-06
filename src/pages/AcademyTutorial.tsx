import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import {
  useAcademyTutorials,
  useAcademyCompletions,
  formatDuration,
  type AcademyTutorial,
} from '@/hooks/useAcademy';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Loader2, ChevronRight, PlayCircle } from 'lucide-react';
import nevoraLogo from '@/assets/nevorai-call-logo.png';
import { toast } from 'sonner';

export default function AcademyTutorial() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tutorials } = useAcademyTutorials();
  const { completedIds, markComplete, unmarkComplete } = useAcademyCompletions();

  const [tutorial, setTutorial] = useState<AcademyTutorial | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('academy_tutorials' as any)
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();
      if (alive) {
        setTutorial((data as any) || null);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const next = useMemo<AcademyTutorial | null>(() => {
    if (!tutorial || !tutorials.length) return null;
    const same = tutorials
      .filter((t) => t.category === tutorial.category)
      .sort((a, b) => a.order_index - b.order_index);
    const idx = same.findIndex((t) => t.id === tutorial.id);
    if (idx >= 0 && idx < same.length - 1) return same[idx + 1];
    // fall back to next category's first tutorial
    const allOrdered = tutorials.slice().sort((a, b) => {
      if (a.category < b.category) return -1;
      if (a.category > b.category) return 1;
      return a.order_index - b.order_index;
    });
    const i = allOrdered.findIndex((t) => t.id === tutorial.id);
    return i >= 0 && i < allOrdered.length - 1 ? allOrdered[i + 1] : null;
  }, [tutorial, tutorials]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tutorial) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="text-xl font-bold mb-2">Tutorial not found</h1>
        <p className="text-sm text-muted-foreground mb-4">
          This Academy tutorial may have been moved or unpublished.
        </p>
        <Link to="/academy">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Academy
          </Button>
        </Link>
      </div>
    );
  }

  const done = completedIds.has(tutorial.id);
  const url = `https://enarsia.nevorai.com/academy/${tutorial.slug}`;

  const handleToggleComplete = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (done) {
      await unmarkComplete(tutorial.id);
      toast('Marked as not completed');
    } else {
      await markComplete(tutorial.id);
      toast.success('Marked as completed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Helmet>
        <title>{tutorial.title} — Enarsia Academy</title>
        <meta name="description" content={tutorial.description.slice(0, 160) || `Learn ${tutorial.title} with Enarsia Academy.`} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={`${tutorial.title} — Enarsia Academy`} />
        <meta property="og:description" content={tutorial.description.slice(0, 160) || 'Free Enarsia tutorial.'} />
        <meta property="og:type" content="video.other" />
        <meta property="og:url" content={url} />
        {tutorial.thumbnail_url && <meta property="og:image" content={tutorial.thumbnail_url} />}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'VideoObject',
            name: tutorial.title,
            description: tutorial.description,
            thumbnailUrl: tutorial.thumbnail_url || undefined,
            uploadDate: tutorial.created_at,
            contentUrl: tutorial.video_url || undefined,
            duration: tutorial.duration_seconds
              ? `PT${Math.floor(tutorial.duration_seconds / 60)}M${tutorial.duration_seconds % 60}S`
              : undefined,
          })}
        </script>
      </Helmet>

      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/academy" className="flex items-center gap-2 min-w-0">
            <img src={nevoraLogo} alt="Enarsia" className="h-8 w-8 rounded-lg" />
            <div className="min-w-0">
              <h1 className="text-sm font-bold leading-tight truncate">Enarsia Academy</h1>
              <p className="text-[10px] text-muted-foreground capitalize">{tutorial.category}</p>
            </div>
          </Link>
          {!user && (
            <Link to="/auth">
              <Button size="sm">Sign up free</Button>
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 pb-24 space-y-4">
        <div className="aspect-video bg-black rounded-xl overflow-hidden">
          {tutorial.video_url ? (
            <video
              src={tutorial.video_url}
              controls
              playsInline
              poster={tutorial.thumbnail_url || undefined}
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/70">
              <PlayCircle className="h-12 w-12 mb-2" />
              <p className="text-sm">Video coming soon</p>
            </div>
          )}
        </div>

        <div>
          <h1 className="text-xl font-bold leading-tight">{tutorial.title}</h1>
          {tutorial.duration_seconds > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {formatDuration(tutorial.duration_seconds)} · {tutorial.category}
            </p>
          )}
          {tutorial.description && (
            <p className="text-sm text-foreground/80 mt-3 whitespace-pre-wrap">
              {tutorial.description}
            </p>
          )}
        </div>

        {user ? (
          <Button
            onClick={handleToggleComplete}
            variant={done ? 'outline' : 'default'}
            className="w-full"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {done ? 'Completed — tap to undo' : 'Mark as completed'}
          </Button>
        ) : (
          <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Sign up to track progress</p>
              <p className="text-[11px] text-muted-foreground">
                Free account. Mark tutorials complete and pick up where you left off.
              </p>
            </div>
            <Link to="/auth">
              <Button size="sm">Sign up free</Button>
            </Link>
          </div>
        )}

        {next && (
          <Link
            to={`/academy/${next.slug}`}
            className="block rounded-xl bg-card border border-border/50 p-3 hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
              Next tutorial
            </p>
            <div className="flex items-center justify-between gap-2 mt-1">
              <p className="text-sm font-semibold truncate">{next.title}</p>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </Link>
        )}
      </main>
    </div>
  );
}
