import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import type { NevoraFormField, SubmissionWithAnswers, FieldOptions } from '../types';

interface Props {
  fields: NevoraFormField[];
  submissions: SubmissionWithAnswers[];
  formTitle: string;
}

const CHOICE_TYPES = ['select', 'radio', 'checkbox', 'multiselect'];

export function SubmissionsSpreadsheetView({ fields, submissions, formTitle }: Props) {
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const choiceFields = fields.filter(f => CHOICE_TYPES.includes(f.field_type));

  const filtered = useMemo(() => {
    let result = [...submissions];

    // Apply filters
    Object.entries(filters).forEach(([fieldKey, filterVal]) => {
      if (!filterVal || filterVal === '_all') return;
      result = result.filter(s => {
        const answer = s.answers.find(a => a.field_key === fieldKey);
        const val = answer?.value || '';
        return val.toLowerCase().includes(filterVal.toLowerCase());
      });
    });

    // Sort
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

  const exportXLSX = () => {
    const headers = [...fields.map(f => f.label), 'Date & Time'];
    const rows = filtered.map(s => {
      const row: string[] = fields.map(f => {
        const a = s.answers.find(ans => ans.field_key === f.field_key);
        return a?.value || '';
      });
      row.push(format(new Date(s.created_at), 'yyyy-MM-dd HH:mm'));
      return row;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Responses');
    XLSX.writeFile(wb, `${formTitle}_responses.xlsx`);
  };

  return (
    <div className="space-y-3">
      {/* Filters row */}
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
                <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs">
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

      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{filtered.length} responses</span>
        <Button variant="outline" size="sm" onClick={exportXLSX}>
          <Download className="h-3 w-3 mr-1" /> Export XLSX
        </Button>
      </div>

      <div className="border rounded-lg overflow-auto max-h-[60vh]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-[40px]">#</TableHead>
              {fields.map(f => (
                <TableHead key={f.field_key} className="text-xs cursor-pointer whitespace-nowrap" onClick={() => toggleSort(f.field_key)}>
                  <div className="flex items-center gap-1">
                    {f.label}
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-xs cursor-pointer whitespace-nowrap" onClick={() => toggleSort('created_at')}>
                <div className="flex items-center gap-1">
                  Date & Time
                  <ArrowUpDown className="h-3 w-3 opacity-50" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={fields.length + 2} className="text-center text-muted-foreground text-sm py-8">
                  No responses yet
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                  {fields.map(f => {
                    const a = s.answers.find(ans => ans.field_key === f.field_key);
                    return (
                      <TableCell key={f.field_key} className="text-xs max-w-[200px] truncate">
                        {a?.value || '-'}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {format(new Date(s.created_at), 'MMM d, yyyy HH:mm')}
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
