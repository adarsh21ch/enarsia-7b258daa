import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Trash2 } from 'lucide-react';
import { NoteAttachment } from '@/hooks/useNoteAttachments';

interface AudioRecorderProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  attachments: NoteAttachment[];
  onDelete: (att: NoteAttachment) => void;
}

export function AudioPlayer({ url, fileName }: { url: string; fileName?: string | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setProgress(audio.currentTime);
    const onLoaded = () => { setDuration(audio.duration); setLoadError(false); };
    const onEnded = () => { setPlaying(false); setProgress(0); };
    const onError = () => setLoadError(true);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  const toggle = async () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setPlaying(true);
      } catch {
        setLoadError(true);
      }
    }
  };

  const formatTime = (s: number) => {
    if (!isFinite(s) || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loadError) {
    return (
      <div className="flex items-center gap-2.5 bg-destructive/5 border border-destructive/15 rounded-xl px-3 py-2.5">
        <span className="text-xs text-destructive">Audio format not supported on this browser</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 bg-accent/5 border border-accent/15 rounded-xl px-3 py-2.5">
      <audio ref={audioRef} src={url} preload="metadata" crossOrigin="anonymous" />
      <button onClick={toggle} className="shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center active:scale-95 transition-transform">
        {playing ? <Pause className="h-3.5 w-3.5 text-accent" /> : <Play className="h-3.5 w-3.5 text-accent ml-0.5" />}
      </button>
      <div className="flex-1 space-y-1">
        <div className="h-1.5 bg-accent/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all"
            style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
          />
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-muted-foreground tabular-nums">{formatTime(progress)}</span>
          <span className="text-[10px] text-muted-foreground tabular-nums">{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

export function AudioRecorder({ isRecording, onStartRecording, onStopRecording, attachments, onDelete }: AudioRecorderProps) {
  const audioAttachments = attachments.filter(a => a.type === 'audio');
  if (audioAttachments.length === 0) return null;

  return (
    <div className="space-y-2">
      {audioAttachments.map(att => (
        <div key={att.id} className="relative group">
          <AudioPlayer url={att.publicUrl || ''} fileName={att.file_name} />
          <button
            onClick={() => onDelete(att)}
            className="absolute -top-1.5 -right-1.5 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

// Determine best supported audio MIME type
function getPreferredMimeType(): { mimeType: string; ext: string } {
  const candidates = [
    { mimeType: 'audio/mp4', ext: 'mp4' },
    { mimeType: 'audio/aac', ext: 'aac' },
    { mimeType: 'audio/mpeg', ext: 'mp3' },
    { mimeType: 'audio/ogg; codecs=opus', ext: 'ogg' },
    { mimeType: 'audio/webm; codecs=opus', ext: 'webm' },
    { mimeType: 'audio/webm', ext: 'webm' },
  ];

  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return { mimeType: '', ext: 'webm' }; // fallback, let browser choose
}

// Hook for recording logic
export function useAudioRecording(onRecordComplete: (file: File, duration: number) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number>(0);
  const startTimeRef = useRef(0);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = getPreferredMimeType();

      const options: MediaRecorderOptions = {};
      if (preferred.mimeType) options.mimeType = preferred.mimeType;

      const recorder = new MediaRecorder(stream, options);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const actualMime = recorder.mimeType || preferred.mimeType || 'audio/webm';
        const ext = preferred.ext;
        const blob = new Blob(chunksRef.current, { type: actualMime });
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        const file = new File([blob], `voice-memo-${Date.now()}.${ext}`, { type: actualMime });
        onRecordComplete(file, duration);
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        setRecordingDuration(0);
      };

      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      recorder.start();
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        setRecordingDuration(elapsed);
        if (elapsed >= 300) {
          recorder.stop();
          clearInterval(timerRef.current);
        }
      }, 1000);
    } catch {
      // Permission denied
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
    }
  };

  return { isRecording, recordingDuration, startRecording, stopRecording };
}
