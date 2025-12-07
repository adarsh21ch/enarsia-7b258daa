import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { Prospect } from '@/types/prospect';
import { useIsMobile } from '@/hooks/use-mobile';
import { ProLimitModal } from './ProLimitModal';

interface AddProspectDialogProps {
  onAdd: (prospect: Partial<Prospect>) => Promise<Prospect | null>;
  isAtLimit?: boolean;
  currentCount?: number;
}

export function AddProspectDialog({ onAdd, isAtLimit = false, currentCount }: AddProspectDialogProps) {
  const [open, setOpen] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const isMobile = useIsMobile();

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && isAtLimit) {
      setShowLimitModal(true);
      return;
    }
    setOpen(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

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
      setName('');
      setPhone('');
      setErrors({});
      setOpen(false);
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            {isMobile ? 'Add' : 'Add Prospect'}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add New Prospect</DialogTitle>
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
                className={errors.phone ? 'border-destructive' : ''}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Prospect'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ProLimitModal 
        open={showLimitModal} 
        onClose={() => setShowLimitModal(false)} 
        currentCount={currentCount}
      />
    </>
  );
}
