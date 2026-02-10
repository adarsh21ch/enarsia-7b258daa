import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, AlertTriangle } from 'lucide-react';
import { Prospect } from '@/types/prospect';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLifetimeLeadLimit } from '@/hooks/useLifetimeLeadLimit';
import { HardLimitModal } from '@/components/subscription/HardLimitModal';
import { cn } from '@/lib/utils';

interface AddProspectDialogProps {
  onAdd: (prospect: Partial<Prospect>) => Promise<Prospect | null>;
  existingProspects?: Prospect[];
}

// Normalize phone number for comparison (remove spaces, dashes, parentheses)
const normalizePhone = (phone: string) => phone.replace(/[\s\-\(\)\.]/g, '');

export function AddProspectDialog({ onAdd, existingProspects = [] }: AddProspectDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [showLimitModal, setShowLimitModal] = useState(false);
  const isMobile = useIsMobile();
  const { isAtLimit, canAddLead, incrementLeadCount, isPaid } = useLifetimeLeadLimit();

  // Check for duplicate phone number
  const duplicateProspect = useMemo(() => {
    if (!phone.trim() || phone.trim().length < 7) return null;
    const normalized = normalizePhone(phone.trim());
    return existingProspects.find(p => 
      normalizePhone(p.phone) === normalized || 
      normalizePhone(p.phone).endsWith(normalized) ||
      normalized.endsWith(normalizePhone(p.phone))
    );
  }, [phone, existingProspects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Check lead limit before submitting
    if (!canAddLead) {
      setShowLimitModal(true);
      return;
    }

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    // Simple validation
    const fieldErrors: { name?: string; phone?: string } = {};
    if (!trimmedName) {
      fieldErrors.name = 'Name is required';
    }
    if (!trimmedPhone || trimmedPhone.length < 7) {
      fieldErrors.phone = 'Valid phone number is required (min 7 digits)';
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    const prospectResult = await onAdd({
      name: trimmedName,
      phone: trimmedPhone,
    });

    if (prospectResult) {
      // Increment lifetime lead counter on successful add
      await incrementLeadCount(1);
      setName('');
      setPhone('');
      setErrors({});
      setOpen(false);
    }
    setIsSubmitting(false);
  };

  // Handle dialog open - check limit first
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && isAtLimit) {
      setShowLimitModal(true);
      return;
    }
    setOpen(isOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button data-add-trigger size="sm" className="h-8 gap-1 text-xs px-2">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>Enter the name and phone number of your new lead.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter name"
                maxLength={100}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                maxLength={20}
                className={cn(
                  errors.phone ? 'border-destructive' : '',
                  duplicateProspect ? 'border-yellow-500 focus-visible:ring-yellow-500' : ''
                )}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone}</p>
              )}
              {/* Duplicate warning */}
              {duplicateProspect && !errors.phone && (
                <div className="flex items-start gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium text-yellow-600">Lead already exists!</p>
                    <p className="text-muted-foreground">
                      <span className="font-medium">{duplicateProspect.name}</span>
                      {duplicateProspect.action_taken && (
                        <span> • Response: <span className="font-medium">{duplicateProspect.action_taken}</span></span>
                      )}
                      {duplicateProspect.funnel_stage && (
                        <span> • Stage: <span className="font-medium">{duplicateProspect.funnel_stage}</span></span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                variant={duplicateProspect ? 'outline' : 'default'}
              >
                {isSubmitting ? 'Adding...' : duplicateProspect ? 'Add Anyway' : 'Add Lead'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Hard Limit Modal - shown when user hits the limit */}
      <HardLimitModal 
        forceOpen={showLimitModal} 
        onClose={() => setShowLimitModal(false)} 
      />
    </>
  );
}