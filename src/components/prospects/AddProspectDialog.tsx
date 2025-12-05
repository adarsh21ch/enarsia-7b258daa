import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { Prospect } from '@/types/prospect';
import { useIsMobile } from '@/hooks/use-mobile';
import { addProspectSchema } from '@/lib/validations';
import { toast } from 'sonner';

interface AddProspectDialogProps {
  onAdd: (prospect: Partial<Prospect>) => Promise<Prospect | null>;
}

export function AddProspectDialog({ onAdd }: AddProspectDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string }>({});
  const isMobile = useIsMobile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate with zod
    const result = addProspectSchema.safeParse({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || '',
    });

    if (!result.success) {
      const fieldErrors: { name?: string; phone?: string; email?: string } = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as 'name' | 'phone' | 'email';
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    const prospectResult = await onAdd({
      name: result.data.name,
      phone: result.data.phone,
      email: result.data.email,
    });

    if (prospectResult) {
      setName('');
      setPhone('');
      setEmail('');
      setErrors({});
      setOpen(false);
      toast.success('Prospect added successfully');
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email (optional)"
              maxLength={255}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
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
  );
}
