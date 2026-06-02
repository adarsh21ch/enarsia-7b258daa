import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, Image as ImageIcon, AlertTriangle } from 'lucide-react';

interface BrandingRow {
  app_name: string;
  short_name: string;
  tagline: string;
  logo_url: string | null;
}

export function BrandingManager() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin_branding_row'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_branding')
        .select('app_name, short_name, tagline, logo_url')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      return data as BrandingRow | null;
    },
  });

  const [appName, setAppName] = useState('');
  const [shortName, setShortName] = useState('');
  const [tagline, setTagline] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setAppName(data.app_name);
    setShortName(data.short_name);
    setTagline(data.tagline);
    setLogoUrl(data.logo_url);
  }, [data]);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Too large', description: 'Logo must be under 5MB', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('branding')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('branding').getPublicUrl(path);
      setLogoUrl(pub.publicUrl);
      toast({ title: 'Logo uploaded', description: 'Click Save to apply across the app.' });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_branding')
        .update({
          app_name: appName.trim(),
          short_name: shortName.trim(),
          tagline: tagline.trim(),
          logo_url: logoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ['admin_branding'] });
      await qc.invalidateQueries({ queryKey: ['admin_branding_row'] });
      toast({ title: 'Branding updated', description: 'Changes are live across the app.' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-1">App Logo</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Used in app headers, login, dashboards, install banners, and OG previews. Square PNG recommended (1024×1024).
          </p>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-2xl border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Current logo" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-7 w-7 text-muted-foreground" />
              )}
            </div>
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
              <div className={`flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 text-sm font-medium text-primary cursor-pointer hover:bg-primary/10 ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? 'Uploading…' : 'Upload new logo'}
              </div>
            </label>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">App Name</h3>
        <div className="space-y-2">
          <Label htmlFor="app-name" className="text-xs">Full app name</Label>
          <Input id="app-name" value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="Enarsia" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="short-name" className="text-xs">Short name (PWA, tabs)</Label>
          <Input id="short-name" value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="Enarsia" maxLength={12} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tagline" className="text-xs">Tagline</Label>
          <Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Your personal CRM for…" />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || uploading} className="min-w-[140px]">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : 'Save Changes'}
        </Button>
      </div>

      <Card className="p-3 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40">
        <div className="flex gap-2 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Some places need a one-time rebuild:</p>
            <ul className="list-disc pl-4 space-y-0.5 opacity-90">
              <li><b>Browser favicon</b> and <b>browser tab title</b> live in <code>index.html</code> — change once via code.</li>
              <li><b>PWA home-screen icon</b> is cached by iOS/Android at install time. Already-installed users keep the old icon until they reinstall.</li>
              <li><b>Legal pages</b> (Terms / Privacy / Refund) body text mention the brand inline — only headers/footers update dynamically.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
