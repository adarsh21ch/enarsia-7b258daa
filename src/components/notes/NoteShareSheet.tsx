import { Copy, FileText, Image, FileDown, MessageCircle, Users, X, Check } from 'lucide-react';
import { useState } from 'react';
import { NoteBlock } from '@/hooks/useNotes';
import { toast } from 'sonner';

interface NoteShareSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  blocks: NoteBlock[];
  updatedAt: string;
}

function blocksToPlainText(title: string, blocks: NoteBlock[], updatedAt: string): string {
  const lines: string[] = [];
  if (title) lines.push(title, '');
  
  for (const block of blocks) {
    if (block.type === 'heading') {
      lines.push(`## ${block.content}`);
    } else if (block.type === 'checklist') {
      lines.push(`${block.checked ? '☑' : '☐'} ${block.content}`);
    } else if (block.content.startsWith('• ')) {
      lines.push(block.content);
    } else {
      lines.push(block.content);
    }
  }

  lines.push('', `— Enarsia Notes • ${new Date(updatedAt).toLocaleDateString()}`);
  return lines.join('\n');
}

export function NoteShareSheet({ open, onClose, title, blocks, updatedAt }: NoteShareSheetProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const plainText = blocksToPlainText(title, blocks, updatedAt);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleExportText = () => {
    const blob = new Blob([plainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'Untitled Note').replace(/[^a-zA-Z0-9 ]/g, '')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Text file downloaded');
    onClose();
  };

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(plainText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
    onClose();
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: title || 'Enarsia Note', text: plainText });
        onClose();
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  const options = [
    { icon: copied ? Check : Copy, label: copied ? 'Copied!' : 'Copy to Clipboard', action: handleCopy, accent: copied },
    { icon: FileText, label: 'Export as Text (.txt)', action: handleExportText },
    { icon: MessageCircle, label: 'Share via WhatsApp', action: handleWhatsApp, green: true },
    { icon: FileDown, label: 'Share via Device', action: handleNativeShare },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="w-10 h-1 bg-muted-foreground/20 rounded-full mx-auto mt-3" />
        <div className="px-4 pt-4 pb-1">
          <h3 className="text-sm font-semibold">Share Note</h3>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">{title || 'Untitled Note'}</p>
        </div>
        <div className="p-3 space-y-0.5">
          {options.map(({ icon: Icon, label, action, accent, green }) => (
            <button
              key={label}
              onClick={action}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-muted/50 active:bg-muted text-sm font-medium flex items-center gap-3 transition-colors active:scale-[0.98]"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                accent ? 'bg-green-500/10' : green ? 'bg-green-500/10' : 'bg-accent/10'
              }`}>
                <Icon className={`h-4 w-4 ${
                  accent ? 'text-green-500' : green ? 'text-green-500' : 'text-accent'
                }`} />
              </div>
              {label}
            </button>
          ))}
        </div>
        <div className="px-3 pb-3">
          <button
            onClick={onClose}
            className="w-full text-center py-3 rounded-xl text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            Cancel
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </>
  );
}
