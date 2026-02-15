import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import type { NevoraFormField, SubmissionWithAnswers, FieldOptions } from '../types';

interface Props {
  fields: NevoraFormField[];
  submissions: SubmissionWithAnswers[];
  formTitle: string;
}

const CHOICE_TYPES = ['select', 'radio', 'checkbox', 'multiselect'];

export function SubmissionsSpreadsheetView({ fields, submissions }: Props) {
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});

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

  return (
    <div className="space-y-3">
      {/* Filters */}
      {choiceFields.length > 0 && (
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
      )}

      <div className="border border-blue-100/50 dark:border-blue-900/30 rounded-xl overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-blue-50/60 dark:bg-blue-950/20 border-b border-blue-100/50 dark:border-blue-900/30 hover:bg-blue-50/60 dark:hover:bg-blue-950/20">
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={fields.length + 2} className="text-center text-muted-foreground text-sm py-10">
                  No responses yet
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s, i) => (
                <TableRow key={s.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition-colors">
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
