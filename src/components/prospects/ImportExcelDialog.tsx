import { useState, useRef, useCallback, useEffect } from 'react';
import { SharedLeadsDrawer } from '@/components/profile/SharedLeadsDrawer';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, AlertCircle, Share2, CheckCircle2, Sparkles } from 'lucide-react';
import { Prospect } from '@/types/prospect';
import { toast } from 'sonner';
import { sanitizeImportString, validateImportedProspect } from '@/lib/validations';
import { cn } from '@/lib/utils';
import { useLifetimeLeadLimit } from '@/hooks/useLifetimeLeadLimit';
import { useDailyUploadLimit } from '@/hooks/useDailyUploadLimit';
import { HardLimitModal } from '@/components/subscription/HardLimitModal';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useNavigate } from 'react-router-dom';

interface ImportExcelDialogProps {
  onImport: (prospects: Partial<Prospect>[], onProgress?: (imported: number, total: number) => void) => Promise<{ imported: number; skipped: number }>;
  // External control (e.g. Fix-column-mapping from sheet 3-dots)
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

interface ColumnMapping {
  name: string | null;
  phone: string | null;
  phone2: string | null;
  email: string | null;
  address: string | null;
  state: string | null;
  age_or_dob: string | null;
  gender: string | null;
  instagram: string | null;
  profession: string | null;
}

const APP_FIELDS: { key: keyof ColumnMapping; label: string; required?: boolean }[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'phone', label: 'Phone 1', required: true },
  { key: 'phone2', label: 'Phone 2' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address / City' },
  { key: 'state', label: 'State' },
  { key: 'age_or_dob', label: 'Age / DOB' },
  { key: 'gender', label: 'Gender' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'profession', label: 'Profession' },
];

// Indian states + common abbreviations (lowercased, no spaces) for state detection
const INDIAN_STATES = new Set<string>([
  'andhrapradesh','ap','arunachalpradesh','ar','assam','as','bihar','br','chhattisgarh','cg','goa','ga',
  'gujarat','gj','haryana','hr','himachalpradesh','hp','jharkhand','jh','karnataka','ka','kerala','kl',
  'madhyapradesh','mp','maharashtra','mh','manipur','mn','meghalaya','ml','mizoram','mz','nagaland','nl',
  'odisha','orissa','od','or','punjab','pb','rajasthan','rj','sikkim','sk','tamilnadu','tn','telangana','tg','ts',
  'tripura','tr','uttarpradesh','up','uttarakhand','uk','ut','westbengal','wb','delhi','dl','newdelhi',
  'jammuandkashmir','jk','ladakh','la','chandigarh','ch','puducherry','pondicherry','py','andamanandnicobar','an',
  'dadraandnagarhaveli','dn','damananddiu','dd','lakshadweep','ld',
]);
const isStateValue = (v: string) => INDIAN_STATES.has(v.trim().toLowerCase().replace(/[\s_\-\.]+/g, ''));

// Date detection: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, DD.MM.YYYY, DD MM YYYY, or 4-digit year
const DATE_PATTERNS: RegExp[] = [
  /^\d{1,2}[\-\/\.\s]\d{1,2}[\-\/\.\s]\d{2,4}$/,
  /^\d{4}[\-\/\.\s]\d{1,2}[\-\/\.\s]\d{1,2}$/,
  /^(19|20)\d{2}$/,
];
const isDateLike = (v: string) => {
  const t = v.trim();
  return DATE_PATTERNS.some(re => re.test(t));
};
const isAgeLike = (v: string) => {
  const t = v.trim();
  if (!/^\d{1,3}$/.test(t)) return false;
  const n = parseInt(t, 10);
  return n >= 10 && n <= 99;
};
// Phone: mostly digits 9-13 long, optional +91, spaces; MUST NOT match a date pattern
const isPhoneLike = (v: string) => {
  const t = v.trim();
  if (isDateLike(t)) return false;
  // Reject if contains date-shape separators around digits (any hyphen/slash/dot between digits)
  if (/\d[\-\/\.]\d/.test(t)) return false;
  const digits = t.replace(/[\s\(\)\-]/g, '').replace(/^\+/, '');
  if (!/^\d+$/.test(digits)) return false;
  return digits.length >= 9 && digits.length <= 13;
};

type ReverseMapping = Record<string, keyof ColumnMapping | 'skip' | null>;

interface DetectionResult {
  mapping: ReverseMapping;
  confidence: { name: number; phone: number };
}


// Detect a single field for a column based on the dominant value-shape in its samples.
// ORDER MATTERS: email → dob/age → state → gender → instagram → phone → name → profession/address.
function guessFieldFromValues(values: string[]): { field: keyof ColumnMapping | null; score: number } {
  const nonEmpty = values.filter(v => v && String(v).trim().length > 0).map(v => String(v));
  if (nonEmpty.length === 0) return { field: null, score: 0 };
  const ratio = (n: number) => n / nonEmpty.length;

  // 1) Email
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailN = nonEmpty.filter(v => emailRe.test(v.trim())).length;
  if (ratio(emailN) >= 0.5) return { field: 'email', score: ratio(emailN) };

  // 2) Age / DOB — run BEFORE phone so "14-03-1995" is never a phone
  const dobN = nonEmpty.filter(v => isDateLike(v) || isAgeLike(v)).length;
  if (ratio(dobN) >= 0.6) return { field: 'age_or_dob', score: ratio(dobN) };

  // 3) State (Indian states / abbreviations)
  const stateN = nonEmpty.filter(v => isStateValue(v)).length;
  if (ratio(stateN) >= 0.5) return { field: 'state', score: ratio(stateN) };

  // 4) Gender
  const genderSet = new Set(['male','female','m','f','other','man','woman']);
  const genderN = nonEmpty.filter(v => genderSet.has(v.trim().toLowerCase())).length;
  if (ratio(genderN) >= 0.6) return { field: 'gender', score: ratio(genderN) };

  // 5) Instagram handle
  const igRe = /^@[\w.]{1,30}$/;
  const igN = nonEmpty.filter(v => igRe.test(v.trim())).length;
  if (ratio(igN) >= 0.5) return { field: 'instagram', score: ratio(igN) };

  // 6) Phone — strict, never date-shaped
  const phoneN = nonEmpty.filter(v => isPhoneLike(v)).length;
  if (ratio(phoneN) >= 0.6) return { field: 'phone', score: ratio(phoneN) };

  // 7) Name — mostly alphabetic, 2+ chars
  const nameRe = /^[a-zA-Z\u0900-\u097F\s\.\']{2,60}$/;
  const nameN = nonEmpty.filter(v => nameRe.test(v.trim())).length;
  const nameMultiWord = nonEmpty.filter(v => nameRe.test(v.trim()) && v.trim().includes(' ')).length;
  if (ratio(nameMultiWord) >= 0.4) return { field: 'name', score: ratio(nameMultiWord) };
  if (ratio(nameN) >= 0.7) return { field: 'name', score: ratio(nameN) };

  return { field: null, score: 0 };
}

// Returns mapping + confidence scores for required fields
function autoDetectMapping(columns: string[], allData: Record<string, string>[]): DetectionResult {
  const result: ReverseMapping = {};
  const used = new Set<string>();
  const confidence: Record<string, number> = { name: 0, phone: 0 };

  // Pass 1: header-name matching (case-insensitive, spaces stripped). Strong signal → score 1.0
  const norm = (s: string) => s.toLowerCase().replace(/[\s_\-]+/g, '');
  const headerPatterns: [keyof ColumnMapping, RegExp][] = [
    ['name', /^(full)?name$|^contactname$|^leadname$/],
    ['phone', /^(phone|mobile|contact|cell|whatsapp|number|phoneno|mobileno|phone1|mobile1)$/],
    ['phone2', /^(phone2|mobile2|altphone|alternatephone|secondaryphone|whatsapp2)$/],
    ['email', /^(email|emailid|mail|gmail)$/],
    ['address', /^(address|city|location|place|area|town|locality)$/],
    ['state', /^(state|province|region)$/],
    ['age_or_dob', /^(age|dob|birthdate|dateofbirth|birthday)$/],
    ['gender', /^(gender|sex)$/],
    ['instagram', /^(instagram|insta|ighandle|igusername)$/],
    ['profession', /^(profession|occupation|job|jobtitle|work|designation)$/],
  ];

  for (const col of columns) {
    const n = norm(col);
    for (const [field, regex] of headerPatterns) {
      if (!used.has(field) && regex.test(n)) {
        result[col] = field;
        used.add(field);
        if (field === 'name') confidence.name = 1;
        if (field === 'phone') confidence.phone = 1;
        break;
      }
    }
  }

  // Pass 2: looser header substring matching for misses
  const looseHeaders: [keyof ColumnMapping, RegExp][] = [
    ['name', /name/],
    ['phone', /phone|mobile|contact|whatsapp/],
    ['phone2', /phone.*2|alt.*phone|secondary/],
    ['email', /email|mail/],
    ['state', /state|province|region/],
    ['address', /address|city|location|town|locality|area/],
    ['age_or_dob', /age|dob|birth/],
    ['gender', /gender|sex/],
    ['instagram', /insta|\big\b/],
    ['profession', /profession|occupation|job|work/],
  ];
  for (const col of columns) {
    if (result[col]) continue;
    const lower = col.toLowerCase();
    for (const [field, regex] of looseHeaders) {
      if (!used.has(field) && regex.test(lower)) {
        result[col] = field;
        used.add(field);
        if (field === 'name' && confidence.name < 0.8) confidence.name = 0.8;
        if (field === 'phone' && confidence.phone < 0.8) confidence.phone = 0.8;
        break;
      }
    }
  }

  // Pass 3: data-shape detection for unmapped columns (uses ordered guess above)
  const sampleRows = allData.slice(0, 15);
  for (const col of columns) {
    if (result[col]) continue;
    const sampleValues = sampleRows.map(row => row[col] || '');
    const { field: guess, score } = guessFieldFromValues(sampleValues);
    if (!guess) {
      result[col] = null;
      continue;
    }
    // Safety: never let a date-like column become a phone
    if (guess === 'phone') {
      const dateLike = sampleValues.filter(v => v && isDateLike(String(v))).length;
      const nonEmpty = sampleValues.filter(v => v && String(v).trim()).length || 1;
      if (dateLike / nonEmpty >= 0.3) {
        result[col] = 'age_or_dob';
        if (!used.has('age_or_dob')) used.add('age_or_dob');
        continue;
      }
      if (!used.has('phone')) {
        result[col] = 'phone';
        used.add('phone');
        if (confidence.phone < score) confidence.phone = score;
      } else if (!used.has('phone2')) {
        result[col] = 'phone2';
        used.add('phone2');
      } else {
        result[col] = null;
      }
    } else if (!used.has(guess)) {
      result[col] = guess;
      used.add(guess);
      if (guess === 'name' && confidence.name < score) confidence.name = score;
    } else {
      result[col] = null;
    }
  }

  return { mapping: result, confidence: { name: confidence.name, phone: confidence.phone } };
}

const LAST_IMPORT_KEY = 'enarsia:last_import_cache:v1';

export function ImportExcelDialog({ onImport, open: controlledOpen, onOpenChange: controlledOnOpenChange, hideTrigger }: ImportExcelDialogProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen! : internalOpen;
  const setOpen = (v: boolean) => {
    if (isControlled) controlledOnOpenChange?.(v);
    else setInternalOpen(v);
  };

  const [sharedLeadsOpen, setSharedLeadsOpen] = useState(false);
  const { logBulkActivity } = useActivityLog();
  const navigate = useNavigate();
  const [step, setStep] = useState<'upload' | 'confirm' | 'mapping'>('upload');
  const [columns, setColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);
  const [fullData, setFullData] = useState<Record<string, string>[]>([]);
  const [reverseMapping, setReverseMapping] = useState<ReverseMapping>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const { isAtLimit, canAddLeads, remaining, incrementLeadCount, isPaid } = useLifetimeLeadLimit();
  const { checkLimit: checkDailyLimit, incrementCount: incrementDailyCount } = useDailyUploadLimit();

  // Resizable preview columns
  const [previewColumnWidths, setPreviewColumnWidths] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState(false);
  const resizingColumnRef = useRef<string | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  const handleResizeStart = useCallback((colIndex: number, clientX: number) => {
    const columnKey = `col_${colIndex}`;
    resizingColumnRef.current = columnKey;
    startXRef.current = clientX;
    startWidthRef.current = previewColumnWidths[columnKey] ?? 120;
    setIsResizing(true);
  }, [previewColumnWidths]);

  const handleResizeMove = useCallback((clientX: number) => {
    if (!resizingColumnRef.current) return;
    const delta = clientX - startXRef.current;
    const newWidth = Math.max(60, Math.min(300, startWidthRef.current + delta));
    setPreviewColumnWidths(prev => ({ ...prev, [resizingColumnRef.current!]: newWidth }));
  }, []);

  const handleResizeEnd = useCallback(() => {
    resizingColumnRef.current = null;
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => handleResizeMove(e.clientX);
    const onTouch = (e: TouchEvent) => { const t = e.touches[0]; if (t) handleResizeMove(t.clientX); };
    const onUp = () => handleResizeEnd();
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onTouch, { passive: true });
    document.addEventListener('touchend', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onTouch);
      document.removeEventListener('touchend', onUp);
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('upload');
    setColumns([]);
    setPreviewData([]);
    setFullData([]);
    setReverseMapping({});
    setError(null);
    setImportProgress(null);
    setPreviewColumnWidths({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && isAtLimit) {
      setShowLimitModal(true);
      return;
    }
    setOpen(isOpen);
    if (!isOpen) resetState();
  };

  // When dialog is externally opened (Fix column mapping), restore last cached import if any
  useEffect(() => {
    if (!open) return;
    if (step !== 'upload') return;
    if (!isControlled) return;
    try {
      const raw = localStorage.getItem(LAST_IMPORT_KEY);
      if (!raw) return;
      const cached = JSON.parse(raw) as { columns: string[]; data: Record<string, string>[] };
      if (cached?.columns?.length && cached?.data?.length) {
        const { mapping } = autoDetectMapping(cached.columns, cached.data);
        setColumns(cached.columns);
        setPreviewData(cached.data.slice(0, 5));
        setFullData(cached.data);
        setReverseMapping(mapping);
        setStep('mapping');
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json<(string | number | null)[]>(firstSheet, { header: 1, defval: '' });
      if (rawData.length === 0) { setError('The file appears to be empty'); return; }

      const maxCols = Math.max(...rawData.map(row => row.length));
      const firstRowData = rawData[0] || [];
      const usedNames = new Set<string>();
      const cols = Array.from({ length: maxCols }, (_, i) => {
        const sampleValue = firstRowData[i];
        const sampleText = sampleValue !== null && sampleValue !== undefined ? String(sampleValue).trim() : '';
        let baseName = sampleText.length > 0
          ? (sampleText.length > 40 ? sampleText.substring(0, 40) : sampleText)
          : `Col ${i + 1}`;
        let finalName = baseName, counter = 2;
        while (usedNames.has(finalName)) { finalName = `${baseName} (${counter})`; counter++; }
        usedNames.add(finalName);
        return finalName;
      });

      const jsonData: Record<string, string>[] = rawData
        .filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined))
        .map(row => {
          const obj: Record<string, string> = {};
          cols.forEach((col, i) => { obj[col] = row[i] !== null && row[i] !== undefined ? String(row[i]) : ''; });
          return obj;
        });

      if (jsonData.length === 0) { setError('The file appears to be empty'); return; }

      const { mapping, confidence } = autoDetectMapping(cols, jsonData);
      setColumns(cols);
      setPreviewData(jsonData.slice(0, 5));
      setFullData(jsonData);
      setReverseMapping(mapping);

      // Cache for "Fix column mapping" later
      try { localStorage.setItem(LAST_IMPORT_KEY, JSON.stringify({ columns: cols, data: jsonData })); } catch {}

      // Confidence-based flow: if Name + Phone confidently mapped, go to compact confirm
      const hasName = Object.values(mapping).includes('name');
      const hasPhone = Object.values(mapping).includes('phone');
      if (hasName && hasPhone && confidence.name >= 0.8 && confidence.phone >= 0.8) {
        setStep('confirm');
      } else {
        setStep('mapping');
      }
    } catch (err) {
      setError("Failed to parse file. Please ensure it's a valid Excel or CSV file.");
      console.error('File parse error:', err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getColumnWidth = (idx: number) => previewColumnWidths[`col_${idx}`] ?? 120;

  const handleImport = async () => {
    const mapping: ColumnMapping = {
      name: null, phone: null, phone2: null, email: null, address: null,
      age_or_dob: null, gender: null, instagram: null, profession: null,
    };
    for (const [col, field] of Object.entries(reverseMapping)) {
      if (field && field !== 'skip') mapping[field] = col;
    }
    if (!mapping.name || !mapping.phone) {
      setError('Name and Phone 1 must be mapped');
      setStep('mapping');
      return;
    }
    if (isAtLimit) { setShowLimitModal(true); return; }

    // Columns that aren't mapped to a template field → custom_fields
    const mappedSourceCols = new Set(
      Object.entries(reverseMapping).filter(([, f]) => f && f !== 'skip').map(([c]) => c)
    );
    const unmappedCols = columns.filter(c => !mappedSourceCols.has(c));

    setIsImporting(true);
    setError(null);
    setImportProgress({ current: 0, total: fullData.length });

    let skippedCount = 0;
    const prospects: Partial<Prospect>[] = [];

    fullData.forEach((row) => {
      const validation = validateImportedProspect(row, mapping.name!, mapping.phone!);
      if (!validation.valid) { skippedCount++; return; }

      const prospect: Partial<Prospect> & { custom_fields?: Record<string, string> } = {
        name: validation.name,
        phone: validation.phone,
      };

      if (mapping.phone2 && row[mapping.phone2]) (prospect as any).phone2 = sanitizeImportString(row[mapping.phone2], 20);
      if (mapping.address && row[mapping.address]) prospect.address = sanitizeImportString(row[mapping.address], 200);
      if (mapping.age_or_dob && row[mapping.age_or_dob]) (prospect as any).age_or_dob = sanitizeImportString(row[mapping.age_or_dob], 50);
      if (mapping.gender && row[mapping.gender]) (prospect as any).gender = sanitizeImportString(row[mapping.gender], 20);
      if (mapping.email && row[mapping.email]) prospect.email = sanitizeImportString(row[mapping.email], 200);
      if (mapping.instagram && row[mapping.instagram]) (prospect as any).instagram = sanitizeImportString(row[mapping.instagram], 100);
      if (mapping.profession && row[mapping.profession]) (prospect as any).profession = sanitizeImportString(row[mapping.profession], 100);

      // Capture all unmapped columns into custom_fields using original header as label
      const custom: Record<string, string> = {};
      for (const col of unmappedCols) {
        const v = row[col];
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          const label = col.length > 60 ? col.slice(0, 60) : col;
          custom[label] = sanitizeImportString(String(v), 500);
        }
      }
      if (Object.keys(custom).length > 0) prospect.custom_fields = custom;

      prospects.push(prospect);
    });

    if (prospects.length === 0) {
      setError('No valid leads found. Please check that Name and Phone columns have valid data.');
      setIsImporting(false); setImportProgress(null); return;
    }

    const dailyLimitCheck = await checkDailyLimit(prospects.length);
    if (!dailyLimitCheck.allowed) {
      setError(dailyLimitCheck.reason);
      setIsImporting(false); setImportProgress(null);
      if (dailyLimitCheck.limit_type === 'daily' || dailyLimitCheck.limit_type === 'total') setShowLimitModal(true);
      return;
    }

    if (!isPaid && !canAddLeads(prospects.length)) {
      setError(`Cannot import ${prospects.length} leads. You have ${remaining} leads remaining in your free plan. Upgrade to Pro for unlimited leads.`);
      setIsImporting(false); setImportProgress(null); setShowLimitModal(true);
      return;
    }

    const result = await onImport(prospects, (imported, total) => setImportProgress({ current: imported, total }));

    if (result.imported > 0) {
      await incrementLeadCount(result.imported);
      await incrementDailyCount(result.imported);
      await logBulkActivity('bulk_import', result.imported);
    }

    toast.success(`${result.imported} leads imported, ${result.skipped + skippedCount} rows skipped`);

    setIsImporting(false);
    setImportProgress(null);
    resetState();
    setOpen(false);

    // Navigate to Calling page after a confident one-tap import
    if (result.imported > 0) {
      try { navigate('/action'); } catch {}
    }
  };

  const nameCol = Object.entries(reverseMapping).find(([, f]) => f === 'name')?.[0];
  const phoneCol = Object.entries(reverseMapping).find(([, f]) => f === 'phone')?.[0];

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button data-import-trigger data-onboarding="import-btn" variant="outline" size="sm" className="h-9 gap-1.5 px-2.5 rounded-xl text-xs">
            <Upload className="h-4 w-4" />
            <span>Import</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' ? 'Import from Excel/CSV' : step === 'confirm' ? 'Ready to import' : 'Map Columns'}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center hover:border-primary/60 hover:bg-primary/5 transition-all cursor-pointer flex flex-col items-center gap-3"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-base font-semibold">Import from Excel / CSV</p>
                <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls, .csv — Tap to select file</p>
              </div>
            </div>

            <div className="flex gap-2.5 p-3 bg-muted/50 rounded-lg border border-border/50">
              <span className="text-lg shrink-0">📱</span>
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground/80">If your leads are on WhatsApp:</p>
                <ol className="list-decimal list-inside space-y-0.5 pl-0.5">
                  <li>Open the Excel file in WhatsApp</li>
                  <li>Save it to your phone (Files / Downloads)</li>
                  <li>Then select it here to import</li>
                </ol>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <button
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                onClick={() => { setOpen(false); setSharedLeadsOpen(true); }}
              >
                <Share2 className="h-4 w-4" />
                <span>Import from Shared Leads</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5 space-y-3">
              <div className="flex items-center gap-2 text-primary text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                Auto-detected
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-sm font-medium">Name</span>
                  </div>
                  <span className="text-xs text-muted-foreground truncate max-w-[55%]" title={nameCol}>{nameCol}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-sm font-medium">Phone</span>
                  </div>
                  <span className="text-xs text-muted-foreground truncate max-w-[55%]" title={phoneCol}>{phoneCol}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                {fullData.length} leads ready. Other columns (e.g. {columns.filter(c => !mappedColsFor(reverseMapping).has(c)).slice(0, 2).join(', ') || 'extra fields'}) will be saved as <span className="font-medium text-foreground/80">Extra details</span> on each lead.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep('mapping')}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              >
                Review mapping
              </button>
              <Button onClick={handleImport} disabled={isImporting} size="sm" className="min-w-[160px]">
                {isImporting && importProgress
                  ? `Importing ${importProgress.current}/${importProgress.total}`
                  : `Import ${fullData.length} leads`}
              </Button>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <div className="flex flex-col overflow-hidden" style={{ height: 'calc(90vh - 80px)', maxHeight: 'calc(90dvh - 80px)' }}>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 mb-3 flex-shrink-0">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                🤖 <span className="font-medium text-foreground/80">We auto-detected your columns.</span> Review and adjust if needed. <span className="font-medium">Name</span> and <span className="font-medium">Phone 1</span> are required. Any column set to <span className="font-medium">Skip</span> will be kept on the lead as an Extra detail.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 space-y-3 pr-1">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between flex-shrink-0">
                  <Label className="text-xs font-medium">Data Preview (first 3 rows)</Label>
                  <span className="text-xs text-muted-foreground">{columns.length} columns • Drag column edges to resize</span>
                </div>

                <div className="border border-border rounded-lg overflow-hidden max-h-[120px]">
                  <div className={cn("overflow-x-auto overflow-y-auto max-h-[120px]", isResizing && "select-none")}>
                    <table className="text-xs border-collapse w-max">
                      <thead className="bg-muted sticky top-0 z-10">
                        <tr>
                          {columns.map((col, idx) => {
                            const width = getColumnWidth(idx);
                            return (
                              <th key={idx} className="relative px-3 py-2 text-left font-medium whitespace-nowrap border-r border-border last:border-r-0 bg-muted" style={{ width: `${width}px`, minWidth: `${width}px` }}>
                                <span className="truncate block pr-2" title={col}>{col}</span>
                                <div
                                  className={cn("absolute top-0 right-0 h-full w-1 cursor-col-resize z-20 transition-colors duration-150 hover:bg-primary/50 active:bg-primary/70")}
                                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleResizeStart(idx, e.clientX); }}
                                  onTouchStart={(e) => { const touch = e.touches[0]; if (touch) handleResizeStart(idx, touch.clientX); }}
                                  style={{ touchAction: 'none' }}
                                >
                                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-muted-foreground/30 rounded-full hover:h-5 hover:bg-primary/60 transition-all" />
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.slice(0, 3).map((row, i) => (
                          <tr key={i} className={cn("border-t border-border", i % 2 === 1 && "bg-muted/30")}>
                            {columns.map((col, idx) => {
                              const width = getColumnWidth(idx);
                              return (
                                <td key={idx} className="px-3 py-2 whitespace-nowrap truncate border-r border-border last:border-r-0" style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}>
                                  {row[col] || '–'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground flex-shrink-0">Total: {fullData.length} rows to import</p>
              </div>

              <div className="flex-shrink-0 bg-muted/30 rounded-lg p-3 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground font-medium">Map Your Data</p>
                  <p className="text-xs text-muted-foreground">
                    {Object.values(reverseMapping).includes('name') && Object.values(reverseMapping).includes('phone') ? '✓ Ready' : 'Name & Phone required'}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {columns.map((col) => {
                    const sampleValue = previewData[0]?.[col] || '–';
                    const assignedFields = new Set(Object.values(reverseMapping).filter(v => v && v !== 'skip'));
                    return (
                      <div key={col} className="flex items-center gap-2 min-h-[36px]">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" title={col}>{col}</p>
                          <p className="text-[10px] text-muted-foreground truncate" title={sampleValue}>{sampleValue}</p>
                        </div>
                        <Select
                          value={reverseMapping[col] || '__skip__'}
                          onValueChange={(value) => setReverseMapping(prev => ({ ...prev, [col]: value === '__skip__' ? null : value as keyof ColumnMapping | 'skip' }))}
                        >
                          <SelectTrigger className="h-8 text-xs w-[120px] shrink-0 bg-background">
                            <SelectValue placeholder="Skip" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border z-50">
                            <SelectItem value="__skip__" className="text-muted-foreground text-xs">Skip (keep as extra)</SelectItem>
                            {APP_FIELDS.map((f) => (
                              <SelectItem
                                key={f.key}
                                value={f.key}
                                disabled={assignedFields.has(f.key) && reverseMapping[col] !== f.key}
                                className="text-xs"
                              >
                                {f.label}{f.required ? ' *' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 flex justify-between gap-2 pt-3 border-t border-border bg-card">
              <Button variant="outline" size="sm" onClick={resetState} className="min-w-[70px]">Back</Button>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={isImporting || !Object.values(reverseMapping).includes('name') || !Object.values(reverseMapping).includes('phone')}
                className="min-w-[120px]"
              >
                {isImporting && importProgress
                  ? `Importing ${importProgress.current} of ${importProgress.total}`
                  : `Import ${fullData.length} rows`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      <HardLimitModal forceOpen={showLimitModal} onClose={() => setShowLimitModal(false)} />
    </Dialog>

    <SharedLeadsDrawer open={sharedLeadsOpen} onOpenChange={setSharedLeadsOpen} closeOnImport />
    </>
  );
}

function mappedColsFor(rev: ReverseMapping): Set<string> {
  return new Set(Object.entries(rev).filter(([, f]) => f && f !== 'skip').map(([c]) => c));
}
