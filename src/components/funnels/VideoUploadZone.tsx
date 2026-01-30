import React, { useCallback, useRef, useState } from 'react';
import { Upload, FileVideo, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import { formatFileSize } from '@/types/video-assets';
import { cn } from '@/lib/utils';

interface VideoUploadZoneProps {
  onUploadComplete: (assetId: string) => void;
  onCancel?: () => void;
  className?: string;
}

export function VideoUploadZone({ onUploadComplete, onCancel, className }: VideoUploadZoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadVideo, isUploading, progress, cancelUpload } = useVideoUpload({
    onSuccess: onUploadComplete,
  });

  const handleFileSelect = useCallback((file: File) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      return;
    }
    
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      return;
    }
    
    setSelectedFile(file);
    setCustomTitle(file.name.replace(/\.[^/.]+$/, ''));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    await uploadVideo(selectedFile, customTitle || undefined);
  }, [selectedFile, customTitle, uploadVideo]);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setCustomTitle('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleCancel = useCallback(() => {
    if (isUploading) {
      cancelUpload();
    }
    handleClear();
    onCancel?.();
  }, [isUploading, cancelUpload, handleClear, onCancel]);

  if (isUploading && progress) {
    return (
      <div className={cn("space-y-4 p-6 border rounded-lg bg-muted/30", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileVideo className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium">{customTitle || selectedFile?.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(progress.loaded)} / {formatFileSize(progress.total)}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Progress value={progress.percentage} className="h-2" />
        <p className="text-sm text-center text-muted-foreground">
          Uploading... {progress.percentage}%
        </p>
      </div>
    );
  }

  if (selectedFile) {
    return (
      <div className={cn("space-y-4 p-6 border rounded-lg bg-muted/30", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileVideo className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="video-title">Video Title</Label>
          <Input
            id="video-title"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="Enter video title"
          />
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleUpload} className="flex-1">
            <Upload className="h-4 w-4 mr-2" />
            Upload Video
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
        className
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={handleInputChange}
        className="hidden"
      />
      
      <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <p className="text-lg font-medium">Drop your video here</p>
      <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
      <p className="text-xs text-muted-foreground mt-4">
        MP4, WebM, or MOV • Max 500MB
      </p>
    </div>
  );
}
