import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Phone, MessageCircle, CheckCircle, XCircle, Clock, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStreak } from '@/hooks/useStreak';

interface CallResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactType: 'call' | 'whatsapp';
  prospectName: string;
  onSubmit: (result: { outcome: string; notes?: string }) => void;
}

const CALL_OUTCOMES = [
  { id: 'answered', label: 'Answered', icon: CheckCircle, color: 'text-green-500' },
  { id: 'not_picked', label: 'Not Picked', icon: PhoneOff, color: 'text-gray-500' },
  { id: 'busy', label: 'Busy', icon: Clock, color: 'text-yellow-500' },
  { id: 'call_back', label: 'Call Back Later', icon: Phone, color: 'text-blue-500' },
  { id: 'not_interested', label: 'Not Interested', icon: XCircle, color: 'text-red-500' },
];

const WHATSAPP_OUTCOMES = [
  { id: 'replied', label: 'Replied', icon: CheckCircle, color: 'text-green-500' },
  { id: 'seen', label: 'Seen (No Reply)', icon: Clock, color: 'text-yellow-500' },
  { id: 'sent', label: 'Message Sent', icon: MessageCircle, color: 'text-blue-500' },
  { id: 'not_interested', label: 'Not Interested', icon: XCircle, color: 'text-red-500' },
];

export function CallResultModal({ 
  open, 
  onOpenChange, 
  contactType, 
  prospectName,
  onSubmit 
}: CallResultModalProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { recordActivity } = useStreak();

  const outcomes = contactType === 'call' ? CALL_OUTCOMES : WHATSAPP_OUTCOMES;

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedOutcome(null);
      setNotes('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedOutcome) return;
    
    setIsSubmitting(true);
    await onSubmit({ outcome: selectedOutcome, notes: notes.trim() || undefined });
    // Record streak activity for call (fire-and-forget)
    recordActivity('call');
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {contactType === 'call' ? (
              <Phone className="h-5 w-5 text-accent" />
            ) : (
              <MessageCircle className="h-5 w-5 text-green-500" />
            )}
            {contactType === 'call' ? 'Call' : 'WhatsApp'} Result
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            How did it go with <span className="font-medium text-foreground">{prospectName}</span>?
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Outcome buttons */}
          <div className="grid grid-cols-2 gap-2">
            {outcomes.map((outcome) => {
              const Icon = outcome.icon;
              const isSelected = selectedOutcome === outcome.id;
              
              return (
                <button
                  key={outcome.id}
                  onClick={() => setSelectedOutcome(outcome.id)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left",
                    isSelected 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <Icon className={cn("h-5 w-5", outcome.color)} />
                  <span className="text-sm font-medium">{outcome.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick notes */}
          {selectedOutcome && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="text-sm font-medium text-muted-foreground">
                Quick notes (optional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about the conversation..."
                className="min-h-[80px] resize-none"
                maxLength={500}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="ghost" onClick={handleSkip}>
            Skip
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedOutcome || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Result'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}