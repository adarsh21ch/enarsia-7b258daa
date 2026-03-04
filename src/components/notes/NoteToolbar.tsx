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
    <div className="flex items-center gap-0.5 px-2 py-1.5 bg-card border-t border-border/50 overflow-x-auto">
      {tools.map(({ icon: Icon, action, label }) => (
        <button
          key={action}
          onClick={() => onAction(action)}
          className="p-2 rounded-lg hover:bg-muted/50 active:bg-muted transition-colors"
          title={label}
        >
          <Icon className="h-4 w-4 text-muted-foreground" />
        </button>
      ))}

      <div className="w-px h-5 bg-border/50 mx-1" />

      <button onClick={onPhotoAttach} className="p-2 rounded-lg hover:bg-muted/50 active:bg-muted transition-colors" title="Attach photo">
        <Image className="h-4 w-4 text-muted-foreground" />
      </button>

      <button
        onClick={onAudioRecord}
        className={cn("p-2 rounded-lg transition-colors", isRecording ? "bg-red-100 dark:bg-red-900/30" : "hover:bg-muted/50 active:bg-muted")}
        title={isRecording ? 'Stop recording' : 'Record audio'}
      >
        <Mic className={cn("h-4 w-4", isRecording ? "text-red-500 animate-pulse" : "text-muted-foreground")} />
      </button>

      <div className="w-px h-5 bg-border/50 mx-1" />

      <div className="relative">
        <button
          onClick={() => setShowColors(!showColors)}
          className="p-2 rounded-lg hover:bg-muted/50 active:bg-muted transition-colors"
          title="Color label"
        >
          <Palette className="h-4 w-4 text-muted-foreground" />
        </button>
        {showColors && (
          <div className="absolute bottom-full left-0 mb-2 flex gap-1.5 bg-card border border-border rounded-lg p-2 shadow-lg z-50">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => { onColorChange(c); setShowColors(false); }}
                className={cn(
                  "w-6 h-6 rounded-full border-2 transition-transform",
                  COLOR_DOT[c],
                  currentColor === c ? "border-foreground scale-110" : "border-transparent"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
