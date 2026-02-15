import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, MessageCircle, Check, Link } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string;
  formTitle: string;
}

export function ShareFormDialog({ open, onOpenChange, shareUrl, formTitle }: Props) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Form link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Fill out this form: ${formTitle}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold">Share Form</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Form link */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Link className="h-3.5 w-3.5" /> Form Link
            </label>
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="text-sm bg-blue-50/50 dark:bg-blue-950/20 border-blue-100/50 dark:border-blue-900/30 rounded-xl" />
              <Button
                variant="outline"
                size="icon"
                onClick={copyLink}
                className="shrink-0 rounded-xl border-blue-200/50 dark:border-blue-800/50 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-blue-500" />}
              </Button>
            </div>
          </div>

          {/* Primary actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={copyLink} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
              <Copy className="h-4 w-4 mr-2" /> Copy Link
            </Button>
            <Button onClick={shareWhatsApp} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
              <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
