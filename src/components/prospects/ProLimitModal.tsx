import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

interface ProLimitModalProps {
  open: boolean;
  onClose: () => void;
  currentCount?: number;
}

const RAZORPAY_PAYMENT_LINK = 'https://rzp.io/rzp/iQIz9kH';

export function ProLimitModal({ open, onClose, currentCount }: ProLimitModalProps) {
  const handleUnlockPro = () => {
    window.open(RAZORPAY_PAYMENT_LINK, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">Upgrade to unlock this feature</DialogTitle>
          <DialogDescription className="text-center">
            {currentCount !== undefined ? (
              <>You've reached the free limit of 100 prospects ({currentCount}/100). Upgrade to Pro to add more.</>
            ) : (
              <>Subscribe for ₹249 to unlock unlimited prospects and all premium features.</>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-4">
          <Button onClick={handleUnlockPro} className="w-full">
            Unlock Pro – ₹249
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
