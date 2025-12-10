import { useState, useCallback, useRef } from 'react';

interface ColumnConfig {
  id: string;
  minWidth?: number;
  maxWidth?: number;
}

interface UseResizableColumnsOptions {
  columns: ColumnConfig[];
  initialWidths: Record<string, number>;
  minWidth?: number;
  maxWidth?: number;
}

export function useResizableColumns({
  columns,
  initialWidths,
  minWidth = 50,
  maxWidth = 400,
}: UseResizableColumnsOptions) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(initialWidths);
  const [isResizing, setIsResizing] = useState(false);
  const resizingColumnRef = useRef<string | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  const handleResizeStart = useCallback((columnId: string, clientX: number) => {
    const column = columns.find(c => c.id === columnId);
    if (!column) return;

    resizingColumnRef.current = columnId;
    startXRef.current = clientX;
    startWidthRef.current = columnWidths[columnId] || initialWidths[columnId] || 100;
    setIsResizing(true);
  }, [columns, columnWidths, initialWidths]);

  const handleResizeMove = useCallback((clientX: number) => {
    if (!resizingColumnRef.current) return;

    const columnId = resizingColumnRef.current;
    const column = columns.find(c => c.id === columnId);
    const colMinWidth = column?.minWidth ?? minWidth;
    const colMaxWidth = column?.maxWidth ?? maxWidth;

    const delta = clientX - startXRef.current;
    const newWidth = Math.max(colMinWidth, Math.min(colMaxWidth, startWidthRef.current + delta));

    setColumnWidths(prev => ({
      ...prev,
      [columnId]: newWidth,
    }));
  }, [columns, minWidth, maxWidth]);

  const handleResizeEnd = useCallback(() => {
    resizingColumnRef.current = null;
    setIsResizing(false);
  }, []);

  const getColumnWidth = useCallback((columnId: string): number => {
    return columnWidths[columnId] ?? initialWidths[columnId] ?? 100;
  }, [columnWidths, initialWidths]);

  const resetColumnWidths = useCallback(() => {
    setColumnWidths(initialWidths);
  }, [initialWidths]);

  return {
    columnWidths,
    isResizing,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,
    getColumnWidth,
    resetColumnWidths,
  };
}
