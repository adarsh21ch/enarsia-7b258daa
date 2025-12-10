import { useRef, useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ResizableColumnHeaderProps {
  children: React.ReactNode;
  width: number;
  onResize: (columnId: string, clientX: number) => void;
  onResizeMove: (clientX: number) => void;
  onResizeEnd: () => void;
  columnId: string;
  isResizing: boolean;
  className?: string;
  style?: React.CSSProperties;
  canResize?: boolean;
}

export function ResizableColumnHeader({
  children,
  width,
  onResize,
  onResizeMove,
  onResizeEnd,
  columnId,
  isResizing,
  className,
  style,
  canResize = true,
}: ResizableColumnHeaderProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    onResize(columnId, e.clientX);
  }, [columnId, onResize]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Long press to activate resize on mobile
    longPressTimeout.current = setTimeout(() => {
      const touch = e.touches[0];
      if (touch) {
        setIsDragging(true);
        onResize(columnId, touch.clientX);
      }
    }, 300);
  }, [columnId, onResize]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  }, []);

  // Global mouse/touch move and up handlers
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      onResizeMove(e.clientX);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        onResizeMove(touch.clientX);
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      onResizeEnd();
    };

    const handleGlobalTouchEnd = () => {
      setIsDragging(false);
      onResizeEnd();
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: true });
    document.addEventListener('touchend', handleGlobalTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging, onResizeMove, onResizeEnd]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current);
      }
    };
  }, []);

  return (
    <th
      className={cn("relative select-none", className)}
      style={{ ...style, width: `${width}px`, minWidth: `${width}px` }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {children}
      
      {/* Resize handle - positioned at right edge */}
      {canResize && (
        <div
          className={cn(
            "absolute top-0 right-0 h-full w-1 cursor-col-resize z-30",
            "transition-colors duration-150",
            "hover:bg-primary/50 active:bg-primary/70",
            (isHovering || isDragging) && "bg-border/80",
            isDragging && "bg-primary/50"
          )}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'none' }}
        >
          {/* Visual indicator line */}
          <div 
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
              "w-0.5 h-4 bg-muted-foreground/30 rounded-full",
              "transition-all duration-150",
              (isHovering || isDragging) && "h-6 bg-primary/60"
            )}
          />
        </div>
      )}
    </th>
  );
}
