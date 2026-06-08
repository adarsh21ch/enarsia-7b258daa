import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  useAcademyTutorials,
  useAcademyProgress,
  formatDuration,
  type AcademyTutorial,
} from '@/hooks/useAcademy';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  CheckCircle2,
  Loader2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/** Sort tutorials globally so swipe up/down has stable order. */
function buildPlaylist(tutorials: AcademyTutorial[]): AcademyTutorial[] {
  return tutorials.slice().sort((a, b) => {
    if (a.category < b.category) return -1;
    if (a.category > b.category) return 1;
    return (a.order_index || 0) - (b.order_index || 0);
  });
}

export default function AcademyTutorial() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tutorials, loading } = useAcademyTutorials();
  const { completedIds, progress, markComplete, saveProgress } = useAcademyProgress();

  const playlist = useMemo(() => buildPlaylist(tutorials), [tutorials]);
  const currentIndex = useMemo(
    () => playlist.findIndex((t) => t.slug === slug),
    [playlist, slug]
  );
  const tutorial = currentIndex >= 0 ? playlist[currentIndex] : null;

  const prev = currentIndex > 0 ? playlist[currentIndex - 1] : null;
  const next =
    currentIndex >= 0 && currentIndex < playlist.length - 1
      ? playlist[currentIndex + 1]
      : null;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<number | null>(null);
  const resumedRef = useRef(false);
  const completedFiredRef = useRef(false);

  // Reset state when switching tutorial
  useEffect(() => {
    resumedRef.current = false;
    completedFiredRef.current = false;
    setProgressPct(0);
    setCurrentTime(0);
    setDuration(tutorial?.duration_seconds || 0);
    setPlaying(false);
    setShowControls(true);
  }, [tutorial?.id]);

  // Autoplay (muted is not required; we don't autoplay with sound by default but
  // we leave audio per user toggle. To avoid mobile autoplay blocks, we don't force play here.)
  // The user taps to play.

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => setPlaying(false));
    } else {
      v.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const close = useCallback(() => navigate('/academy'), [navigate]);

  const goto = useCallback(
    (t: AcademyTutorial | null) => {
      if (!t) return;
      navigate(`/academy/${t.slug}`);
    },
    [navigate]
  );

  // Swipe gestures
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const tc = e.touches[0];
    touchStart.current = { x: tc.clientX, y: tc.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touchStart.current;
    if (!s) return;
    const tc = e.changedTouches[0];
    const dx = tc.clientX - s.x;
    const dy = tc.clientY - s.y;
    const dt = Date.now() - s.t;
    touchStart.current = null;
    if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) * 1.5 && dt < 600) {
      if (dy < 0) goto(next);
      else goto(prev);
    }
  };

  // Keyboard navigation (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowDown' || e.key === 'PageDown') goto(next);
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') goto(prev);
      else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key.toLowerCase() === 'm') toggleMute();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, goto, next, prev, togglePlay, toggleMute]);

  // Auto-hide controls
  const wakeControls = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowControls(false), 2500);
  }, []);
  useEffect(() => {
    wakeControls();
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [wakeControls, tutorial?.id]);

  const onLoadedMeta = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration || tutorial?.duration_seconds || 0);
    // Resume from saved position
    if (!resumedRef.current && tutorial) {
      const saved = progress[tutorial.id]?.last_position_seconds || 0;
      if (saved > 3 && v.duration && saved < v.duration - 5) {
        v.currentTime = saved;
      }
      resumedRef.current = true;
    }
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !tutorial) return;
    const cur = v.currentTime;
    const dur = v.duration || tutorial.duration_seconds || 0;
    setCurrentTime(cur);
    if (dur > 0) setProgressPct((cur / dur) * 100);
    // Persist progress (throttled inside hook)
    saveProgress(tutorial.id, cur, dur);
    // Mark complete near end
    if (
      !completedFiredRef.current &&
      dur > 0 &&
      cur / dur >= 0.9 &&
      !completedIds.has(tutorial.id)
    ) {
      completedFiredRef.current = true;
      markComplete(tutorial.id);
    }
  };

  const onEnded = () => {
    if (!tutorial) return;
    if (!completedIds.has(tutorial.id)) markComplete(tutorial.id);
    if (next) {
      // small delay then advance
      window.setTimeout(() => goto(next), 600);
    }
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const pct = Number(e.target.value);
    const dur = v.duration || tutorial?.duration_seconds || 0;
    if (dur > 0) {
      v.currentTime = (pct / 100) * dur;
      setProgressPct(pct);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    );
  }

  if (!tutorial) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6 text-center">
        <h1 className="text-xl font-bold mb-2">Tutorial not found</h1>
        <p className="text-sm text-white/60 mb-4">
          This Academy tutorial may have been moved or unpublished.
        </p>
        <Link to="/academy">
          <Button variant="secondary">Back to Academy</Button>
        </Link>
      </div>
    );
  }

  const done = completedIds.has(tutorial.id);
  const url = `https://enarsia.nevorai.com/academy/${tutorial.slug}`;

  const handleMarkComplete = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    await markComplete(tutorial.id);
    toast.success('Marked as completed');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black text-white overflow-hidden touch-none select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseMove={wakeControls}
    >
      <Helmet>
        <title>{tutorial.title} — Enarsia Academy</title>
        <meta
          name="description"
          content={
            tutorial.description.slice(0, 160) ||
            `Learn ${tutorial.title} with Enarsia Academy.`
          }
        />
        <link rel="canonical" href={url} />
      </Helmet>

      {/* Video container — 9:16 centered */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full h-full sm:w-auto sm:h-full sm:aspect-[9/16] sm:max-h-[calc(100vh-2rem)] bg-black overflow-hidden sm:rounded-2xl">
          {tutorial.video_url ? (
            <video
              key={tutorial.id}
              ref={videoRef}
              src={tutorial.video_url}
              poster={tutorial.thumbnail_url || undefined}
              className="absolute inset-0 w-full h-full object-contain bg-black"
              playsInline
              preload="metadata"
              controlsList="nodownload"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onLoadedMetadata={onLoadedMeta}
              onTimeUpdate={onTimeUpdate}
              onEnded={onEnded}
              onClick={() => {
                togglePlay();
                wakeControls();
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/60">
              Video coming soon
            </div>
          )}

          {/* Center play button when paused */}
          {!playing && (
            <button
              type="button"
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center group"
              aria-label="Play"
            >
              <span className="h-20 w-20 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/40 flex items-center justify-center group-active:scale-95 transition-transform">
                <Play className="h-10 w-10 text-white fill-white ml-1" />
              </span>
            </button>
          )}

          {/* Top bar */}
          <div
            className={cn(
              'absolute top-0 left-0 right-0 z-20 p-3 pt-[max(env(safe-area-inset-top),0.75rem)] bg-gradient-to-b from-black/70 to-transparent flex items-center justify-between transition-opacity duration-300',
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
          >
            <button
              onClick={close}
              className="h-9 w-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center active:scale-95"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <span className="text-[10px] uppercase tracking-wider opacity-80 capitalize px-2">
              {tutorial.category}
            </span>
            <button
              onClick={toggleMute}
              className="h-9 w-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center active:scale-95"
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          </div>

          {/* Side swipe hints (desktop / tablet) */}
          {prev && (
            <button
              onClick={() => goto(prev)}
              className={cn(
                'hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/40 backdrop-blur items-center justify-center active:scale-95 transition-opacity',
                showControls ? 'opacity-90' : 'opacity-0 pointer-events-none'
              )}
              aria-label="Previous"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
          )}
          {next && (
            <button
              onClick={() => goto(next)}
              className={cn(
                'hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/40 backdrop-blur items-center justify-center active:scale-95 transition-opacity',
                showControls ? 'opacity-90' : 'opacity-0 pointer-events-none'
              )}
              aria-label="Next"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          )}

          {/* Bottom overlay: title + desc + controls */}
          <div
            className={cn(
              'absolute left-0 right-0 bottom-0 z-20 p-4 pb-[max(env(safe-area-inset-bottom),1rem)] bg-gradient-to-t from-black/85 via-black/40 to-transparent transition-opacity duration-300',
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
          >
            <div className="flex items-end gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold leading-tight line-clamp-2">
                  {tutorial.title}
                </h2>
                {tutorial.description && (
                  <p className="text-xs text-white/80 mt-1 line-clamp-2">
                    {tutorial.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 text-[10px] text-white/70">
                  <span>
                    {formatDuration(Math.floor(currentTime))} /{' '}
                    {formatDuration(Math.floor(duration))}
                  </span>
                  {done && (
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Completed
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="h-10 w-10 rounded-full bg-white/15 backdrop-blur ring-1 ring-white/40 flex items-center justify-center active:scale-95"
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  {playing ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5" />
                  )}
                </button>
                {!done && user && (
                  <button
                    onClick={handleMarkComplete}
                    className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/90 text-white font-semibold active:scale-95"
                  >
                    Mark done
                  </button>
                )}
              </div>
            </div>

            {/* Seek bar */}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                step={0.1}
                value={progressPct}
                onChange={onSeek}
                className="flex-1 accent-emerald-400 h-1 cursor-pointer"
                aria-label="Seek"
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-white/60 mt-2">
              <span>
                {currentIndex + 1} of {playlist.length}
              </span>
              <span className="sm:hidden">Swipe up for next</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
