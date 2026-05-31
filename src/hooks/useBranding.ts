import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  BRAND_NAME,
  BRAND_SHORT_NAME,
  BRAND_TAGLINE,
} from '@/config/brand';
import staticLogo from '@/assets/nevorai-call-logo.png';

export interface Branding {
  appName: string;
  shortName: string;
  tagline: string;
  logoUrl: string;
}

const FALLBACK: Branding = {
  appName: BRAND_NAME,
  shortName: BRAND_SHORT_NAME,
  tagline: BRAND_TAGLINE,
  logoUrl: staticLogo,
};

export function useBranding(): Branding {
  const { data } = useQuery({
    queryKey: ['admin_branding'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_branding')
        .select('app_name, short_name, tagline, logo_url')
        .eq('id', 1)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  if (!data) return FALLBACK;

  return {
    appName: data.app_name || FALLBACK.appName,
    shortName: data.short_name || FALLBACK.shortName,
    tagline: data.tagline || FALLBACK.tagline,
    logoUrl: data.logo_url || FALLBACK.logoUrl,
  };
}
