// Todo Template Manager - Bottom sheet on mobile, drawer on desktop
import { useState, useEffect } from 'react';
import { useTodoTemplates, TodoTemplateItem } from '@/hooks/useTodoTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Plus, ChevronUp, ChevronDown, Loader2, ListTodo, Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';

interface TodoTemplateManagerProps {
  levelPosition: number;
  levelLabel: string;
  trigger?: React.ReactNode;
}

function TemplateContent({ levelPosition, levelLabel }: { levelPosition: number; levelLabel: string }) {
  const { 
    items, 
    templateName, 
    loading, 
    saving,
    addItem, 
    updateItem,
    updateTemplateName,
    toggleItemActive, 
    reorderItems 
  } = useTodoTemplates(levelPosition);

  const [newItemTitle, setNewItemTitle] = useState('');
  const [editingNameMode, setEditingNameMode] = useState(false);
  const [editedName, setEditedName] = useState(templateName);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemTitle, setEditingItemTitle] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    setEditedName(templateName);
  }, [templateName]);

  const handleAddItem = async () => {
    if (!newItemTitle.trim()) return;
    const result = await addItem(newItemTitle);
    if (result) {
      setNewItemTitle('');
      setLastSaved(new Date());
    }
  };

  const handleSaveTemplateName = async () => {
    if (editedName.trim() && editedName !== templateName) {
      await updateTemplateName(editedName);
      setLastSaved(new Date());
    }
    setEditingNameMode(false);
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    await reorderItems(newItems);
    setLastSaved(new Date());
  };

  const handleMoveDown = async (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    await reorderItems(newItems);
    setLastSaved(new Date());
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await toggleItemActive(id, isActive);
    setLastSaved(new Date());
  };

  const handleStartEditItem = (item: TodoTemplateItem) => {
    setEditingItemId(item.id);
    setEditingItemTitle(item.item_title);
  };

  const handleSaveItemEdit = async () => {
    if (!editingItemId || !editingItemTitle.trim()) return;
    await updateItem(editingItemId, { item_title: editingItemTitle.trim() });
    setEditingItemId(null);
    setEditingItemTitle('');
    setLastSaved(new Date());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      <p className="text-xs text-muted-foreground">
        Create a checklist template for <strong>{levelLabel}</strong>. Team members at this level will see these tasks daily.
      </p>

      {/* Template Name */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Template Name</Label>
        {editingNameMode ? (
          <div className="flex items-center gap-2">
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="h-9"
              autoFocus
            />
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={handleSaveTemplateName}>
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setEditingNameMode(false)}>
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <div 
            className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setEditingNameMode(true)}
          >
            <span className="font-medium text-sm">{templateName}</span>
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Add new item */}
      <div className="flex gap-2">
        <Input
          placeholder="Add checklist item..."
          value={newItemTitle}
          onChange={(e) => setNewItemTitle(e.target.value)}
          className="flex-1"
          onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
        />
        <Button size="sm" onClick={handleAddItem} disabled={!newItemTitle.trim() || saving}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Items list */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ListTodo className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No items yet</p>
            <p className="text-xs">Add your first checklist item above</p>
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-lg border transition-all",
                item.is_active 
                  ? "bg-card border-border/50" 
                  : "bg-muted/30 border-border/30 opacity-60"
              )}
            >
              {editingItemId === item.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editingItemTitle}
                    onChange={(e) => setEditingItemTitle(e.target.value)}
                    className="flex-1 h-8"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveItemEdit();
                      if (e.key === 'Escape') setEditingItemId(null);
                    }}
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveItemEdit}>
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingItemId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  {/* Reorder buttons */}
                  <div className="flex flex-col">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 p-0"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 p-0"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === items.length - 1}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Item title */}
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleStartEditItem(item)}
                  >
                    <span className={cn(
                      "text-sm font-medium",
                      !item.is_active && "line-through text-muted-foreground"
                    )}>
                      {item.item_title}
                    </span>
                  </div>

                  {/* Active toggle */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">
                      {item.is_active ? 'Active' : 'Disabled'}
                    </span>
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={(checked) => handleToggleActive(item.id, checked)}
                      className="scale-75"
                    />
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Last saved indicator */}
      {lastSaved && (
        <p className="text-xs text-muted-foreground text-center">
          Last saved at {format(lastSaved, 'h:mm:ss a')}
        </p>
      )}
    </div>
  );
}

export function TodoTemplateManager({ levelPosition, levelLabel, trigger }: TodoTemplateManagerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const defaultTrigger = (
    <Button variant="ghost" size="icon" className="h-7 w-7" title="Manage Todo Template">
      <ListTodo className="h-4 w-4 text-muted-foreground" />
    </Button>
  );

  const content = <TemplateContent levelPosition={levelPosition} levelLabel={levelLabel} />;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {trigger || defaultTrigger}
        </DrawerTrigger>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Todo Template for {levelLabel}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || defaultTrigger}
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[450px]">
        <SheetHeader>
          <SheetTitle>Todo Template for {levelLabel}</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {content}
        </div>
      </SheetContent>
    </Sheet>
  );
}
