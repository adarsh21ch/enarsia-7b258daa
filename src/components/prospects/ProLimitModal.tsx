import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { useRazorpay } from '@/hooks/useRazorpay';

interface ProLimitModalProps {
  open: boolean;
  onClose: () => void;
  currentCount?: number;
}

export function ProLimitModal({ open, onClose, currentCount }: ProLimitModalProps) {
  const { initiatePayment, loading } = useRazorpay();

  const handleUnlockPro = () => {
    initiatePayment({
      planType: 'monthly',
      onSuccess: () => {
        onClose();
      },
    });
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
              <>You've reached the free limit of 50 prospects ({currentCount}/50). Upgrade to Pro to add more.</>
            ) : (
              <>Subscribe starting at ₹249/month to unlock unlimited prospects and all premium features.</>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-4">
          <Button onClick={handleUnlockPro} className="w-full" disabled={loading}>
            {loading ? 'Processing...' : 'Unlock Pro – Starting ₹249'}
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
