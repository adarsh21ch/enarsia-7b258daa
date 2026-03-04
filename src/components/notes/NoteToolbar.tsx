import { Bold, Italic, List, CheckSquare, Heading, Image, Mic, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { NoteBlock } from '@/hooks/useNotes';

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
  onTakePhoto: () => void;
  onAudioRecord: () => void;
  currentColor: string;
  isRecording?: boolean;
  activeBlock?: NoteBlock | null;
}

export function NoteToolbar({ onAction, onColorChange, onPhotoAttach, onTakePhoto, onAudioRecord, currentColor, isRecording, activeBlock }: NoteToolbarProps) {
  const [showColors, setShowColors] = useState(false);
  const [showImageSheet, setShowImageSheet] = useState(false);

  const tools = [
    { icon: Heading, action: 'heading', label: 'Heading', isActive: activeBlock?.type === 'heading' },
    { icon: Bold, action: 'bold', label: 'Bold', isActive: activeBlock?.style === 'bold' },
    { icon: Italic, action: 'italic', label: 'Italic', isActive: activeBlock?.style === 'italic' },
    { icon: List, action: 'list', label: 'List', isActive: activeBlock?.content?.startsWith('• ') },
    { icon: CheckSquare, action: 'checklist', label: 'Checklist', isActive: activeBlock?.type === 'checklist' },
  ];

  return (
    <>
      <div className="flex items-center justify-center gap-1 px-3 py-2.5 mx-3 mb-3 bg-card/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-[0_-2px_20px_-4px_rgba(0,0,0,0.08)]">
        {tools.map(({ icon: Icon, action, label, isActive }) => (
          <button
            key={action}
            onClick={() => onAction(action)}
            className={cn(
              "p-2.5 rounded-xl transition-all active:scale-90",
              isActive
                ? "bg-accent/15 text-accent"
                : "hover:bg-muted/60 active:bg-muted text-muted-foreground"
            )}
            title={label}
          >
            <Icon className="h-[18px] w-[18px]" />
          </button>
        ))}

        <div className="w-px h-5 bg-border/40 mx-0.5" />

        <button
          onClick={() => setShowImageSheet(true)}
          className="p-2.5 rounded-xl hover:bg-muted/60 active:bg-muted active:scale-90 transition-all"
          title="Attach photo"
        >
          <Image className="h-[18px] w-[18px] text-muted-foreground" />
        </button>

        <button
          onClick={onAudioRecord}
          className={cn(
            "p-2.5 rounded-xl transition-all active:scale-90",
            isRecording ? "bg-destructive/10" : "hover:bg-muted/60 active:bg-muted"
          )}
          title={isRecording ? 'Stop recording' : 'Record audio'}
        >
          <Mic className={cn("h-[18px] w-[18px]", isRecording ? "text-destructive animate-pulse" : "text-muted-foreground")} />
        </button>

        <div className="w-px h-5 bg-border/40 mx-0.5" />

        <div className="relative">
          <button
            onClick={() => setShowColors(!showColors)}
            className="p-2.5 rounded-xl hover:bg-muted/60 active:bg-muted active:scale-90 transition-all"
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

      {/* Image picker bottom sheet */}
      {showImageSheet && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowImageSheet(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="w-10 h-1 bg-muted-foreground/20 rounded-full mx-auto mt-3" />
            <div className="p-4 space-y-1">
              <button
                onClick={() => { setShowImageSheet(false); onTakePhoto(); }}
                className="w-full text-left px-4 py-3.5 rounded-xl hover:bg-muted/50 active:bg-muted text-sm font-medium flex items-center gap-3 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                  <Image className="h-4 w-4 text-accent" />
                </div>
                Take Photo
              </button>
              <button
                onClick={() => { setShowImageSheet(false); onPhotoAttach(); }}
                className="w-full text-left px-4 py-3.5 rounded-xl hover:bg-muted/50 active:bg-muted text-sm font-medium flex items-center gap-3 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                  <Image className="h-4 w-4 text-accent" />
                </div>
                Choose from Gallery
              </button>
              <div className="pt-1">
                <button
                  onClick={() => setShowImageSheet(false)}
                  className="w-full text-center py-3 rounded-xl text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
            <div className="h-[env(safe-area-inset-bottom)]" />
          </div>
        </>
      )}
    </>
  );
}
