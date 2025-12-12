import { useState } from 'react';
import { useLeaderLevels, LeaderLevel } from '@/hooks/useLeaderLevels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Check, Star, GripVertical, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LevelManagement() {
  const { levels, loading, addLevel, updateLevel, deleteLevel, setDefaultLevel } = useLeaderLevels();
  const [open, setOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newCode, setNewCode] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editCode, setEditCode] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    await addLevel(newLabel.trim(), newCode.trim() || undefined);
    setNewLabel('');
    setNewCode('');
    setAdding(false);
  };

  const handleStartEdit = (level: LeaderLevel) => {
    setEditingId(level.id);
    setEditLabel(level.label);
    setEditCode(level.code || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editLabel.trim()) return;
    await updateLevel(editingId, { 
      label: editLabel.trim(), 
      code: editCode.trim() || undefined 
    });
    setEditingId(null);
    setEditLabel('');
    setEditCode('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
    setEditCode('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Star className="h-4 w-4" />
          Manage Levels ({levels.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Team Levels</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Define levels for your team members. Each new member who joins with your Leader ID will be assigned the default level (marked with a star).
          </p>

          {/* Add new level */}
          <div className="flex gap-2">
            <Input
              placeholder="Level name (e.g., AS Level)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Code (L1)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="w-20"
            />
            <Button size="sm" onClick={handleAdd} disabled={!newLabel.trim() || adding}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Levels list */}
          <div className="space-y-2">
            {levels.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No levels defined yet</p>
                <p className="text-xs">Add your first level above</p>
              </div>
            ) : (
              levels.map((level) => (
                <div
                  key={level.id}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border transition-colors",
                    level.is_default 
                      ? "bg-primary/5 border-primary/30" 
                      : "bg-muted/30 border-border/50"
                  )}
                >
                  {editingId === level.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="flex-1 h-8"
                        placeholder="Level name"
                      />
                      <Input
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value)}
                        className="w-16 h-8"
                        placeholder="Code"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-green-600"
                        onClick={handleSaveEdit}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={handleCancelEdit}
                      >
                        ×
                      </Button>
                    </div>
                  ) : (
                    <>
                      <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{level.label}</span>
                          {level.code && (
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {level.code}
                            </span>
                          )}
                          {level.is_default && (
                            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!level.is_default && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setDefaultLevel(level.id)}
                            title="Set as default"
                          >
                            <Star className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleStartEdit(level)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {!level.is_default && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => deleteLevel(level.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
