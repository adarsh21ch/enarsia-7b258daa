import { useQuery } from '@tanstack/react-query';

export type OEmbedKind = 'youtube' | 'instagram' | 'unknown';

export interface OEmbedData {
  kind: OEmbedKind;
  url: string;
  title?: string;
  thumbnailUrl?: string;
  authorName?: string;
  domain: string;
}

function detectKind(url: string): OEmbedKind {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/instagram\.com/i.test(url)) return 'instagram';
  return 'unknown';
}

function safeDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

async function fetchYouTubeOEmbed(url: string): Promise<Partial<OEmbedData>> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: ctrl.signal },
    );
    if (!res.ok) throw new Error('oembed failed');
    const data = await res.json();
    return {
      title: data.title,
      thumbnailUrl: data.thumbnail_url,
      authorName: data.author_name,
    };
  } finally {
    clearTimeout(t);
  }
}

export function useOEmbed(url?: string | null) {
  const enabled = !!url && /^https?:\/\//i.test(url);
  return useQuery<OEmbedData>({
    queryKey: ['oembed', url],
    enabled,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24,
    retry: false,
    queryFn: async () => {
      const u = url as string;
      const kind = detectKind(u);
      const base: OEmbedData = { kind, url: u, domain: safeDomain(u) };
      if (kind === 'youtube') {
        try {
          const extra = await fetchYouTubeOEmbed(u);
          return { ...base, ...extra };
        } catch {
          return base;
        }
      }
      if (kind === 'instagram') {
        // TODO: wire Instagram oEmbed token (graph.facebook.com/v18.0/instagram_oembed)
        const match = u.match(/instagram\.com\/(p|reel|tv)\//i);
        const title = match
          ? match[1].toLowerCase() === 'reel'
            ? 'Instagram Reel'
            : match[1].toLowerCase() === 'tv'
            ? 'Instagram Video'
            : 'Instagram Post'
          : 'Instagram';
        return { ...base, title };
      }
      return base;
    },
  });
}
