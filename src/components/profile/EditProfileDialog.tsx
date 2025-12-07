import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, User, Phone, Building2, MapPin, FileText, Camera } from 'lucide-react';
import { Profile, ProfileUpdate } from '@/hooks/useProfile';
import { validateProfile } from '@/lib/profileValidations';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<ProfileUpdate>({
    display_name: '',
    phone: '',
    company_name: '',
    city: '',
    bio: '',
    avatar_url: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        phone: profile.phone || '',
        company_name: profile.company_name || '',
        city: profile.city || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
      });
      setAvatarPreview(profile.avatar_url || null);
      setErrors({});
    }
  }, [profile]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPG, PNG, or WEBP image.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      toast({ title: 'Photo uploaded successfully' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Could not upload photo. Please try again.',
        variant: 'destructive',
      });
      setAvatarPreview(profile?.avatar_url || null);
    } finally {
      setUploadingAvatar(false);
    }
  };

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

  const displayName = formData.display_name || profile?.display_name || '';
  const userInitials = displayName ? displayName.slice(0, 2).toUpperCase() : 'U';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md mx-4 rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Profile</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Avatar Upload Section */}
          <div className="flex justify-center">
            <div className="relative">
              <Avatar 
                className="h-24 w-24 cursor-pointer ring-4 ring-primary/20 hover:ring-primary/40 transition-all"
                onClick={handleAvatarClick}
              >
                <AvatarImage src={avatarPreview || undefined} alt="Profile" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-2xl font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground">Tap to change photo</p>

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
              disabled={updating || uploadingAvatar}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 rounded-xl"
              disabled={updating || uploadingAvatar}
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
