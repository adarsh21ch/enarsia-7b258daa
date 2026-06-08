import { Funnel, getFunnelPublicUrl } from '@/types/funnels';
import { formatDuration } from '@/types/video-assets';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MoreHorizontal, 
  Settings2, 

  Eye, 
  Copy, 
  Trash2, 
  Globe, 
  GlobeLock,
  BarChart3,
  Users
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface FunnelCardProps {
  funnel: Funnel;
  onEdit: (funnel: Funnel) => void;
  onPreview: (funnel: Funnel) => void;
  onAnalytics: (funnel: Funnel) => void;
  onDelete: (funnel: Funnel) => void;
  onTogglePublish: (funnel: Funnel) => void;
}

export function FunnelCard({ 
  funnel, 
  onEdit, 
  onPreview, 
  onAnalytics,
  onDelete,
  onTogglePublish 
}: FunnelCardProps) {
  const copyLink = () => {
    const url = getFunnelPublicUrl(funnel.slug);
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-video bg-muted relative">
        {funnel.thumbnail_url ? (
          <img 
            src={funnel.thumbnail_url} 
            alt={funnel.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <span className="text-4xl">🎬</span>
          </div>
        )}
        
        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <Badge variant={funnel.is_published ? 'default' : 'secondary'}>
            {funnel.is_published ? (
              <><Globe className="w-3 h-3 mr-1" /> Live</>
            ) : (
              <><GlobeLock className="w-3 h-3 mr-1" /> Draft</>
            )}
          </Badge>
        </div>

        {/* Duration badge if available */}
        {funnel.video_asset?.duration_seconds && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
              {formatDuration(funnel.video_asset.duration_seconds)}
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{funnel.title}</h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span>{funnel.leads_count || 0} leads</span>
              {funnel.price > 0 && (
                <>
                  <span>•</span>
                  <span>₹{funnel.price}</span>
                </>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(funnel)}>
                <Settings2 className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPreview(funnel)}>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAnalytics(funnel)}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyLink}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onTogglePublish(funnel)}>
                {funnel.is_published ? (
                  <><GlobeLock className="w-4 h-4 mr-2" /> Unpublish</>
                ) : (
                  <><Globe className="w-4 h-4 mr-2" /> Publish</>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(funnel)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex gap-2 mt-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onEdit(funnel)}
          >
            <Settings2 className="w-3.5 h-3.5 mr-1" />
            Edit
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            className="flex-1"
            onClick={() => onPreview(funnel)}
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
