import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Trash2, Mic, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NoteAttachment } from '@/hooks/useNoteAttachments';

interface AudioRecorderProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  attachments: NoteAttachment[];
  onDelete: (att: NoteAttachment) => void;
}

function AudioPlayer({ url, fileName }: { url: string; fileName?: string | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setProgress(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration);
    const onEnded = () => { setPlaying(false); setProgress(0); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
    setPlaying(!playing);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
      <audio ref={audioRef} src={url} preload="metadata" />
      <button onClick={toggle} className="shrink-0">
        {playing ? <Pause className="h-4 w-4 text-primary" /> : <Play className="h-4 w-4 text-primary" />}
      </button>
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
        {formatTime(duration || 0)}
      </span>
    </div>
  );
}

export function AudioRecorder({ isRecording, onStartRecording, onStopRecording, attachments, onDelete }: AudioRecorderProps) {
  const audioAttachments = attachments.filter(a => a.type === 'audio');

  return (
    <div className="space-y-2">
      {audioAttachments.map(att => (
        <div key={att.id} className="relative group">
          <AudioPlayer url={att.publicUrl || ''} fileName={att.file_name} />
          <button
            onClick={() => onDelete(att)}
            className="absolute -top-1 -right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
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
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        const file = new File([blob], `voice-memo-${Date.now()}.webm`, { type: 'audio/webm' });
        onRecordComplete(file, duration);
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        setRecordingDuration(0);
      };

      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      recorder.start();
      setIsRecording(true);

      // Timer
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        setRecordingDuration(elapsed);
        // Auto-stop at 5 minutes
        if (elapsed >= 300) {
          recorder.stop();
          clearInterval(timerRef.current);
        }
      }, 1000);
    } catch {
      // Permission denied or no mic
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
