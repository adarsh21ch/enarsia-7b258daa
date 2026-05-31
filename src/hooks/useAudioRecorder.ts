import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderState = 'idle' | 'recording' | 'stopping';

export interface UseAudioRecorder {
  state: RecorderState;
  durationSec: number;
  supported: boolean;
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
  cancel: () => void;
  error: string | null;
}

/**
 * Thin wrapper around the MediaRecorder API. Returns a webm Blob on stop.
 * Caller is responsible for uploading and persisting the URL.
 */
export function useAudioRecorder(): UseAudioRecorder {
  const [state, setState] = useState<RecorderState>('idle');
  const [durationSec, setDurationSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  const supported =
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia;

  const cleanup = useCallback(() => {
    if (intervalRef.current) { window.clearInterval(intervalRef.current); intervalRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    if (!supported) { setError('Audio not supported — try Chrome or Safari iOS 14.3+'); return; }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.start();
      recorderRef.current = rec;
      startedAtRef.current = Date.now();
      setDurationSec(0);
      setState('recording');
      intervalRef.current = window.setInterval(() => {
        setDurationSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
    } catch (e: any) {
      setError(e?.message || 'Microphone permission denied');
      cleanup();
      setState('idle');
    }
  }, [supported, cleanup]);

  const stop = useCallback(async (): Promise<Blob | null> => {
    const rec = recorderRef.current;
    if (!rec || rec.state === 'inactive') { cleanup(); setState('idle'); return null; }
    setState('stopping');
    return new Promise<Blob | null>((resolve) => {
      rec.onstop = () => {
        const type = rec.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        cleanup();
        setState('idle');
        resolve(blob.size > 0 ? blob : null);
      };
      try { rec.stop(); } catch { cleanup(); setState('idle'); resolve(null); }
    });
  }, [cleanup]);

  const cancel = useCallback(() => {
    try { recorderRef.current?.stop(); } catch {}
    cleanup();
    setState('idle');
    setDurationSec(0);
  }, [cleanup]);

  return { state, durationSec, supported, start, stop, cancel, error };
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
