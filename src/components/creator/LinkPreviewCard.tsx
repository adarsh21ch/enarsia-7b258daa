import { ExternalLink, Instagram, Youtube, Link2 } from 'lucide-react';
import { useOEmbed } from '@/hooks/useOEmbed';
import { cn } from '@/lib/utils';

interface Props {
  url: string;
  className?: string;
}

export function LinkPreviewCard({ url, className }: Props) {
  const { data, isLoading } = useOEmbed(url);
  const kind = data?.kind ?? (/youtube/i.test(url) ? 'youtube' : /instagram/i.test(url) ? 'instagram' : 'unknown');
  const open = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const Icon = kind === 'youtube' ? Youtube : kind === 'instagram' ? Instagram : Link2;
  const sourceLabel = kind === 'youtube' ? 'YouTube' : kind === 'instagram' ? 'Instagram' : data?.domain || 'Link';

  // Fallback bare link
  if (!isLoading && !data) {
    return (
      <button
        onClick={open}
        className={cn(
          'flex items-center gap-1.5 text-xs text-primary underline-offset-2 hover:underline truncate',
          className,
        )}
      >
        <ExternalLink className="h-3 w-3 shrink-0" />
        <span className="truncate">{url}</span>
      </button>
    );
  }

  const hasThumb = !!data?.thumbnailUrl;

  return (
    <button
      onClick={open}
      className={cn(
        'group w-full text-left rounded-xl border border-border/60 bg-muted/30 overflow-hidden transition-colors hover:bg-muted/50',
        className,
      )}
    >
      {hasThumb ? (
        <div className="relative w-full aspect-video bg-muted overflow-hidden">
          <img
            src={data!.thumbnailUrl}
            alt={data?.title || sourceLabel}
            loading="lazy"
            className="w-full h-full object-cover"
          />
          <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-background/90 backdrop-blur text-[10px] font-semibold">
            <Icon className={cn('h-3 w-3', kind === 'youtube' && 'text-red-500', kind === 'instagram' && 'text-pink-500')} />
            {sourceLabel}
          </span>
        </div>
      ) : null}
      <div className="px-2.5 py-2 flex items-center gap-2">
        {!hasThumb && (
          <span className={cn(
            'shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-lg',
            kind === 'youtube' && 'bg-red-500/10 text-red-500',
            kind === 'instagram' && 'bg-pink-500/10 text-pink-500',
            kind === 'unknown' && 'bg-muted text-muted-foreground',
          )}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate">
            {isLoading ? 'Loading preview…' : data?.title || data?.domain || url}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {data?.authorName ? `${data.authorName} • ${sourceLabel}` : sourceLabel}
          </p>
        </div>
        <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
      </div>
    </button>
  );
}
