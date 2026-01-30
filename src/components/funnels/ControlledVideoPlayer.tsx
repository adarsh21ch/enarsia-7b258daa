import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { usePlaybackUrl } from '@/hooks/usePlaybackUrl';
import { formatDuration } from '@/types/video-assets';
import { cn } from '@/lib/utils';

interface ControlledVideoPlayerProps {
  assetId: string;
  leadToken?: string;
  allowSeekForward?: boolean;
  allowSpeedControl?: boolean;
  onProgress?: (currentTime: number, duration: number, percentage: number) => void;
  onComplete?: () => void;
  className?: string;
}

export function ControlledVideoPlayer({
  assetId,
  leadToken,
  allowSeekForward = false,
  allowSpeedControl = false,
  onProgress,
  onComplete,
  className,
}: ControlledVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [maxWatchedTime, setMaxWatchedTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  const { getPlaybackUrl, isLoading: isLoadingUrl, error } = usePlaybackUrl();

  // Load video URL
  useEffect(() => {
    const loadUrl = async () => {
      setIsLoading(true);
      const url = await getPlaybackUrl(assetId, leadToken);
      setVideoUrl(url);
      setIsLoading(false);
    };
    
    loadUrl();
  }, [assetId, leadToken, getPlaybackUrl]);

  // Video event handlers
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const time = video.currentTime;
    setCurrentTime(time);
    
    // Track max watched time for seek restriction
    if (time > maxWatchedTime) {
      setMaxWatchedTime(time);
    }

    // Report progress
    if (duration > 0) {
      const percentage = (time / duration) * 100;
      onProgress?.(time, duration, percentage);
    }
  }, [duration, maxWatchedTime, onProgress]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
      setIsLoading(false);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    onComplete?.();
  }, [onComplete]);

  const handleSeeking = useCallback(() => {
    const video = videoRef.current;
    if (!video || allowSeekForward) return;

    // Prevent seeking forward past max watched time
    if (video.currentTime > maxWatchedTime + 1) {
      video.currentTime = maxWatchedTime;
    }
  }, [maxWatchedTime, allowSeekForward]);

  // Control handlers
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const handleSeek = useCallback((value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    let seekTo = value[0];
    
    // Restrict seeking forward if not allowed
    if (!allowSeekForward && seekTo > maxWatchedTime) {
      seekTo = maxWatchedTime;
    }
    
    video.currentTime = seekTo;
    setCurrentTime(seekTo);
  }, [allowSeekForward, maxWatchedTime]);

  const handleSpeedChange = useCallback(() => {
    if (!allowSpeedControl) return;
    
    const video = videoRef.current;
    if (!video) return;

    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const newRate = speeds[nextIndex];
    
    video.playbackRate = newRate;
    setPlaybackRate(newRate);
  }, [allowSpeedControl, playbackRate]);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, []);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  if (isLoadingUrl || isLoading) {
    return (
      <div className={cn("aspect-video bg-black rounded-lg flex items-center justify-center", className)}>
        <Loader2 className="h-12 w-12 animate-spin text-white/50" />
      </div>
    );
  }

  if (error || !videoUrl) {
    return (
      <div className={cn("aspect-video bg-black rounded-lg flex items-center justify-center", className)}>
        <p className="text-white/50">Failed to load video</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative aspect-video bg-black rounded-lg overflow-hidden group", className)}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onSeeking={handleSeeking}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
        playsInline
      />

      {/* Controls Overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Center Play Button */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              size="lg"
              className="h-16 w-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm"
              onClick={togglePlay}
            >
              <Play className="h-8 w-8 text-white ml-1" />
            </Button>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
          {/* Progress Bar */}
          <Slider
            value={[currentTime]}
            max={duration}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={toggleMute}
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>

              <span className="text-white text-sm">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {allowSpeedControl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 text-xs"
                  onClick={handleSpeedChange}
                >
                  {playbackRate}x
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={toggleFullscreen}
              >
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
