import { useState, useRef, useCallback, useEffect } from 'react';
import { SharedLeadsDrawer } from '@/components/profile/SharedLeadsDrawer';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, AlertCircle, Share2 } from 'lucide-react';
import { Prospect } from '@/types/prospect';
import { toast } from 'sonner';
import { sanitizeImportString, validateImportedProspect } from '@/lib/validations';
import { cn } from '@/lib/utils';
import { useLifetimeLeadLimit } from '@/hooks/useLifetimeLeadLimit';
import { useDailyUploadLimit } from '@/hooks/useDailyUploadLimit';
import { HardLimitModal } from '@/components/subscription/HardLimitModal';
import { useActivityLog } from '@/hooks/useActivityLog';

interface ImportExcelDialogProps {
  onImport: (prospects: Partial<Prospect>[], onProgress?: (imported: number, total: number) => void) => Promise<{ imported: number; skipped: number }>;
}

interface ColumnMapping {
  name: string | null;
  phone: string | null;
  phone2: string | null;
  email: string | null;
  address: string | null;
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
  { key: 'address', label: 'Address' },
  { key: 'age_or_dob', label: 'Age / DOB' },
  { key: 'gender', label: 'Gender' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'profession', label: 'Profession' },
];

type ReverseMapping = Record<string, keyof ColumnMapping | 'skip' | null>;

// Smart detection: analyze SAMPLE DATA (not just headers) to guess field types
function guessFieldFromValues(values: string[]): keyof ColumnMapping | null {
  const nonEmpty = values.filter(v => v && v.trim().length > 0);
  if (nonEmpty.length === 0) return null;

  // Phone: 10+ digit numbers, may start with + or country code
  const phonePattern = /^[\+]?[\d\s\-\(\)]{7,15}$/;
  const phoneMatches = nonEmpty.filter(v => phonePattern.test(v.trim())).length;
  if (phoneMatches >= nonEmpty.length * 0.6) return 'phone';

  // Email
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailMatches = nonEmpty.filter(v => emailPattern.test(v.trim())).length;
  if (emailMatches >= nonEmpty.length * 0.5) return 'email';

  // Instagram: starts with @ or looks like username
  const igPattern = /^@[\w.]{1,30}$/;
  const igMatches = nonEmpty.filter(v => igPattern.test(v.trim())).length;
  if (igMatches >= nonEmpty.length * 0.5) return 'instagram';

  // Age: small numbers 1-120
  const agePattern = /^\d{1,3}$/;
  const ageMatches = nonEmpty.filter(v => {
    const n = parseInt(v.trim());
    return agePattern.test(v.trim()) && n >= 1 && n <= 120;
  }).length;
  if (ageMatches >= nonEmpty.length * 0.6) return 'age_or_dob';

  // DOB: date-like patterns
  const dobPattern = /^\d{1,4}[\-\/\.]\d{1,2}[\-\/\.]\d{1,4}$/;
  const dobMatches = nonEmpty.filter(v => dobPattern.test(v.trim())).length;
  if (dobMatches >= nonEmpty.length * 0.5) return 'age_or_dob';

  // Gender
  const genderValues = ['male', 'female', 'm', 'f', 'other', 'man', 'woman'];
  const genderMatches = nonEmpty.filter(v => genderValues.includes(v.trim().toLowerCase())).length;
  if (genderMatches >= nonEmpty.length * 0.5) return 'gender';

  // Name: 2+ words with letters, not too long
  const namePattern = /^[a-zA-Z\u0900-\u097F\s\.]{2,50}$/;
  const nameMatches = nonEmpty.filter(v => namePattern.test(v.trim()) && v.trim().includes(' ')).length;
  if (nameMatches >= nonEmpty.length * 0.4) return 'name';

  return null;
}

function autoDetectMapping(columns: string[], allData: Record<string, string>[]): ReverseMapping {
  const result: ReverseMapping = {};
  const used = new Set<string>();

  // First pass: header-based matching
  const headerPatterns: [keyof ColumnMapping, RegExp][] = [
    ['name', /\bname\b/i],
    ['phone', /phone\s*1|mobile|phone|contact/i],
    ['phone2', /phone\s*2|alt.*phone/i],
    ['email', /email|gmail|mail/i],
    ['address', /address|city|location|state/i],
    ['age_or_dob', /\bage\b|dob|birth/i],
    ['gender', /gender|sex/i],
    ['instagram', /insta|ig\b/i],
    ['profession', /profession|occupation|job/i],
  ];

  for (const col of columns) {
    const lower = col.toLowerCase();
    for (const [field, regex] of headerPatterns) {
      if (!used.has(field) && regex.test(lower)) {
        result[col] = field;
        used.add(field);
        break;
      }
    }
  }

  // Second pass: data-based detection for unmatched columns
  const sampleRows = allData.slice(0, 10);
  for (const col of columns) {
    if (result[col]) continue; // already matched by header
    const sampleValues = sampleRows.map(row => row[col] || '');
    const guess = guessFieldFromValues(sampleValues);
    if (guess && !used.has(guess)) {
      result[col] = guess;
      used.add(guess);
    } else {
      result[col] = null;
    }
  }

  return result;
}

export function ImportExcelDialog({ onImport }: ImportExcelDialogProps) {
  const [open, setOpen] = useState(false);
  const [sharedLeadsOpen, setSharedLeadsOpen] = useState(false);
  const { logBulkActivity } = useActivityLog();
  const [step, setStep] = useState<'upload' | 'mapping'>('upload');
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
  
  // Resizable columns state for preview table
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
    setPreviewColumnWidths(prev => ({
      ...prev,
      [resizingColumnRef.current!]: newWidth,
    }));
  }, []);

  const handleResizeEnd = useCallback(() => {
    resizingColumnRef.current = null;
    setIsResizing(false);
  }, []);

  // Global mouse/touch handlers for resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => handleResizeMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) handleResizeMove(touch.clientX);
    };
    const handleMouseUp = () => handleResizeEnd();
    const handleTouchEnd = () => handleResizeEnd();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    // Check lead limit BEFORE opening the dialog
    if (isOpen && isAtLimit) {
      setShowLimitModal(true);
      return; // Don't open the dialog
    }
    setOpen(isOpen);
    if (!isOpen) resetState();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Use header: 1 to get raw array data (no row is treated as header)
      const rawData = XLSX.utils.sheet_to_json<(string | number | null)[]>(firstSheet, { 
        header: 1, 
        defval: '' 
      });

      if (rawData.length === 0) {
        setError('The file appears to be empty');
        return;
      }

      // Generate column names using first row sample data for better readability
      const maxCols = Math.max(...rawData.map(row => row.length));
      const firstRowData = rawData[0] || [];
      const cols = Array.from({ length: maxCols }, (_, i) => {
        const sampleValue = firstRowData[i];
        const sampleText = sampleValue !== null && sampleValue !== undefined ? String(sampleValue).trim() : '';
        // Use truncated sample data as label, fallback to generic if empty
        if (sampleText.length > 0) {
          return sampleText.length > 20 ? sampleText.substring(0, 20) + '...' : sampleText;
        }
        return `Col ${i + 1}`;
      });
      
      // Convert raw array data to objects with column keys
      const jsonData: Record<string, string>[] = rawData
        .filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined))
        .map(row => {
          const obj: Record<string, string> = {};
          cols.forEach((col, i) => {
            obj[col] = row[i] !== null && row[i] !== undefined ? String(row[i]) : '';
          });
          return obj;
        });

      if (jsonData.length === 0) {
        setError('The file appears to be empty');
        return;
      }

      setColumns(cols);
      setPreviewData(jsonData.slice(0, 5));
      setFullData(jsonData);
      setReverseMapping(autoDetectMapping(cols));
      setStep('mapping');
    } catch (err) {
      setError('Failed to parse file. Please ensure it\'s a valid Excel or CSV file.');
      console.error('File parse error:', err);
    } finally {
      // Always clear input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getColumnWidth = (idx: number) => previewColumnWidths[`col_${idx}`] ?? 120;

  const handleImport = async () => {
    // Convert reverseMapping to ColumnMapping
    const mapping: ColumnMapping = {
      name: null, phone: null, phone2: null, address: null,
      age_or_dob: null, gender: null, instagram: null, profession: null,
    };
    for (const [col, field] of Object.entries(reverseMapping)) {
      if (field && field !== 'skip') {
        mapping[field] = col;
      }
    }

    if (!mapping.name || !mapping.phone) {
      setError('Name and Phone 1 must be mapped');
      return;
    }

    // Check lifetime lead limit before importing
    if (isAtLimit) {
      setShowLimitModal(true);
      return;
    }

    setIsImporting(true);
    setError(null);
    setImportProgress({ current: 0, total: fullData.length });

    let skippedCount = 0;
    const prospects: Partial<Prospect>[] = [];

    fullData.forEach((row) => {
      const validation = validateImportedProspect(row, mapping.name!, mapping.phone!);
      
      if (!validation.valid) {
        skippedCount++;
        return;
      }

      const prospect: Partial<Prospect> & { age_or_dob?: string; gender?: string; instagram?: string; profession?: string; phone2?: string } = {
        name: validation.name,
        phone: validation.phone,
      };

      if (mapping.phone2 && row[mapping.phone2]) {
        prospect.phone2 = sanitizeImportString(row[mapping.phone2], 20);
      }
      if (mapping.address && row[mapping.address]) {
        prospect.address = sanitizeImportString(row[mapping.address], 200);
      }
      if (mapping.age_or_dob && row[mapping.age_or_dob]) {
        prospect.age_or_dob = sanitizeImportString(row[mapping.age_or_dob], 50);
      }
      if (mapping.gender && row[mapping.gender]) {
        prospect.gender = sanitizeImportString(row[mapping.gender], 20);
      }
      if (mapping.instagram && row[mapping.instagram]) {
        prospect.instagram = sanitizeImportString(row[mapping.instagram], 100);
      }
      if (mapping.profession && row[mapping.profession]) {
        prospect.profession = sanitizeImportString(row[mapping.profession], 100);
      }

      prospects.push(prospect);
    });

    if (prospects.length === 0) {
      setError('No valid leads found. Please check that Name and Phone columns have valid data.');
      setIsImporting(false);
      setImportProgress(null);
      return;
    }

    // Check daily upload limit (backend enforcement - respects admin config)
    const dailyLimitCheck = await checkDailyLimit(prospects.length);
    if (!dailyLimitCheck.allowed) {
      setError(dailyLimitCheck.reason);
      setIsImporting(false);
      setImportProgress(null);
      // Show upgrade modal if limit type is daily or total
      if (dailyLimitCheck.limit_type === 'daily' || dailyLimitCheck.limit_type === 'total') {
        setShowLimitModal(true);
      }
      return;
    }

    // Check if importing would exceed lifetime limit (for free users)
    if (!isPaid && !canAddLeads(prospects.length)) {
      setError(`Cannot import ${prospects.length} leads. You have ${remaining} leads remaining in your free plan. Upgrade to Pro for unlimited leads.`);
      setIsImporting(false);
      setImportProgress(null);
      setShowLimitModal(true);
      return;
    }

    // Import with progress callback
    const result = await onImport(prospects, (imported, total) => {
      setImportProgress({ current: imported, total });
    });
    
    // Increment counters after successful import
    if (result.imported > 0) {
      await incrementLeadCount(result.imported);
      await incrementDailyCount(result.imported);
      // Log SINGLE bulk import activity (not individual entries)
      await logBulkActivity('bulk_import', result.imported);
    }
    
    toast.success(`${result.imported} leads imported, ${result.skipped + skippedCount} rows skipped`);
    
    setIsImporting(false);
    setImportProgress(null);
    resetState();
    setOpen(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button data-import-trigger variant="outline" size="sm" className="h-9 gap-1.5 px-2.5 rounded-xl text-xs">
          <Upload className="h-4 w-4" />
          <span>Import</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' ? 'Import from Excel/CSV' : 'Map Columns'}
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
            {/* Primary: Excel/CSV upload - large prominent area */}
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

            {/* WhatsApp guidance */}
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

             {/* Secondary: Shared Leads - opens drawer */}
            <div className="border-t border-border pt-3">
              <button
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                onClick={() => {
                  setOpen(false);
                  setSharedLeadsOpen(true);
                }}
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

        {step === 'mapping' && (
          <div className="flex flex-col h-[65vh] max-h-[550px] overflow-hidden">
            {/* Data Preview Section - Top, scrollable */}
            <div className="flex-1 flex flex-col min-h-0 space-y-2 mb-3 overflow-hidden">
              <div className="flex items-center justify-between flex-shrink-0">
                <Label className="text-xs font-medium">Data Preview (first 3 rows)</Label>
                <span className="text-xs text-muted-foreground">{columns.length} columns • Drag column edges to resize</span>
              </div>
              
              {/* Preview table container - scrollable both ways */}
              <div className="flex-1 border border-border rounded-lg overflow-hidden min-h-[80px]">
                <div className={cn("h-full overflow-x-auto overflow-y-auto", isResizing && "select-none")}>
                  <table className="text-xs border-collapse w-max">
                    <thead className="bg-muted sticky top-0 z-10">
                      <tr>
                        {columns.map((col, idx) => {
                          const width = getColumnWidth(idx);
                          return (
                            <th 
                              key={idx} 
                              className="relative px-3 py-2 text-left font-medium whitespace-nowrap border-r border-border last:border-r-0 bg-muted"
                              style={{ width: `${width}px`, minWidth: `${width}px` }}
                            >
                              <span className="truncate block pr-2" title={col}>{col}</span>
                              {/* Resize handle */}
                              <div
                                className={cn(
                                  "absolute top-0 right-0 h-full w-1 cursor-col-resize z-20",
                                  "transition-colors duration-150",
                                  "hover:bg-primary/50 active:bg-primary/70"
                                )}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleResizeStart(idx, e.clientX);
                                }}
                                onTouchStart={(e) => {
                                  const touch = e.touches[0];
                                  if (touch) {
                                    handleResizeStart(idx, touch.clientX);
                                  }
                                }}
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
                              <td 
                                key={idx} 
                                className="px-3 py-2 whitespace-nowrap truncate border-r border-border last:border-r-0"
                                style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
                              >
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
              
              <p className="text-xs text-muted-foreground flex-shrink-0">
                Total: {fullData.length} rows to import
              </p>
            </div>

            {/* Reversed Column Mapping Section - Source data on left, app field dropdown on right */}
            <div className="flex-shrink-0 bg-muted/30 rounded-lg p-3 border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium">
                  Map Your Data
                </p>
                <p className="text-xs text-muted-foreground">
                  {Object.values(reverseMapping).filter(v => v === 'name').length > 0 && Object.values(reverseMapping).filter(v => v === 'phone').length > 0 ? '✓ Ready' : 'Name & Phone required'}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {columns.map((col) => {
                  const sampleValue = previewData[0]?.[col] || '–';
                  const assignedFields = new Set(Object.values(reverseMapping).filter(v => v && v !== 'skip'));
                  return (
                    <div key={col} className="flex items-center gap-2 min-h-[36px]">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" title={sampleValue}>{sampleValue}</p>
                      </div>
                      <Select
                        value={reverseMapping[col] || '__skip__'}
                        onValueChange={(value) => setReverseMapping(prev => ({ ...prev, [col]: value === '__skip__' ? null : value as keyof ColumnMapping | 'skip' }))}
                      >
                        <SelectTrigger className="h-8 text-xs w-[120px] shrink-0 bg-background">
                          <SelectValue placeholder="Skip" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border z-50">
                          <SelectItem value="__skip__" className="text-muted-foreground text-xs">Skip</SelectItem>
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

            {/* Fixed Action Buttons at bottom - always visible */}
            <div className="flex-shrink-0 flex justify-between gap-2 pt-3 mt-auto border-t border-border bg-card">
              <Button variant="outline" size="sm" onClick={resetState} className="min-w-[70px]">
                Back
              </Button>
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
      
      {/* Hard Limit Modal - shown when user hits the limit */}
      <HardLimitModal 
        forceOpen={showLimitModal} 
        onClose={() => setShowLimitModal(false)} 
      />
    </Dialog>

    <SharedLeadsDrawer
      open={sharedLeadsOpen}
      onOpenChange={setSharedLeadsOpen}
      closeOnImport
    />
    </>
  );
}