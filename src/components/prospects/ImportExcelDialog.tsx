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

interface ImportExcelDialogProps {
  onImport: (prospects: Partial<Prospect>[]) => Promise<{ imported: number; skipped: number }>;
}

interface ColumnMapping {
  name: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  age_or_dob: string | null;
  gender: string | null;
  instagram: string | null;
  profession: string | null;
}

const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  name: 'Name *',
  phone: 'Phone *',
  city: 'Address (City)',
  state: 'Address (State)',
  age_or_dob: 'Age / DOB',
  gender: 'Gender',
  instagram: 'Instagram',
  profession: 'Profession',
};

export function ImportExcelDialog({ onImport }: ImportExcelDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping'>('upload');
  const [columns, setColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);
  const [fullData, setFullData] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: null,
    phone: null,
    city: null,
    state: null,
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
      city: null,
      state: null,
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

  const autoDetectMapping = (cols: string[]): ColumnMapping => {
    const newMapping: ColumnMapping = {
      name: null,
      phone: null,
      city: null,
      state: null,
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
      } else if ((lowerCol.includes('city') || lowerCol.includes('address')) && !newMapping.city) {
        newMapping.city = col;
      } else if (lowerCol.includes('state') && !newMapping.state) {
        newMapping.state = col;
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
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet, { defval: '' });

      if (jsonData.length === 0) {
        setError('The file appears to be empty');
        return;
      }

      const cols = Object.keys(jsonData[0]);
      setColumns(cols);
      setPreviewData(jsonData.slice(0, 5));
      setFullData(jsonData);
      setMapping(autoDetectMapping(cols));
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

      // Sanitize optional fields
      if (mapping.city && row[mapping.city]) {
        prospect.city = sanitizeImportString(row[mapping.city], 100);
      }
      if (mapping.state && row[mapping.state]) {
        prospect.state = sanitizeImportString(row[mapping.state], 100);
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

    const result = await onImport(prospects);
    toast.success(`${result.imported} prospects imported, ${result.skipped + skippedCount} rows skipped`);
    setIsImporting(false);
    resetState();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetState();
    }}>
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
              <Label className="text-xs">Preview (first 5 rows)</Label>
              <div className="border border-border rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      {columns.slice(0, 5).map((col) => (
                        <th key={col} className="px-2 py-1.5 text-left font-medium truncate max-w-[120px]">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        {columns.slice(0, 5).map((col) => (
                          <td key={col} className="px-2 py-1.5 truncate max-w-[120px]">
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
                {isImporting ? 'Importing...' : `Import ${fullData.length} rows`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
