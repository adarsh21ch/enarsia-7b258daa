import { Bold, Italic, List, CheckSquare, Heading, Image, Mic, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const COLORS = ['default', 'red', 'orange', 'yellow', 'green', 'blue'];
const COLOR_DOT: Record<string, string> = {
  default: 'bg-muted-foreground/30',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
};

interface NoteToolbarProps {
  onAction: (action: string) => void;
  onColorChange: (color: string) => void;
  onPhotoAttach: () => void;
  onAudioRecord: () => void;
  currentColor: string;
  isRecording?: boolean;
}

export function NoteToolbar({ onAction, onColorChange, onPhotoAttach, onAudioRecord, currentColor, isRecording }: NoteToolbarProps) {
  const [showColors, setShowColors] = useState(false);

  const tools = [
    { icon: Heading, action: 'heading', label: 'Heading' },
    { icon: Bold, action: 'bold', label: 'Bold' },
    { icon: Italic, action: 'italic', label: 'Italic' },
    { icon: List, action: 'list', label: 'List' },
    { icon: CheckSquare, action: 'checklist', label: 'Checklist' },
  ];

  return (
    <div className="flex items-center gap-0.5 px-3 py-2 bg-card/95 backdrop-blur-md border-t border-border/40">
      {tools.map(({ icon: Icon, action, label }) => (
        <button
          key={action}
          onClick={() => onAction(action)}
          className="p-2.5 rounded-xl hover:bg-accent/10 active:bg-accent/20 transition-colors"
          title={label}
        >
          <Icon className="h-[18px] w-[18px] text-muted-foreground" />
        </button>
      ))}

      <div className="w-px h-5 bg-border/40 mx-0.5" />

      <button onClick={onPhotoAttach} className="p-2.5 rounded-xl hover:bg-accent/10 active:bg-accent/20 transition-colors" title="Attach photo">
        <Image className="h-[18px] w-[18px] text-muted-foreground" />
      </button>

      <button
        onClick={onAudioRecord}
        className={cn("p-2.5 rounded-xl transition-colors", isRecording ? "bg-destructive/10" : "hover:bg-accent/10 active:bg-accent/20")}
        title={isRecording ? 'Stop recording' : 'Record audio'}
      >
        <Mic className={cn("h-[18px] w-[18px]", isRecording ? "text-destructive animate-pulse" : "text-muted-foreground")} />
      </button>

      <div className="w-px h-5 bg-border/40 mx-0.5" />

      <div className="relative">
        <button
          onClick={() => setShowColors(!showColors)}
          className="p-2.5 rounded-xl hover:bg-accent/10 active:bg-accent/20 transition-colors"
          title="Color label"
        >
          <Palette className="h-[18px] w-[18px] text-muted-foreground" />
        </button>
        {showColors && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowColors(false)} />
            <div className="absolute bottom-full left-0 mb-2 flex gap-2 bg-card border border-border rounded-2xl p-2.5 shadow-xl z-50">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { onColorChange(c); setShowColors(false); }}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-all",
                    COLOR_DOT[c],
                    currentColor === c ? "border-accent scale-110 shadow-sm" : "border-transparent hover:scale-105"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
