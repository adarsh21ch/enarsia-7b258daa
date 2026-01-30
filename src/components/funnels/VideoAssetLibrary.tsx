import React from 'react';
import { FileVideo, Trash2, Clock, HardDrive, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useVideoAssets, useDeleteVideoAsset } from '@/hooks/useVideoAssets';
import { VideoAsset, formatFileSize, formatDuration } from '@/types/video-assets';
import { cn } from '@/lib/utils';

interface VideoAssetLibraryProps {
  onSelect?: (asset: VideoAsset) => void;
  selectedAssetId?: string;
  className?: string;
}

export function VideoAssetLibrary({ onSelect, selectedAssetId, className }: VideoAssetLibraryProps) {
  const { data: assets, isLoading, error } = useVideoAssets();
  const deleteAsset = useDeleteVideoAsset();

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-muted-foreground">Failed to load videos</p>
      </div>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
        <FileVideo className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-lg font-medium">No videos yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Upload your first video to get started
        </p>
      </div>
    );
  }

  const readyAssets = assets.filter(a => a.status === 'ready');
  const processingAssets = assets.filter(a => a.status === 'processing');

  return (
    <div className={cn("space-y-4", className)}>
      {processingAssets.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">Processing</p>
          {processingAssets.map((asset) => (
            <Card key={asset.id} className="bg-muted/50 border-dashed">
              <CardContent className="p-4 flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{asset.title}</p>
                  <p className="text-xs text-muted-foreground">Processing...</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-3">
        {readyAssets.map((asset) => (
          <Card
            key={asset.id}
            className={cn(
              "cursor-pointer transition-all hover:ring-2 hover:ring-primary/50",
              selectedAssetId === asset.id && "ring-2 ring-primary"
            )}
            onClick={() => onSelect?.(asset)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-16 w-24 bg-muted rounded flex items-center justify-center shrink-0">
                <FileVideo className="h-8 w-8 text-muted-foreground" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{asset.title}</p>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  {asset.duration_seconds && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(asset.duration_seconds)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-3.5 w-3.5" />
                    {formatFileSize(asset.file_size_bytes)}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteAsset.mutate(asset.id);
                }}
                disabled={deleteAsset.isPending}
              >
                {deleteAsset.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
