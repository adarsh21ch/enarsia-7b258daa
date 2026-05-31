import { useEffect, useRef, useState } from 'react';
import { Mic, Loader2, Square } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudioRecorder, formatDuration } from '@/hooks/useAudioRecorder';
import { cn } from '@/lib/utils';

const BUCKET = 'creator-audio';

interface Props {
  /** Called with the signed URL once recording finishes uploading. */
  onComplete: (signedUrl: string) => void | Promise<void>;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
}

/**
 * WhatsApp-style press-and-hold mic button.
 *
 * Pointer-down starts recording. Pointer-up uploads and fires `onComplete`.
 * Sliding/dragging off the button (pointer-leave) or pressing Escape
 * cancels and discards the recording.
 */
export function HoldToRecordMic({ onComplete, compact, disabled, className, label }: Props) {
  const { user } = useAuth();
  const { state, durationSec, supported, start, stop, cancel } = useAudioRecorder();
  const [uploading, setUploading] = useState(false);
  const holdingRef = useRef(false);
  const isRecording = state === 'recording';

  useEffect(() => {
    if (!isRecording) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        holdingRef.current = false;
        cancel();
        toast('Cancelled');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isRecording, cancel]);

  const begin = async () => {
    if (disabled) return;
    if (!supported) { toast.error('Audio not supported — try Chrome or Safari iOS 14.3+'); return; }
    if (!user) { toast.error('Please sign in to record'); return; }
    holdingRef.current = true;
    await start();
  };

  const finish = async () => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setUploading(true);
    try {
      const blob = await stop();
      if (!blob || !user) return;
      const id = (crypto as any).randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const path = `${user.id}/${id}.webm`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, {
        contentType: blob.type || 'audio/webm', upsert: false,
      });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage.from(BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr) throw signErr;
      await onComplete(signed.signedUrl);
    } catch (e: any) {
      toast.error(e?.message || 'Could not upload audio');
    } finally {
      setUploading(false);
    }
  };

  const abort = () => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    cancel();
    toast('Cancelled');
  };

  return (
    <button
      type="button"
      disabled={disabled || uploading || state === 'stopping'}
      onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); begin(); }}
      onPointerUp={() => finish()}
      onPointerLeave={() => abort()}
      onPointerCancel={() => abort()}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold transition-all select-none touch-none',
        compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
        isRecording
          ? 'bg-red-500 text-white border border-red-600 scale-105 shadow-lg shadow-red-500/30'
          : 'bg-muted border border-border/50 text-muted-foreground hover:text-foreground active:scale-95',
        (uploading || state === 'stopping') && 'opacity-60',
        className,
      )}
      aria-label={isRecording ? 'Recording — release to send, slide away to cancel' : 'Hold to record'}
    >
      {uploading || state === 'stopping' ? (
        <Loader2 className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5', 'animate-spin')} />
      ) : isRecording ? (
        <Square className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5', 'fill-current animate-pulse')} />
      ) : (
        <Mic className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      )}
      <span className="tabular-nums">
        {isRecording ? formatDuration(durationSec) : uploading ? 'Saving…' : (label || 'Hold')}
      </span>
    </button>
  );
}
