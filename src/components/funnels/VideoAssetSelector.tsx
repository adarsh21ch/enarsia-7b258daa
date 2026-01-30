import React, { useState } from 'react';
import { FileVideo, Upload, Check, Clock, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { VideoAssetLibrary } from './VideoAssetLibrary';
import { VideoUploadZone } from './VideoUploadZone';
import { VideoAsset, formatFileSize, formatDuration } from '@/types/video-assets';
import { useVideoAsset } from '@/hooks/useVideoAssets';
import { cn } from '@/lib/utils';

interface VideoAssetSelectorProps {
  value?: string;
  onChange: (assetId: string | undefined) => void;
  className?: string;
}

export function VideoAssetSelector({ value, onChange, className }: VideoAssetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>(value);
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  
  const { data: selectedAsset } = useVideoAsset(value);

  const handleSelect = (asset: VideoAsset) => {
    setSelectedAssetId(asset.id);
  };

  const handleConfirm = () => {
    onChange(selectedAssetId);
    setIsOpen(false);
  };

  const handleUploadComplete = (assetId: string) => {
    setSelectedAssetId(assetId);
    setActiveTab('library');
  };

  const handleRemove = () => {
    onChange(undefined);
    setSelectedAssetId(undefined);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Selected Video Preview */}
      {selectedAsset ? (
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center gap-4">
            <div className="h-20 w-32 bg-muted rounded flex items-center justify-center shrink-0">
              <FileVideo className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{selectedAsset.title}</p>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                {selectedAsset.duration_seconds && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDuration(selectedAsset.duration_seconds)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <HardDrive className="h-3.5 w-3.5" />
                  {formatFileSize(selectedAsset.file_size_bytes)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Check className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-6 text-center bg-muted/20">
          <FileVideo className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mt-2">No video selected</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => setIsOpen(true)}
        >
          <FileVideo className="h-4 w-4 mr-2" />
          {selectedAsset ? 'Change Video' : 'Choose Video'}
        </Button>
        {selectedAsset && (
          <Button
            type="button"
            variant="outline"
            onClick={handleRemove}
          >
            Remove
          </Button>
        )}
      </div>

      {/* Selection Drawer */}
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Select Video</DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-4 overflow-y-auto flex-1">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'library' | 'upload')}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="library">
                  <FileVideo className="h-4 w-4 mr-2" />
                  My Videos
                </TabsTrigger>
                <TabsTrigger value="upload">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload New
                </TabsTrigger>
              </TabsList>

              <TabsContent value="library" className="mt-0">
                <VideoAssetLibrary
                  onSelect={handleSelect}
                  selectedAssetId={selectedAssetId}
                  className="max-h-[50vh] overflow-y-auto"
                />
              </TabsContent>

              <TabsContent value="upload" className="mt-0">
                <VideoUploadZone
                  onUploadComplete={handleUploadComplete}
                  onCancel={() => setActiveTab('library')}
                />
              </TabsContent>
            </Tabs>
          </div>

          <DrawerFooter>
            <Button onClick={handleConfirm} disabled={!selectedAssetId}>
              Confirm Selection
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
