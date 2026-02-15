import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { NevoraFormField, SubmissionWithAnswers, FieldOptions } from '../types';

interface Props {
  fields: NevoraFormField[];
  submissions: SubmissionWithAnswers[];
  formTitle: string;
  onDelete?: (ids: string[]) => void;
}

const CHOICE_TYPES = ['select', 'radio', 'checkbox', 'multiselect'];

export function SubmissionsSpreadsheetView({ fields, submissions, onDelete }: Props) {
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const choiceFields = fields.filter(f => CHOICE_TYPES.includes(f.field_type));

  const filtered = useMemo(() => {
    let result = [...submissions];

    Object.entries(filters).forEach(([fieldKey, filterVal]) => {
      if (!filterVal || filterVal === '_all') return;
      result = result.filter(s => {
        const answer = s.answers.find(a => a.field_key === fieldKey);
        const val = answer?.value || '';
        return val.toLowerCase().includes(filterVal.toLowerCase());
      });
    });

    result.sort((a, b) => {
      if (sortField === 'created_at') {
        return sortDir === 'asc'
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      const aVal = a.answers.find(ans => ans.field_key === sortField)?.value || '';
      const bVal = b.answers.find(ans => ans.field_key === sortField)?.value || '';
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    return result;
  }, [submissions, filters, sortField, sortDir]);

  const toggleSort = (fieldKey: string) => {
    if (sortField === fieldKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(fieldKey);
      setSortDir('asc');
    }
  };

  const allSelected = filtered.length > 0 && filtered.every(s => selected.has(s.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(s => s.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (!onDelete || selected.size === 0) return;
    const ids = Array.from(selected);
    onDelete(ids);
    setSelected(new Set());
  };

  return (
    <div className="space-y-3">
      {/* Filters + bulk actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {choiceFields.map(f => {
            const opts = (f.options as FieldOptions)?.choices || [];
            return (
              <Select
                key={f.field_key}
                value={filters[f.field_key] || '_all'}
                onValueChange={v => setFilters(prev => ({ ...prev, [f.field_key]: v }))}
              >
                <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs rounded-lg">
                  <SelectValue placeholder={f.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All {f.label}</SelectItem>
                  {opts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            );
          })}
        </div>

        {selected.size > 0 && onDelete && (
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs rounded-lg gap-1.5"
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selected.size})
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs rounded-lg"
              onClick={() => setSelected(new Set())}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="border border-blue-100/50 dark:border-blue-900/30 rounded-xl overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-blue-50/60 dark:bg-blue-950/20 border-b border-blue-100/50 dark:border-blue-900/30 hover:bg-blue-50/60 dark:hover:bg-blue-950/20">
              {onDelete && (
                <TableHead className="w-[40px] px-2">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    className="border-blue-300 dark:border-blue-700"
                  />
                </TableHead>
              )}
              <TableHead className="text-[11px] font-semibold text-blue-700/70 dark:text-blue-300/70 w-[36px]">#</TableHead>
              {fields.map(f => (
                <TableHead
                  key={f.field_key}
                  className="text-[11px] font-semibold text-blue-700/70 dark:text-blue-300/70 cursor-pointer whitespace-nowrap"
                  onClick={() => toggleSort(f.field_key)}
                >
                  <div className="flex items-center gap-1">
                    {f.label}
                    {CHOICE_TYPES.includes(f.field_type) && (
                      <ArrowUpDown className="h-2.5 w-2.5 opacity-40" />
                    )}
                  </div>
                </TableHead>
              ))}
              <TableHead
                className="text-[11px] font-semibold text-blue-700/70 dark:text-blue-300/70 cursor-pointer whitespace-nowrap"
                onClick={() => toggleSort('created_at')}
              >
                <div className="flex items-center gap-1">
                  Date & Time
                  <ArrowUpDown className="h-2.5 w-2.5 opacity-40" />
                </div>
              </TableHead>
              {onDelete && (
                <TableHead className="w-[40px]" />
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={fields.length + (onDelete ? 4 : 2)} className="text-center text-muted-foreground text-sm py-10">
                  No responses yet
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s, i) => (
                <TableRow
                  key={s.id}
                  className={`hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition-colors ${selected.has(s.id) ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                >
                  {onDelete && (
                    <TableCell className="px-2 py-2">
                      <Checkbox
                        checked={selected.has(s.id)}
                        onCheckedChange={() => toggleOne(s.id)}
                        className="border-blue-300 dark:border-blue-700"
                      />
                    </TableCell>
                  )}
                  <TableCell className="text-xs text-muted-foreground font-medium py-2">{i + 1}</TableCell>
                  {fields.map(f => {
                    const a = s.answers.find(ans => ans.field_key === f.field_key);
                    return (
                      <TableCell key={f.field_key} className="text-xs max-w-[280px] truncate py-2">
                        {a?.value || '-'}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground py-2">
                    {format(new Date(s.created_at), 'MMM d, h:mm a')}
                  </TableCell>
                  {onDelete && (
                    <TableCell className="px-2 py-2">
                      <button
                        onClick={() => onDelete([s.id])}
                        className="p-1 rounded-md hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
