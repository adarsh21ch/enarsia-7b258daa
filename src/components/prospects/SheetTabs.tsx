import { useState, useEffect, useRef } from 'react';
import { Sheet } from '@/types/prospect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, MoreVertical, Pencil, Trash2, FileSpreadsheet, CheckSquare, Trash, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ExportDialog } from '@/components/export/ExportDialog';
interface SheetTabsProps {
  sheets: Sheet[];
  selectedSheetId: string | null;
  onSelectSheet: (id: string | null) => void;
  onAddSheet: (name: string) => Promise<Sheet | null>;
  onUpdateSheet: (id: string, name: string) => Promise<Sheet | null>;
  onDeleteSheet: (id: string) => Promise<boolean>;
  onEnterSelectMode?: (sheetId: string | null) => void;
  onDeleteAllInSheet?: (sheetId: string | null) => void;
  onExportSheet?: (sheetId: string | null) => void;
  onExportAll?: () => void;
  onShareLeads?: (sheetId: string | null) => void;
}

export function SheetTabs({
  sheets,
  selectedSheetId,
  onSelectSheet,
  onAddSheet,
  onUpdateSheet,
  onDeleteSheet,
  onEnterSelectMode,
  onDeleteAllInSheet,
  onExportSheet,
  onExportAll,
  onShareLeads
}: SheetTabsProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');
  const [editingSheet, setEditingSheet] = useState<Sheet | null>(null);
  const [deleteAllConfirmSheet, setDeleteAllConfirmSheet] = useState<{id: string | null;name: string;} | null>(null);
  const [exportDialogSheetId, setExportDialogSheetId] = useState<string | null | undefined>(undefined);

  // Refs for auto-scrolling to selected sheet
  const sheetRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected sheet when it changes or on initial mount
  useEffect(() => {
    if (selectedSheetId && sheetRefs.current.has(selectedSheetId)) {
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        const sheetElement = sheetRefs.current.get(selectedSheetId);
        sheetElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedSheetId, sheets]); // Also trigger when sheets load

  const handleAddSheet = async () => {
    if (!newSheetName.trim()) return;
    const sheet = await onAddSheet(newSheetName.trim());
    if (sheet) {
      onSelectSheet(sheet.id);
      setNewSheetName('');
      setIsAddOpen(false);
    }
  };

  const handleEditSheet = async () => {
    if (!editingSheet || !newSheetName.trim()) return;
    await onUpdateSheet(editingSheet.id, newSheetName.trim());
    setNewSheetName('');
    setEditingSheet(null);
    setIsEditOpen(false);
  };

  const handleDeleteSheet = async (sheet: Sheet) => {
    if (confirm(`Delete "${sheet.name}"? Leads will be unassigned from this sheet.`)) {
      await onDeleteSheet(sheet.id);
    }
  };

  const openEditDialog = (sheet: Sheet) => {
    setEditingSheet(sheet);
    setNewSheetName(sheet.name);
    setIsEditOpen(true);
  };

  const handleSelectAndDelete = (sheetId: string | null) => {
    onEnterSelectMode?.(sheetId);
  };

  const handleDeleteAllInSheet = (sheetId: string | null, sheetName: string) => {
    setDeleteAllConfirmSheet({ id: sheetId, name: sheetName });
  };

  const confirmDeleteAll = () => {
    if (deleteAllConfirmSheet) {
      onDeleteAllInSheet?.(deleteAllConfirmSheet.id);
      setDeleteAllConfirmSheet(null);
    }
  };

  // Render menu for "All" tab - NO delete options (All is view-only aggregation)
  const renderAllTabMenu = () =>
  <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
        className={cn(
          "px-1 py-2 text-muted-foreground hover:text-foreground",
          selectedSheetId === null && "text-foreground"
        )}>

          <MoreVertical className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover border-border z-50">
        <DropdownMenuItem onClick={() => onExportSheet?.(null)}>
          <Download className="h-3.5 w-3.5 mr-2" />
          Quick Download (All)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setExportDialogSheetId(null)}>
          <FileSpreadsheet className="h-3.5 w-3.5 mr-2" />
          Custom Export…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>;


  return (
    <>
      <div className="flex items-center bg-muted/30 border-b border-border/40 pb-px">
        {/* Fixed "All" tab with dropdown */}
        <div className="flex items-center border-r border-border/30 shrink-0">
          <button
            onClick={() => onSelectSheet(null)}
            className={cn(
              "px-3 min-h-[36px] text-xs font-medium transition-colors rounded-lg mx-0.5",
              selectedSheetId === null ?
              "bg-primary text-primary-foreground shadow-sm" :
              "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}>

            <FileSpreadsheet className="h-3.5 w-3.5 inline mr-1.5" />
            All
          </button>
          {renderAllTabMenu()}
        </div>

        {/* Scrollable sheet tabs area */}
        {sheets.length > 0 &&
        <ScrollArea className="flex-1 whitespace-nowrap" ref={scrollAreaRef}>
            <div className="flex items-center">
              {sheets.map((sheet) =>
            <div
              key={sheet.id}
              className="flex items-center border-r border-border/30"
              ref={(el) => {
                if (el) sheetRefs.current.set(sheet.id, el);else
                sheetRefs.current.delete(sheet.id);
              }}>

                  <button
                onClick={() => onSelectSheet(sheet.id)}
                className={cn("px-3 min-h-[36px] text-xs font-medium transition-colors rounded-lg mx-0.5",

                selectedSheetId === sheet.id ?
                "bg-primary text-primary-foreground shadow-sm" :
                "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}>

                    {sheet.name}
                    {(sheet as any).is_demo && (
                      <span className="ml-1 inline-flex items-center px-1 py-0 rounded text-[8px] font-semibold bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400 leading-tight">
                        DEMO
                      </span>
                    )}
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                    className={cn(
                      "px-1 py-2 text-muted-foreground hover:text-foreground",
                      selectedSheetId === sheet.id && "text-foreground"
                    )}>

                        <MoreVertical className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border z-50">
                      <DropdownMenuItem onClick={() => openEditDialog(sheet)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExportSheet?.(sheet.id)}>
                        <Download className="h-3.5 w-3.5 mr-2" />
                        Quick Download Sheet
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setExportDialogSheetId(sheet.id)}>
                        <FileSpreadsheet className="h-3.5 w-3.5 mr-2" />
                        Custom Export…
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSelectAndDelete(sheet.id)}>
                        <CheckSquare className="h-3.5 w-3.5 mr-2" />
                        Select & Delete
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                    onClick={() => handleDeleteAllInSheet(sheet.id, sheet.name)}
                    className="text-destructive focus:text-destructive">

                        <Trash className="h-3.5 w-3.5 mr-2" />
                        Delete all rows
                      </DropdownMenuItem>
                      <DropdownMenuItem
                    onClick={() => handleDeleteSheet(sheet)}
                    className="text-destructive focus:text-destructive">

                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Delete sheet
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
            )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        }

        {/* Fixed Add Sheet button */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <button data-onboarding="add-sheet-btn" className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 border-l border-border/50 shrink-0 bg-muted/50">
              <Plus className="h-3.5 w-3.5 inline mr-1" />
              <span className="hidden sm:inline">Add Sheet</span>
              
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Create New Sheet</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="e.g., 5 Dec leads"
                value={newSheetName}
                onChange={(e) => setNewSheetName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSheet()} />

            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddSheet} disabled={!newSheetName.trim()}>
                Create Sheet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Rename Sheet</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Sheet name"
                value={newSheetName}
                onChange={(e) => setNewSheetName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEditSheet()} />

            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditSheet} disabled={!newSheetName.trim()}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={!!deleteAllConfirmSheet} onOpenChange={(open) => !open && setDeleteAllConfirmSheet(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all leads in "{deleteAllConfirmSheet?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all leads in this sheet. This action can be undone using the Undo button.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExportDialog
        open={exportDialogSheetId !== undefined}
        onOpenChange={(v) => { if (!v) setExportDialogSheetId(undefined); }}
        initialSheetId={exportDialogSheetId ?? null}
      />
    </>);

}