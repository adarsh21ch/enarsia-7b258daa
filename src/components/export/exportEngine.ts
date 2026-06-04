import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { toIST } from '@/lib/dateUtils';
import type { Prospect, Sheet } from '@/types/prospect';

export type GroupingMode = 'combined' | 'sheet' | 'month' | 'week';

export interface ExportOptions {
  prospects: Prospect[];
  sheets: Sheet[];
  scope: 'all' | 'sheets'; // 'sheets' uses sheetIds filter
  sheetIds?: string[]; // when scope='sheets'
  dateRange?: { from?: Date; to?: Date }; // inclusive
  grouping: GroupingMode;
  filenamePrefix?: string;
}

const COLUMNS = [
  'Name', 'Phone', 'Phone 2', 'Email', 'Age/DOB', 'Gender', 'Address',
  'Sheet', 'Enrollment Status', 'Call Stage', 'Last Response',
  'Last Response At (IST)', 'Notes', 'Priority', 'Quality',
  'Profession', 'Instagram', 'Personal Tags', 'Date Added',
];

const COL_WIDTHS = [25, 15, 15, 22, 10, 8, 28, 18, 16, 18, 20, 18, 35, 10, 12, 18, 18, 22, 12];

function lastResponse(p: Prospect): { label: string; at: string } {
  const candidates: { val?: string | null; at?: string | null }[] = [
    { val: p.action_taken, at: p.action_taken_at },
    { val: p.funnel_stage, at: p.funnel_stage_at },
  ];
  const valid = candidates.filter((c) => c.val);
  if (valid.length === 0) return { label: '', at: '' };
  valid.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  const top = valid[0];
  return {
    label: top.val || '',
    at: top.at ? format(toIST(new Date(top.at)), 'dd/MM/yyyy HH:mm') : '',
  };
}

function rowFor(p: Prospect, sheetName: string) {
  const lr = lastResponse(p);
  return {
    'Name': p.name || '',
    'Phone': p.phone || '',
    'Phone 2': p.phone2 || '',
    'Email': p.email || '',
    'Age/DOB': p.age_or_dob || '',
    'Gender': p.gender || '',
    'Address': p.address || '',
    'Sheet': sheetName,
    'Enrollment Status': p.enrollment_status || (p.funnel_stage ? 'Enrolled' : 'Not Enrolled'),
    'Call Stage': p.funnel_stage || '',
    'Last Response': lr.label,
    'Last Response At (IST)': lr.at,
    'Notes': p.notes || '',
    'Priority': p.priority || '',
    'Quality': p.prospect_status || '',
    'Profession': p.profession || '',
    'Instagram': p.instagram || '',
    'Personal Tags': (p.personal_tags || []).join(', '),
    'Date Added': p.date_added ? format(toIST(new Date(p.date_added)), 'dd/MM/yyyy') : '',
  };
}

function sanitizeTabName(name: string): string {
  // Excel sheet names: <=31 chars, no : \ / ? * [ ]
  return name.replace(/[:\\/\?\*\[\]]/g, '-').slice(0, 31) || 'Sheet';
}

function getISOWeekKey(date: Date): { key: string; label: string } {
  const ist = toIST(date);
  const d = new Date(Date.UTC(ist.getFullYear(), ist.getMonth(), ist.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const key = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  // Compute Monday of week for label
  const monday = new Date(ist);
  const day = ist.getDay() || 7;
  monday.setDate(ist.getDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const label = `${key} (${format(monday, 'MMM d')}–${format(sunday, 'MMM d')})`;
  return { key, label };
}

function getMonthKey(date: Date): { key: string; label: string } {
  const ist = toIST(date);
  const key = format(ist, 'yyyy-MM');
  const label = format(ist, 'MMM yyyy');
  return { key, label };
}

interface GroupBucket {
  key: string;
  label: string;
  rows: Record<string, string>[];
}

function applyFilters(opts: ExportOptions): Prospect[] {
  let arr = opts.prospects;
  if (opts.scope === 'sheets' && opts.sheetIds && opts.sheetIds.length > 0) {
    const set = new Set(opts.sheetIds);
    arr = arr.filter((p) => p.sheet_id && set.has(p.sheet_id));
  }
  const from = opts.dateRange?.from ? new Date(opts.dateRange.from).getTime() : null;
  const to = opts.dateRange?.to ? new Date(opts.dateRange.to).getTime() + 86400000 - 1 : null;
  if (from !== null || to !== null) {
    arr = arr.filter((p) => {
      if (!p.date_added) return false;
      const t = new Date(p.date_added).getTime();
      if (from !== null && t < from) return false;
      if (to !== null && t > to) return false;
      return true;
    });
  }
  return arr;
}

function group(opts: ExportOptions, filtered: Prospect[]): GroupBucket[] {
  const sheetNameById = new Map(opts.sheets.map((s) => [s.id, s.name]));
  const nameFor = (p: Prospect) => (p.sheet_id ? sheetNameById.get(p.sheet_id) || 'Unassigned' : 'Unassigned');

  if (opts.grouping === 'combined') {
    return [{
      key: 'all',
      label: 'All Leads',
      rows: filtered.map((p) => rowFor(p, nameFor(p))),
    }];
  }

  const map = new Map<string, GroupBucket>();
  for (const p of filtered) {
    let key: string;
    let label: string;
    if (opts.grouping === 'sheet') {
      key = p.sheet_id || 'unassigned';
      label = nameFor(p);
    } else if (opts.grouping === 'month') {
      const d = p.date_added ? new Date(p.date_added) : new Date();
      const g = getMonthKey(d);
      key = g.key; label = g.label;
    } else {
      const d = p.date_added ? new Date(p.date_added) : new Date();
      const g = getISOWeekKey(d);
      key = g.key; label = g.label;
    }
    if (!map.has(key)) map.set(key, { key, label, rows: [] });
    map.get(key)!.rows.push(rowFor(p, nameFor(p)));
  }

  const buckets = Array.from(map.values());
  if (opts.grouping === 'sheet') {
    buckets.sort((a, b) => a.label.localeCompare(b.label));
  } else {
    buckets.sort((a, b) => a.key.localeCompare(b.key));
  }
  return buckets;
}

export function runExport(opts: ExportOptions): { count: number; bucketCount: number } {
  const filtered = applyFilters(opts);
  if (filtered.length === 0) {
    return { count: 0, bucketCount: 0 };
  }

  const buckets = group(opts, filtered).filter((b) => b.rows.length > 0);
  const wb = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  for (const bucket of buckets) {
    const headerRow1 = [`${bucket.label} — ${bucket.rows.length} leads`];
    const headerRow2 = [`Exported: ${format(toIST(new Date()), 'dd MMM yyyy HH:mm')} IST`];
    const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, [], COLUMNS]);
    XLSX.utils.sheet_add_json(ws, bucket.rows, {
      header: COLUMNS,
      origin: 'A5',
      skipHeader: true,
    });
    ws['!cols'] = COL_WIDTHS.map((wch) => ({ wch }));

    let name = sanitizeTabName(bucket.label);
    let i = 2;
    while (usedNames.has(name)) {
      const suffix = ` (${i})`;
      name = sanitizeTabName(bucket.label).slice(0, 31 - suffix.length) + suffix;
      i++;
    }
    usedNames.add(name);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  const prefix = opts.filenamePrefix || 'Enarsia_Export';
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const grpTag = opts.grouping === 'combined' ? 'All' : `by-${opts.grouping}`;
  const filename = `${prefix}_${dateStr}_${grpTag}.xlsx`;
  XLSX.writeFile(wb, filename);

  return { count: filtered.length, bucketCount: buckets.length };
}
