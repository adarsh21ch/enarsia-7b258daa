/**
 * Leader-side: manage compulsory-action template items for a chosen level.
 * Read+write surface using the existing useTodoTemplates hook.
 * Used inside the CompulsoryActionsSheet alongside the team grid.
 */
import { useState } from 'react';
import { Plus, Trash2, Loader2, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useTodoTemplates } from '@/hooks/useTodoTemplates';
import { cn } from '@/lib/utils';

interface Props {
  levelPosition: number;
  levelLabel: string;
}

export function CompulsoryActionsLeaderTab({ levelPosition, levelLabel }: Props) {
  const {
    items, templateName, loading, saving,
    addItem, updateItem, toggleItemActive, deleteItem,
  } = useTodoTemplates(levelPosition);
  const [newTitle, setNewTitle] = useState('');

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    const r = await addItem(newTitle.trim(), null);
    if (r) setNewTitle('');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ListChecks className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium text-foreground">{templateName}</span>
        <span>· {levelLabel}</span>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Add a compulsory action…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          className="h-8 text-xs"
        />
        <Button size="sm" className="h-8 px-2" onClick={handleAdd} disabled={!newTitle.trim() || saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
          No compulsory actions yet for this level.
        </div>
      ) : (
        <ul className="divide-y divide-border/40 rounded-md border border-border/40">
          {items.map((it) => (
            <li
              key={it.id}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 text-xs',
                !it.is_active && 'opacity-50',
              )}
            >
              <Switch
                checked={it.is_active}
                onCheckedChange={(v) => toggleItemActive(it.id, v)}
                className="scale-75"
              />
              <input
                defaultValue={it.item_title}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== it.item_title) updateItem(it.id, { item_title: v });
                }}
                className="flex-1 bg-transparent outline-none focus:underline"
              />
              {it.only_on_date && (
                <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">
                  {it.only_on_date}
                </span>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => deleteItem(it.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
