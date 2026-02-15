import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, MessageCircle, Code } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string;
  formTitle: string;
}

export function ShareFormDialog({ open, onOpenChange, shareUrl, formTitle }: Props) {
  const [showEmbed, setShowEmbed] = useState(false);
  const embedCode = `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0" style="border:none;max-width:640px;margin:0 auto;display:block;"></iframe>`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied!');
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Fill out this form: ${formTitle}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    toast.success('Embed code copied!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Form</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input value={shareUrl} readOnly className="text-sm" />
            <Button variant="outline" size="icon" onClick={copyLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={shareWhatsApp} className="flex-1">
              <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
            </Button>
            <Button variant="outline" onClick={() => setShowEmbed(!showEmbed)} className="flex-1">
              <Code className="h-4 w-4 mr-2" /> Embed
            </Button>
          </div>

          {showEmbed && (
            <div className="space-y-2">
              <textarea
                value={embedCode}
                readOnly
                rows={3}
                className="w-full text-xs font-mono p-2 rounded-md border border-input bg-muted"
              />
              <Button variant="outline" size="sm" onClick={copyEmbed} className="w-full">
                <Copy className="h-3 w-3 mr-1" /> Copy Embed Code
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
