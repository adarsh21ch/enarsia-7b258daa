import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProLimitModalProps {
  open: boolean;
  onClose: () => void;
  currentCount?: number;
}

export function ProLimitModal({ open, onClose, currentCount }: ProLimitModalProps) {
  const navigate = useNavigate();

  const handleViewPlans = () => {
    onClose();
    navigate('/profile');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">Unlock Pro Features</DialogTitle>
          <DialogDescription className="text-center">
            {currentCount !== undefined && currentCount >= 50 ? (
              <>You've added {currentCount}+ leads. Upgrade to Pro to unlock team tracking and advanced analytics.</>
            ) : (
              <>Subscribe to Pro Monthly (₹249) or Pro Yearly (₹2,999) to unlock team tracking, TrackUp analytics, and all premium features.</>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-4">
          <Button onClick={handleViewPlans} className="w-full">
            View Pro Plans
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
