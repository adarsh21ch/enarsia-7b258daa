import { useState } from 'react';
import { Sheet } from '@/types/prospect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, MoreVertical, Pencil, Trash2, FileSpreadsheet, CheckSquare, Trash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface SheetTabsProps {
  sheets: Sheet[];
  selectedSheetId: string | null;
  onSelectSheet: (id: string | null) => void;
  onAddSheet: (name: string) => Promise<Sheet | null>;
  onUpdateSheet: (id: string, name: string) => Promise<Sheet | null>;
  onDeleteSheet: (id: string) => Promise<boolean>;
  onEnterSelectMode?: (sheetId: string | null) => void;
  onDeleteAllInSheet?: (sheetId: string | null) => void;
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
}: SheetTabsProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');
  const [editingSheet, setEditingSheet] = useState<Sheet | null>(null);
  const [deleteAllConfirmSheet, setDeleteAllConfirmSheet] = useState<{ id: string | null; name: string } | null>(null);

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
    if (confirm(`Delete "${sheet.name}"? Prospects will be unassigned from this sheet.`)) {
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

  // Render menu for "All" tab
  const renderAllTabMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "px-1 py-2 text-muted-foreground hover:text-foreground",
            selectedSheetId === null && "text-foreground"
          )}
        >
          <MoreVertical className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover border-border z-50">
        <DropdownMenuItem onClick={() => handleSelectAndDelete(null)}>
          <CheckSquare className="h-3.5 w-3.5 mr-2" />
          Select & Delete
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleDeleteAllInSheet(null, 'All')}
          className="text-destructive focus:text-destructive"
        >
          <Trash className="h-3.5 w-3.5 mr-2" />
          Delete all rows
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <div className="flex items-center bg-muted/50 border-b border-border">
        {/* Fixed "All" tab with dropdown */}
        <div className="flex items-center border-r border-border/50 shrink-0 bg-muted/50">
          <button
            onClick={() => onSelectSheet(null)}
            className={cn(
              "px-3 py-2 text-xs font-medium transition-colors",
              selectedSheetId === null 
                ? "bg-card text-foreground border-t-2 border-t-primary" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
            )}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 inline mr-1.5" />
            All
          </button>
          {renderAllTabMenu()}
        </div>

        {/* Scrollable sheet tabs area */}
        {sheets.length > 0 && (
          <ScrollArea className="flex-1 whitespace-nowrap">
            <div className="flex items-center">
              {sheets.map((sheet) => (
                <div key={sheet.id} className="flex items-center border-r border-border/50">
                  <button
                    onClick={() => onSelectSheet(sheet.id)}
                    className={cn(
                      "px-3 py-2 text-xs font-medium transition-colors",
                      selectedSheetId === sheet.id 
                        ? "bg-card text-foreground border-t-2 border-t-primary" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    )}
                  >
                    {sheet.name}
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={cn(
                          "px-1 py-2 text-muted-foreground hover:text-foreground",
                          selectedSheetId === sheet.id && "text-foreground"
                        )}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border z-50">
                      <DropdownMenuItem onClick={() => openEditDialog(sheet)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSelectAndDelete(sheet.id)}>
                        <CheckSquare className="h-3.5 w-3.5 mr-2" />
                        Select & Delete
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteAllInSheet(sheet.id, sheet.name)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash className="h-3.5 w-3.5 mr-2" />
                        Delete all rows
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteSheet(sheet)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Delete sheet
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}

        {/* Fixed Add Sheet button */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <button className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 border-l border-border/50 shrink-0 bg-muted/50">
              <Plus className="h-3.5 w-3.5 inline mr-1" />
              <span className="hidden sm:inline">Add Sheet</span>
              <span className="sm:hidden">+</span>
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
                onKeyDown={(e) => e.key === 'Enter' && handleAddSheet()}
              />
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
                onKeyDown={(e) => e.key === 'Enter' && handleEditSheet()}
              />
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
            <AlertDialogTitle>Delete all prospects in "{deleteAllConfirmSheet?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all prospects in this sheet. This action can be undone using the Undo button.
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
    </>
  );
}
