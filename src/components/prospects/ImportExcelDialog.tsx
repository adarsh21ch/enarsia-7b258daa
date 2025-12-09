import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Prospect } from '@/types/prospect';
import { toast } from 'sonner';
import { sanitizeImportString, validateImportedProspect } from '@/lib/validations';
import { ProLimitModal } from './ProLimitModal';

interface ImportExcelDialogProps {
  onImport: (prospects: Partial<Prospect>[]) => Promise<{ imported: number; skipped: number }>;
  availableSlots?: number;
  isAtLimit?: boolean;
  currentCount?: number;
}

interface ColumnMapping {
  name: string | null;
  phone: string | null;
  address: string | null;
  age_or_dob: string | null;
  gender: string | null;
  instagram: string | null;
  profession: string | null;
}

const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  name: 'Name *',
  phone: 'Phone *',
  address: 'Address (City/State)',
  age_or_dob: 'Age / DOB',
  gender: 'Gender',
  instagram: 'Instagram',
  profession: 'Profession',
};

export function ImportExcelDialog({ onImport, availableSlots = Infinity, isAtLimit = false, currentCount }: ImportExcelDialogProps) {
  const [open, setOpen] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping'>('upload');
  const [columns, setColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);
  const [fullData, setFullData] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: null,
    phone: null,
    address: null,
    age_or_dob: null,
    gender: null,
    instagram: null,
    profession: null,
  });
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('upload');
    setColumns([]);
    setPreviewData([]);
    setFullData([]);
    setMapping({
      name: null,
      phone: null,
      address: null,
      age_or_dob: null,
      gender: null,
      instagram: null,
      profession: null,
    });
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && isAtLimit) {
      setShowLimitModal(true);
      return;
    }
    setOpen(isOpen);
    if (!isOpen) resetState();
  };

  const autoDetectMapping = (cols: string[]): ColumnMapping => {
    const newMapping: ColumnMapping = {
      name: null,
      phone: null,
      address: null,
      age_or_dob: null,
      gender: null,
      instagram: null,
      profession: null,
    };

    cols.forEach((col) => {
      const lowerCol = col.toLowerCase();
      if (lowerCol.includes('name') && !newMapping.name) {
        newMapping.name = col;
      } else if ((lowerCol.includes('phone') || lowerCol.includes('mobile') || lowerCol.includes('cell')) && !newMapping.phone) {
        newMapping.phone = col;
      } else if ((lowerCol.includes('address') || lowerCol.includes('location') || lowerCol.includes('city') || lowerCol.includes('state')) && !newMapping.address) {
        newMapping.address = col;
      } else if ((lowerCol.includes('age') || lowerCol.includes('dob') || lowerCol.includes('birth')) && !newMapping.age_or_dob) {
        newMapping.age_or_dob = col;
      } else if ((lowerCol.includes('gender') || lowerCol.includes('sex')) && !newMapping.gender) {
        newMapping.gender = col;
      } else if ((lowerCol.includes('instagram') || lowerCol.includes('insta') || lowerCol === 'ig') && !newMapping.instagram) {
        newMapping.instagram = col;
      } else if ((lowerCol.includes('profession') || lowerCol.includes('job') || lowerCol.includes('occupation') || lowerCol.includes('work')) && !newMapping.profession) {
        newMapping.profession = col;
      }
    });

    return newMapping;
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

      // Generate column names as "Column A", "Column B", etc.
      const maxCols = Math.max(...rawData.map(row => row.length));
      const cols = Array.from({ length: maxCols }, (_, i) => {
        const letter = String.fromCharCode(65 + (i % 26));
        const prefix = i >= 26 ? String.fromCharCode(65 + Math.floor(i / 26) - 1) : '';
        return `Column ${prefix}${letter}`;
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
      // Reset mapping since we now use generic column names
      setMapping({
        name: null,
        phone: null,
        address: null,
        age_or_dob: null,
        gender: null,
        instagram: null,
        profession: null,
      });
      setStep('mapping');
    } catch (err) {
      setError('Failed to parse file. Please ensure it\'s a valid Excel or CSV file.');
      console.error('File parse error:', err);
    }
  };

  const handleImport = async () => {
    if (!mapping.name || !mapping.phone) {
      setError('Name and Phone columns are required');
      return;
    }

    setIsImporting(true);
    setError(null);

    let skippedCount = 0;
    const prospects: Partial<Prospect>[] = [];

    fullData.forEach((row) => {
      // Validate and sanitize required fields
      const validation = validateImportedProspect(row, mapping.name!, mapping.phone!);
      
      if (!validation.valid) {
        skippedCount++;
        return;
      }

      const prospect: Partial<Prospect> & { age_or_dob?: string; gender?: string; instagram?: string; profession?: string } = {
        name: validation.name,
        phone: validation.phone,
      };

      // Handle address from single column
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
      setError('No valid prospects found. Please check that Name and Phone columns have valid data.');
      setIsImporting(false);
      return;
    }

    // Check if we have room for all prospects
    const prospectsToImport = availableSlots < Infinity 
      ? prospects.slice(0, availableSlots) 
      : prospects;
    
    const limitedCount = prospects.length - prospectsToImport.length;

    if (prospectsToImport.length === 0) {
      setShowLimitModal(true);
      setIsImporting(false);
      resetState();
      setOpen(false);
      return;
    }

    const result = await onImport(prospectsToImport);
    
    if (limitedCount > 0) {
      toast.success(`${result.imported} prospects imported. ${limitedCount} skipped due to free limit. Upgrade to Pro to import more.`);
    } else {
      toast.success(`${result.imported} prospects imported, ${result.skipped + skippedCount} rows skipped`);
    }
    
    setIsImporting(false);
    resetState();
    setOpen(false);
  };

  const importableCount = availableSlots < Infinity 
    ? Math.min(fullData.length, availableSlots) 
    : fullData.length;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <FileSpreadsheet className="h-4 w-4" />
            Import Excel
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
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
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports .xlsx, .xls, .csv files
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(mapping) as (keyof ColumnMapping)[]).map((field) => (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-xs">{FIELD_LABELS[field]}</Label>
                    <Select
                      value={mapping[field] || '__none__'}
                      onValueChange={(value) => setMapping({ ...mapping, [field]: value === '__none__' ? null : value })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select column..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        <SelectItem value="__none__">None</SelectItem>
                        {columns.map((col) => (
                          <SelectItem key={col} value={col} className="text-xs">
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Preview (first 5 rows) - Scroll horizontally to see all columns →</Label>
                <div className="border border-border rounded-lg overflow-x-auto max-h-[200px] overflow-y-auto relative">
                  <table className="text-xs min-w-max">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        {columns.map((col) => (
                          <th key={col} className="px-3 py-1.5 text-left font-medium whitespace-nowrap min-w-[100px]">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, i) => (
                        <tr key={i} className="border-t border-border">
                          {columns.map((col) => (
                            <td key={col} className="px-3 py-1.5 whitespace-nowrap min-w-[100px] max-w-[200px] truncate">
                              {row[col]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">
                  Total: {fullData.length} rows
                  {availableSlots < Infinity && availableSlots < fullData.length && (
                    <span className="text-amber-600"> (Only {importableCount} will be imported due to free limit)</span>
                  )}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={resetState}>
                  Back
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isImporting || !mapping.name || !mapping.phone}
                >
                  {isImporting ? 'Importing...' : `Import ${importableCount} rows`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ProLimitModal 
        open={showLimitModal} 
        onClose={() => setShowLimitModal(false)} 
        currentCount={currentCount}
      />
    </>
  );
}
