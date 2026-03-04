import { ExternalLink, Phone, MessageCircle, Video, FileText } from 'lucide-react';
import { buildWhatsAppLink } from '@/lib/whatsapp';

// Detect URLs in text
const URL_REGEX = /(https?:\/\/[^\s]+)/g;
// Indian phone numbers, international formats
const PHONE_REGEX = /(\+?\d{1,3}[\s-]?\d{4,5}[\s-]?\d{4,5})/g;

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function getLinkType(url: string): 'youtube' | 'zoom' | 'pdf' | 'generic' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('zoom.us') || url.includes('zoom.com')) return 'zoom';
  if (url.endsWith('.pdf')) return 'pdf';
  return 'generic';
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

interface SmartTextProps {
  text: string;
}

export function SmartText({ text }: SmartTextProps) {
  if (!text) return null;

  // Split by URLs and phone numbers
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const allMatches: { index: number; length: number; type: 'url' | 'phone'; value: string }[] = [];

  // Collect URL matches
  let match;
  const urlRegex = new RegExp(URL_REGEX.source, 'g');
  while ((match = urlRegex.exec(text)) !== null) {
    allMatches.push({ index: match.index, length: match[0].length, type: 'url', value: match[0] });
  }

  // Collect phone matches
  const phoneRegex = new RegExp(PHONE_REGEX.source, 'g');
  while ((match = phoneRegex.exec(text)) !== null) {
    // Skip if overlaps with a URL
    const overlaps = allMatches.some(m => m.type === 'url' && match!.index >= m.index && match!.index < m.index + m.length);
    if (!overlaps) {
      allMatches.push({ index: match.index, length: match[0].length, type: 'phone', value: match[0] });
    }
  }

  allMatches.sort((a, b) => a.index - b.index);

  allMatches.forEach((m, i) => {
    if (m.index > lastIndex) {
      parts.push(<span key={`t${i}`}>{text.slice(lastIndex, m.index)}</span>);
    }

    if (m.type === 'url') {
      const linkType = getLinkType(m.value);
      const ytId = getYouTubeId(m.value);

      parts.push(
        <a
          key={`l${i}`}
          href={m.value}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-accent underline underline-offset-2 break-all"
        >
          {linkType === 'youtube' && <Video className="h-3 w-3 inline shrink-0" />}
          {linkType === 'zoom' && <Video className="h-3 w-3 inline shrink-0" />}
          {linkType === 'pdf' && <FileText className="h-3 w-3 inline shrink-0" />}
          {linkType === 'generic' && <ExternalLink className="h-3 w-3 inline shrink-0" />}
          {getDomain(m.value)}
        </a>
      );

      // YouTube thumbnail preview
      if (ytId) {
        parts.push(
          <a key={`yt${i}`} href={m.value} target="_blank" rel="noopener noreferrer" className="block mt-1 mb-1">
            <img
              src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
              alt="YouTube"
              className="rounded-lg max-w-[200px] border border-border/30"
              loading="lazy"
            />
          </a>
        );
      }
    }

    if (m.type === 'phone') {
      const cleaned = m.value.replace(/[\s-]/g, '');
      parts.push(
        <span key={`p${i}`} className="inline-flex items-center gap-1">
          <a href={`tel:${cleaned}`} className="text-accent underline underline-offset-2">
            <Phone className="h-3 w-3 inline mr-0.5" />
            {m.value}
          </a>
          <a
            href={buildWhatsAppLink(cleaned)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-700"
            title="WhatsApp"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </a>
        </span>
      );
    }

    lastIndex = m.index + m.length;
  });

  if (lastIndex < text.length) {
    parts.push(<span key="end">{text.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
}
