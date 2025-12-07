import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Pencil, Trash2, CalendarIcon, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { FunnelConfig } from '@/hooks/useFunnelConfigs';
import { cn } from '@/lib/utils';

interface FunnelConfigListProps {
  configs: FunnelConfig[];
  onUpdate: (id: string, updates: Partial<Pick<FunnelConfig, 'funnel_name' | 'funnel_length' | 'day_1_start'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const LENGTH_OPTIONS = [
  { value: '2', label: '2-day' },
  { value: '3', label: '3-day' },
  { value: '5', label: '5-day' },
  { value: '7', label: '7-day' },
];

export function FunnelConfigList({ configs, onUpdate, onDelete }: FunnelConfigListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLength, setEditLength] = useState('3');
  const [editDate, setEditDate] = useState<Date>(new Date());

  const startEdit = (config: FunnelConfig) => {
    setEditingId(config.id);
    setEditName(config.funnel_name);
    setEditLength(config.funnel_length.toString());
    setEditDate(parseISO(config.day_1_start));
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await onUpdate(editingId, {
      funnel_name: editName.trim(),
      funnel_length: parseInt(editLength),
      day_1_start: format(editDate, 'yyyy-MM-dd'),
    });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  if (configs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No funnels configured. Add one to get started.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {configs.map((config) => (
        <div
          key={config.id}
          className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/30"
        >
          {editingId === config.id ? (
            <>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 h-8"
                placeholder="Funnel name"
              />
              <Select value={editLength} onValueChange={setEditLength}>
                <SelectTrigger className="w-24 h-8 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  {LENGTH_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-28">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {format(editDate, "MMM d")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border border-border z-50" align="end">
                  <Calendar
                    mode="single"
                    selected={editDate}
                    onSelect={(d) => d && setEditDate(d)}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={saveEdit}>
                <Check className="h-4 w-4 text-green-500" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEdit}>
                <X className="h-4 w-4 text-red-500" />
              </Button>
            </>
          ) : (
            <>
              <span className="flex-1 font-medium">{config.funnel_name}</span>
              <span className="text-sm text-muted-foreground px-2 py-0.5 rounded bg-muted">
                {config.funnel_length}-day
              </span>
              <span className="text-sm text-muted-foreground">
                {format(parseISO(config.day_1_start), "MMM d")}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(config)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(config.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
