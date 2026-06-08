import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, Gift, Database, Users } from 'lucide-react';

interface MasterRow {
  name: string;
  phone: string;
  phone2?: string;
  email?: string;
  age_or_dob?: string;
  gender?: string;
  address?: string;
  state?: string;
  profession?: string;
}

const HEADER_MAP: Record<keyof MasterRow, string[]> = {
  name: ['name', 'full name', 'lead name'],
  phone: ['phone', 'phone 1', 'mobile', 'contact', 'number'],
  phone2: ['phone 2', 'phone2', 'whatsapp', 'whatsapp number', 'alt phone'],
  email: ['email', 'email id', 'mail'],
  age_or_dob: ['age', 'dob', 'date of birth', 'birthday'],
  gender: ['gender', 'sex'],
  address: ['address', 'city', 'location'],
  state: ['state'],
  profession: ['profession', 'occupation', 'job'],
};

function detectMapping(headers: string[]): Partial<Record<keyof MasterRow, string>> {
  const out: Partial<Record<keyof MasterRow, string>> = {};
  const norm = (s: string) => s.toLowerCase().trim().replace(/[\s_-]+/g, ' ');
  const used = new Set<string>();
  for (const [field, candidates] of Object.entries(HEADER_MAP) as [keyof MasterRow, string[]][]) {
    for (const h of headers) {
      if (used.has(h)) continue;
      const n = norm(h);
      if (candidates.some((c) => n === c || n.includes(c))) {
        out[field] = h;
        used.add(h);
        break;
      }
    }
  }
  return out;
}

export function DemoLeadsManager() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seedingAll, setSeedingAll] = useState(false);
  const [parsedRows, setParsedRows] = useState<MasterRow[] | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [{ data: flag }, { count: rowCount }] = await Promise.all([
        supabase.from('admin_feature_flags').select('is_enabled').eq('feature_key', 'demo_leads_enabled').maybeSingle(),
        supabase.from('demo_leads_master').select('id', { count: 'exact', head: true }),
      ]);
      setEnabled(!!flag?.is_enabled);
      setCount(rowCount ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const toggleEnabled = async (next: boolean) => {
    setSaving(true);
    setEnabled(next);
    const { error } = await supabase
      .from('admin_feature_flags')
      .update({ is_enabled: next } as any)
      .eq('feature_key', 'demo_leads_enabled');
    setSaving(false);
    if (error) {
      toast.error('Failed to update toggle');
      setEnabled(!next);
    } else {
      toast.success(next ? 'Demo leads enabled for new users' : 'Demo leads disabled');
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
      if (rows.length === 0) {
        toast.error('File is empty');
        e.target.value = '';
        return;
      }
      const headers = Object.keys(rows[0]);
      const mapping = detectMapping(headers);
      if (!mapping.name || !mapping.phone) {
        toast.error('Could not detect Name or Phone columns');
        e.target.value = '';
        return;
      }
      const parsed: MasterRow[] = rows.map((r) => ({
        name: String(r[mapping.name!] ?? '').trim(),
        phone: String(r[mapping.phone!] ?? '').trim(),
        phone2: mapping.phone2 ? String(r[mapping.phone2] ?? '').trim() : '',
        email: mapping.email ? String(r[mapping.email] ?? '').trim() : '',
        age_or_dob: mapping.age_or_dob ? String(r[mapping.age_or_dob] ?? '').trim() : '',
        gender: mapping.gender ? String(r[mapping.gender] ?? '').trim() : '',
        address: mapping.address ? String(r[mapping.address] ?? '').trim() : '',
        state: mapping.state ? String(r[mapping.state] ?? '').trim() : '',
        profession: mapping.profession ? String(r[mapping.profession] ?? '').trim() : '',
      })).filter((r) => r.name && r.phone);

      if (parsed.length === 0) {
        toast.error('No valid rows after parsing (need Name + Phone)');
        e.target.value = '';
        return;
      }
      setParsedRows(parsed);
      toast.success(`Parsed ${parsed.length} rows. Click "Replace master sheet" to save.`);
    } catch (err) {
      toast.error('Failed to parse file');
    } finally {
      e.target.value = '';
    }
  };

  const replaceMaster = async () => {
    if (!parsedRows) return;
    setUploading(true);
    const { data, error } = await supabase.rpc('replace_demo_leads_master', { p_rows: parsedRows as any });
    setUploading(false);
    if (error) {
      toast.error(error.message || 'Failed to replace');
      return;
    }
    const result = data as { rows?: number } | null;
    toast.success(`Master sheet updated — ${result?.rows ?? 0} rows active`);
    setParsedRows(null);
    refresh();
  };

  const seedAllExisting = async () => {
    if (!confirm('Seed demo leads for ALL existing users who don\'t have them yet? This may take a while.')) return;
    setSeedingAll(true);
    try {
      // Fetch users who haven't been seeded.
      const { data: users, error } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('demo_data_created', false)
        .limit(500);
      if (error) throw error;
      let ok = 0;
      for (const u of users ?? []) {
        const { error: e2 } = await supabase.rpc('seed_demo_data_for_user', { p_user_id: u.user_id });
        if (!e2) ok++;
      }
      toast.success(`Seeded ${ok} of ${users?.length ?? 0} users`);
    } catch (e: any) {
      toast.error(e?.message || 'Bulk seed failed');
    } finally {
      setSeedingAll(false);
    }
  };

  return (
    <div className="space-y-3">
      <Card className="p-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2"><Gift className="h-4 w-4 text-primary" /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="demo-enable" className="text-sm font-semibold">Demo leads on first login</Label>
              <Switch id="demo-enable" checked={enabled} disabled={loading || saving} onCheckedChange={toggleEnabled} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
              When ON, every new signup gets 50 demo leads + tags + activity + tasks so the app feels alive from day 1.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Master demo sheet</span>
          <span className="ml-auto text-[11px] text-muted-foreground">{count} rows active</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug">
          Upload an Excel/CSV with columns: <strong>Name, Phone, Phone 2, Email, DOB, Gender, Address, State, Profession</strong>.
          All phone numbers should be <strong>fake / un-dialable</strong>.
        </p>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-md border bg-background px-2.5 h-8 text-[11px] font-medium hover:bg-muted transition">
            <Upload className="h-3.5 w-3.5" />
            Choose file
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          </label>
          {parsedRows && (
            <>
              <span className="text-[11px] text-muted-foreground">{parsedRows.length} rows parsed</span>
              <Button size="sm" className="h-8 text-[11px]" onClick={replaceMaster} disabled={uploading}>
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Replace master sheet'}
              </Button>
            </>
          )}
        </div>
      </Card>

      <Card className="p-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted p-2"><Users className="h-4 w-4 text-muted-foreground" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Seed existing users</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              One-time backfill for users who signed up before demo leads existed.
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={seedAllExisting} disabled={seedingAll}>
            {seedingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Run backfill'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
