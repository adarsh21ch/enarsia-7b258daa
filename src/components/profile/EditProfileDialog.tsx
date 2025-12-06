import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, User, Phone, Building2, MapPin, FileText } from 'lucide-react';
import { Profile, ProfileUpdate } from '@/hooks/useProfile';
import { validateProfile } from '@/lib/profileValidations';
import { useToast } from '@/hooks/use-toast';

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  onSave: (updates: ProfileUpdate) => Promise<{ error: any }>;
  updating: boolean;
}

export function EditProfileDialog({ 
  open, 
  onOpenChange, 
  profile, 
  onSave,
  updating 
}: EditProfileDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ProfileUpdate>({
    display_name: '',
    phone: '',
    company_name: '',
    city: '',
    bio: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        phone: profile.phone || '',
        company_name: profile.company_name || '',
        city: profile.city || '',
        bio: profile.bio || '',
      });
      setErrors({});
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validation = validateProfile(formData);
    
    if ('errors' in validation) {
      setErrors(validation.errors);
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      });
      return;
    }
    
    setErrors({});
    const { error } = await onSave(validation.data as ProfileUpdate);
    if (!error) {
      onOpenChange(false);
    }
  };

  const handleFieldChange = (field: keyof ProfileUpdate, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md mx-4 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Profile</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="display_name" className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-muted-foreground" />
              Display Name
            </Label>
            <Input
              id="display_name"
              value={formData.display_name || ''}
              onChange={(e) => handleFieldChange('display_name', e.target.value)}
              placeholder="Your name"
              className={`h-11 rounded-xl ${errors.display_name ? 'border-destructive' : ''}`}
              maxLength={100}
            />
            {errors.display_name && (
              <p className="text-xs text-destructive">{errors.display_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              placeholder="+91 98765 43210"
              className={`h-11 rounded-xl ${errors.phone ? 'border-destructive' : ''}`}
              maxLength={20}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_name" className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Company / Business Name
            </Label>
            <Input
              id="company_name"
              value={formData.company_name || ''}
              onChange={(e) => handleFieldChange('company_name', e.target.value)}
              placeholder="Your business name"
              className={`h-11 rounded-xl ${errors.company_name ? 'border-destructive' : ''}`}
              maxLength={100}
            />
            {errors.company_name && (
              <p className="text-xs text-destructive">{errors.company_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="city" className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              City / Location
            </Label>
            <Input
              id="city"
              value={formData.city || ''}
              onChange={(e) => handleFieldChange('city', e.target.value)}
              placeholder="Mumbai, India"
              className={`h-11 rounded-xl ${errors.city ? 'border-destructive' : ''}`}
              maxLength={100}
            />
            {errors.city && (
              <p className="text-xs text-destructive">{errors.city}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Bio
            </Label>
            <Textarea
              id="bio"
              value={formData.bio || ''}
              onChange={(e) => handleFieldChange('bio', e.target.value)}
              placeholder="Tell us about yourself..."
              className={`rounded-xl min-h-[80px] resize-none ${errors.bio ? 'border-destructive' : ''}`}
              maxLength={500}
            />
            {errors.bio && (
              <p className="text-xs text-destructive">{errors.bio}</p>
            )}
            <p className="text-xs text-muted-foreground text-right">
              {(formData.bio || '').length}/500
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 rounded-xl"
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 rounded-xl"
              disabled={updating}
            >
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
