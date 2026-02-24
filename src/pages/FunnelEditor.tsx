import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFunnel, useCreateFunnel, useUpdateFunnel, useCheckSlug } from '@/hooks/useFunnels';
import { generateSlug, CreateFunnelInput } from '@/types/funnels';
import { VideoAssetSelector } from '@/components/funnels/VideoAssetSelector';
import { PriceOptionsManager } from '@/components/funnels/PriceOptionsManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Save, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useFunnelFeatureAccess } from '@/hooks/useFunnelFeatureAccess';
import { FunnelsProBadge } from '@/components/funnels/FunnelsProBadge';
import { FunnelsUpgradeDrawer } from '@/components/funnels/FunnelsUpgradeDrawer';

export default function FunnelEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const isEditing = !!id;

  const { data: existingFunnel, isLoading: loadingFunnel } = useFunnel(id);
  const createFunnel = useCreateFunnel();
  const updateFunnel = useUpdateFunnel();
  const checkSlug = useCheckSlug();

  const priceOptionsAccess = useFunnelFeatureAccess('funnel_price_options');
  const videoUploadAccess = useFunnelFeatureAccess('funnel_video_upload');

  const [formData, setFormData] = useState<CreateFunnelInput>({
    title: '',
    slug: '',
    description: '',
    video_asset_id: undefined,
    thumbnail_url: '',
    allow_speed_control: false,
    allow_forward_seek: false,
    lock_cta_until_complete: true,
    price: 0,
    payment_type: 'free',
    upi_id: '',
    cta_button_text: 'Get Access Now',
    cta_redirect_url: '',
    success_message: '',
    whatsapp_auto_message_enabled: false,
    whatsapp_auto_message: '',
    is_published: false,
  });

  const [slugError, setSlugError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  // Load existing funnel data
  useEffect(() => {
    if (existingFunnel) {
      setFormData({
        title: existingFunnel.title,
        slug: existingFunnel.slug,
        description: existingFunnel.description || '',
        video_asset_id: existingFunnel.video_asset_id || undefined,
        thumbnail_url: existingFunnel.thumbnail_url || '',
        allow_speed_control: existingFunnel.allow_speed_control,
        allow_forward_seek: existingFunnel.allow_forward_seek,
        lock_cta_until_complete: existingFunnel.lock_cta_until_complete,
        price: existingFunnel.price,
        payment_type: existingFunnel.payment_type,
        upi_id: existingFunnel.upi_id || '',
        cta_button_text: existingFunnel.cta_button_text,
        cta_redirect_url: existingFunnel.cta_redirect_url || '',
        success_message: existingFunnel.success_message || '',
        whatsapp_auto_message_enabled: existingFunnel.whatsapp_auto_message_enabled,
        whatsapp_auto_message: existingFunnel.whatsapp_auto_message || '',
        is_published: existingFunnel.is_published,
      });
    }
  }, [existingFunnel]);

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: isEditing ? prev.slug : generateSlug(title),
    }));
  };

  const handleSlugChange = async (slug: string) => {
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData((prev) => ({ ...prev, slug: cleanSlug }));

    if (cleanSlug && cleanSlug !== existingFunnel?.slug) {
      const isAvailable = await checkSlug.mutateAsync(cleanSlug);
      if (!isAvailable) {
        setSlugError('This URL is already taken');
      } else {
        setSlugError('');
      }
    } else {
      setSlugError('');
    }
  };

  const handleSubmit = async (publish: boolean) => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!formData.slug.trim()) {
      toast.error('Please enter a URL slug');
      return;
    }

    if (slugError) {
      toast.error('Please fix the slug error');
      return;
    }

    if (!formData.video_asset_id) {
      toast.error('Please select a video');
      return;
    }

    setIsSaving(true);

    try {
      const data = { ...formData, is_published: publish };

      if (isEditing && id) {
        await updateFunnel.mutateAsync({ id, ...data });
      } else {
        await createFunnel.mutateAsync(data);
      }

      navigate('/funnels');
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingFunnel && isEditing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/funnels')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isEditing ? 'Edit Funnel' : 'Create Funnel'}
            </h1>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter funnel title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {window.location.origin}/f/
                  </span>
                  <Input
                    id="slug"
                    placeholder="my-funnel"
                    value={formData.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                  />
                </div>
                {slugError && <p className="text-sm text-destructive">{slugError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of your funnel"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Video Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Video *</CardTitle>
            </CardHeader>
            <CardContent>
              <VideoAssetSelector
                value={formData.video_asset_id}
                onChange={(assetId) =>
                  setFormData((prev) => ({ ...prev, video_asset_id: assetId }))
                }
              />
            </CardContent>
          </Card>

          {/* Player Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Player Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Lock CTA until video completes</Label>
                  <p className="text-sm text-muted-foreground">
                    Users must watch the full video before accessing CTA
                  </p>
                </div>
                <Switch
                  checked={formData.lock_cta_until_complete}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, lock_cta_until_complete: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow speed control</Label>
                  <p className="text-sm text-muted-foreground">
                    Let viewers change playback speed
                  </p>
                </div>
                <Switch
                  checked={formData.allow_speed_control}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, allow_speed_control: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow forward seeking</Label>
                  <p className="text-sm text-muted-foreground">
                    Let viewers skip ahead in the video
                  </p>
                </div>
                <Switch
                  checked={formData.allow_forward_seek}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, allow_forward_seek: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Payment & CTA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Type</Label>
                  <Select
                    value={formData.payment_type}
                    onValueChange={(value: 'free' | 'razorpay' | 'upi_manual') =>
                      setFormData((prev) => ({ ...prev, payment_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="razorpay">Razorpay</SelectItem>
                      <SelectItem value="upi_manual">Manual UPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price (₹)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        price: parseInt(e.target.value) || 0,
                      }))
                    }
                    disabled={formData.payment_type === 'free'}
                  />
                </div>
              </div>

              {formData.payment_type === 'upi_manual' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="upi_id">Default UPI ID</Label>
                    <Input
                      id="upi_id"
                      placeholder="yourname@upi"
                      value={formData.upi_id}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, upi_id: e.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Used as fallback if price options don't have a UPI ID
                    </p>
                  </div>

                  {/* Price Options Manager - gated behind funnel_price_options */}
                  {priceOptionsAccess.canAccess ? (
                    <>
                      {isEditing && id && (
                        <PriceOptionsManager 
                          funnelId={id} 
                          defaultUpiId={formData.upi_id}
                        />
                      )}
                      {!isEditing && (
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                          Save the funnel first, then you can add multiple price options with QR codes.
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="p-4 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Lock className="h-5 w-5 text-amber-600" />
                        <div>
                          <p className="font-medium text-sm">Multiple Price Options</p>
                          <p className="text-xs text-muted-foreground">Upgrade to Funnels Pro to add multiple pricing tiers with QR codes</p>
                        </div>
                      </div>
                      <FunnelsUpgradeDrawer variant="compact" triggerText="Unlock" />
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="cta_button_text">CTA Button Text</Label>
                <Input
                  id="cta_button_text"
                  placeholder="Get Access Now"
                  value={formData.cta_button_text}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, cta_button_text: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cta_redirect_url">Redirect URL (after CTA click)</Label>
                <Input
                  id="cta_redirect_url"
                  type="url"
                  placeholder="https://example.com/thank-you"
                  value={formData.cta_redirect_url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, cta_redirect_url: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="success_message">Success Message</Label>
                <Textarea
                  id="success_message"
                  placeholder="Thank you for your purchase!"
                  value={formData.success_message}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, success_message: e.target.value }))
                  }
                  rows={2}
                />
              </div>

              {/* WhatsApp Auto-Message */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>WhatsApp Auto-Message</Label>
                    <p className="text-sm text-muted-foreground">
                      Send a WhatsApp message automatically after lead submission
                    </p>
                  </div>
                  <Switch
                    checked={formData.whatsapp_auto_message_enabled}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, whatsapp_auto_message_enabled: checked }))
                    }
                  />
                </div>

                {formData.whatsapp_auto_message_enabled && (
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp_auto_message">Message Template</Label>
                    <Textarea
                      id="whatsapp_auto_message"
                      placeholder="Hi {{name}}, thanks for signing up!"
                      value={formData.whatsapp_auto_message}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, whatsapp_auto_message: e.target.value }))
                      }
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use {'{{name}}'} and {'{{phone}}'} as placeholders
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 justify-end pb-8">
            <Button
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Draft
            </Button>
            <Button onClick={() => handleSubmit(true)} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Globe className="w-4 h-4 mr-2" />
              )}
              Save & Publish
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
