import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { toIST } from '@/lib/dateUtils';
import type { Prospect, Sheet } from '@/types/prospect';

export type GroupingMode = 'combined' | 'sheet' | 'month';

export interface ExportOptions {
  prospects: Prospect[];
  sheets: Sheet[];
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
  return (name.replace(/[:\\/\?\*\[\]]/g, '-').slice(0, 31) || 'Sheet').trim() || 'Sheet';
}

function dateDescSort<T extends { _ts: number }>(a: T, b: T) {
  return b._ts - a._ts;
}

interface GroupBucket {
  key: string;
  label: string;
  sortKey: string; // for ordering buckets
  rows: (Record<string, string> & { _ts: number })[];
}

function group(opts: ExportOptions): GroupBucket[] {
  const sheetNameById = new Map(opts.sheets.map((s) => [s.id, s.name]));
  const nameFor = (p: Prospect) => (p.sheet_id ? sheetNameById.get(p.sheet_id) || 'Unassigned' : 'Unassigned');
  const tsFor = (p: Prospect) => (p.date_added ? new Date(p.date_added).getTime() : 0);

  const makeRow = (p: Prospect) => ({ ...rowFor(p, nameFor(p)), _ts: tsFor(p) });

  if (opts.grouping === 'combined') {
    const rows = opts.prospects.map(makeRow).sort(dateDescSort);
    return [{ key: 'all', label: 'All Leads', sortKey: '0', rows }];
  }

  const map = new Map<string, GroupBucket>();
  for (const p of opts.prospects) {
    let key: string;
    let label: string;
    let sortKey: string;
    if (opts.grouping === 'sheet') {
      key = p.sheet_id || 'unassigned';
      label = nameFor(p);
      sortKey = label.toLowerCase();
    } else {
      // month
      if (!p.date_added) {
        key = 'no-date';
        label = 'No Date';
        sortKey = '0000-00';
      } else {
        const ist = toIST(new Date(p.date_added));
        key = format(ist, 'yyyy-MM');
        label = format(ist, 'MMM yyyy');
        sortKey = key;
      }
    }
    if (!map.has(key)) map.set(key, { key, label, sortKey, rows: [] });
    map.get(key)!.rows.push(makeRow(p));
  }

  const buckets = Array.from(map.values());
  for (const b of buckets) b.rows.sort(dateDescSort);

  if (opts.grouping === 'sheet') {
    buckets.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  } else {
    // month: newest first; push "no-date" last
    buckets.sort((a, b) => {
      if (a.key === 'no-date') return 1;
      if (b.key === 'no-date') return -1;
      return b.sortKey.localeCompare(a.sortKey);
    });
  }
  return buckets;
}

export function runExport(opts: ExportOptions): { count: number; bucketCount: number } {
  if (opts.prospects.length === 0) return { count: 0, bucketCount: 0 };

  const buckets = group(opts).filter((b) => b.rows.length > 0);
  const wb = XLSX.utils.book_new();
  const usedNames = new Set<string>();
  let total = 0;

  for (const bucket of buckets) {
    const cleanRows = bucket.rows.map(({ _ts, ...rest }) => rest);
    total += cleanRows.length;

    const headerRow1 = [`${bucket.label} — ${cleanRows.length} leads`];
    const headerRow2 = [`Exported: ${format(toIST(new Date()), 'dd MMM yyyy HH:mm')} IST`];
    const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, [], COLUMNS]);
    XLSX.utils.sheet_add_json(ws, cleanRows, {
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
  const filename = `${prefix}_${dateStr}.xlsx`;
  XLSX.writeFile(wb, filename);

  return { count: total, bucketCount: buckets.length };
}
