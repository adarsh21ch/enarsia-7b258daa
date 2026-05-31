import { useRef, useState } from 'react';
import { Play, Pause, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDuration } from '@/hooks/useAudioRecorder';
import { HoldToRecordMic } from '@/components/creator/HoldToRecordMic';
import { cn } from '@/lib/utils';


const BUCKET = 'creator-audio';

interface Props {
  value: string | null | undefined;
  onChange: (url: string | null) => void | Promise<void>;
  /** Compact = small inline pill (best inside Studio sections). */
  compact?: boolean;
  label?: string;
  disabled?: boolean;
}

/**
 * Inline audio recorder + player. Records via MediaRecorder, uploads the
 * resulting webm to the `creator-audio` storage bucket under
 * `{user_id}/{uuid}.webm`, and calls onChange with the public URL.
 */
export function AudioRecorderField({ value, onChange, compact, label, disabled }: Props) {
  const { user } = useAuth();
  const [playing, setPlaying] = useState(false);
  const [playbackPos, setPlaybackPos] = useState(0);
  const [playbackDur, setPlaybackDur] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleDelete = async () => {
    if (!value) return;
    try {
      const match = value.match(/creator-audio\/([^?]+)/);
      if (match?.[1] && user) {
        const path = decodeURIComponent(match[1]);
        if (path.startsWith(`${user.id}/`)) {
          await supabase.storage.from(BUCKET).remove([path]);
        }
      }
    } catch { }
    if (audioRef.current) { audioRef.current.pause(); }
    setPlaying(false);
    setPlaybackPos(0);
    await onChange(null);
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => toast.error('Could not play audio')); }
  };


  // ---- Render ----

  // Existing audio: show player + delete
  if (value) {
    const pct = playbackDur > 0 ? Math.min(100, (playbackPos / playbackDur) * 100) : 0;
    return (
      <div className={cn('flex items-center gap-2 rounded-xl border border-border/50 bg-card px-2.5 py-1.5', compact && 'py-1')}>
        <button
          type="button"
          onClick={togglePlay}
          className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 active:scale-95 transition-transform"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 translate-x-[1px]" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
            {formatDuration(playbackPos)} {playbackDur > 0 && `/ ${formatDuration(playbackDur)}`}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive flex items-center justify-center shrink-0"
          aria-label="Delete audio"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <audio
          ref={audioRef}
          src={value}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const d = (e.currentTarget as HTMLAudioElement).duration;
            if (Number.isFinite(d)) setPlaybackDur(d);
          }}
          onTimeUpdate={(e) => setPlaybackPos((e.currentTarget as HTMLAudioElement).currentTime)}
          onEnded={() => { setPlaying(false); setPlaybackPos(0); }}
          className="hidden"
        />
      </div>
    );
  }

  // No audio yet (or actively recording): show mic button (+ cancel during recording)
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleRecordClick}
        disabled={disabled || uploading || state === 'stopping'}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full font-semibold transition-all active:scale-95',
          compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
          isRecording
            ? 'bg-red-500 text-white border border-red-600 animate-pulse'
            : 'bg-muted border border-border/50 text-muted-foreground hover:text-foreground',
          (uploading || state === 'stopping') && 'opacity-60',
        )}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {uploading || state === 'stopping' ? (
          <Loader2 className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5', 'animate-spin')} />
        ) : isRecording ? (
          <Square className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5', 'fill-current')} />
        ) : (
          <Mic className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        )}
        <span className="tabular-nums">
          {isRecording ? formatDuration(durationSec) : uploading ? 'Uploading…' : (label || 'Record')}
        </span>
      </button>
      {isRecording && (
        <button
          type="button"
          onClick={cancel}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
