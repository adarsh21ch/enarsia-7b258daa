import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Prospect, FunnelStage, ActionTaken, FUNNEL_STAGES, ACTIONS } from '@/types/prospect';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { usePermissions } from '@/contexts/PermissionsContext';

interface ExportFunnelDataProps {
  prospects: Prospect[];
}

type FilterType = 'all' | FunnelStage | ActionTaken | 'enrolled' | 'not_enrolled';

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All Prospects' },
  ...FUNNEL_STAGES.map(stage => ({ value: stage as FilterType, label: `Stage: ${stage}` })),
  ...ACTIONS.map(action => ({ value: action as FilterType, label: `Action: ${action}` })),
  { value: 'enrolled', label: 'Enrolled Only' },
  { value: 'not_enrolled', label: 'Not Enrolled Only' },
];

export function ExportFunnelData({ prospects }: ExportFunnelDataProps) {
  const { checkFeature } = usePermissions();
  const isPro = checkFeature('export_data');
  const [filter, setFilter] = useState<FilterType>('all');
  const [exporting, setExporting] = useState(false);

  const getFilteredProspects = (): Prospect[] => {
    if (filter === 'all') return prospects;
    
    if (filter === 'enrolled') {
      return prospects.filter(p => 
        p.enrollment_status === 'Enrolled' || p.funnel_stage
      );
    }
    
    if (filter === 'not_enrolled') {
      return prospects.filter(p => 
        !p.enrollment_status || 
        p.enrollment_status === 'Not Enrolled' ||
        !p.funnel_stage
      );
    }

    // Check if it's a funnel stage
    if (FUNNEL_STAGES.includes(filter as FunnelStage)) {
      return prospects.filter(p => p.funnel_stage === filter);
    }

    // Check if it's an action
    if (ACTIONS.includes(filter as ActionTaken)) {
      return prospects.filter(p => p.action_taken === filter);
    }

    return prospects;
  };

  const getFilterLabel = (): string => {
    if (filter === 'all') return 'AllProspects';
    if (filter === 'enrolled') return 'Enrolled';
    if (filter === 'not_enrolled') return 'NotEnrolled';
    return filter.replace(/\s+/g, '');
  };

  const handleExport = async () => {
    if (!isPro) {
      toast.error('Upgrade to Pro to export data');
      return;
    }

    const filtered = getFilteredProspects();
    
    if (filtered.length === 0) {
      toast.error('No data to export. Apply filters first or add prospects.');
      return;
    }

    setExporting(true);

    try {
      // Prepare data for Excel
      const exportData = filtered.map(p => ({
        'Name': p.name || '',
        'Phone Number': p.phone || '',
        'Age': p.age_or_dob || '',
        'Gender': p.gender || '',
        'Address': p.address || '',
        'Enrollment Status': p.enrollment_status || (p.funnel_stage ? 'Enrolled' : 'Not Enrolled'),
        'Last Action': p.action_taken || 'No Action',
        'Last Action Date': p.updated_at ? format(new Date(p.updated_at), 'dd/MM/yyyy HH:mm') : '',
        'Call Status / Stage': p.funnel_stage || '',
        'Notes': p.notes || '',
        'Priority': p.priority || '',
        'Quality': p.prospect_status || '',
        'Profession': p.profession || '',
        'Instagram': p.instagram || '',
        'Date Added': p.date_added ? format(new Date(p.date_added), 'dd/MM/yyyy') : '',
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      ws['!cols'] = [
        { wch: 25 }, // Name
        { wch: 15 }, // Phone
        { wch: 10 }, // Age
        { wch: 10 }, // Gender
        { wch: 30 }, // Address
        { wch: 15 }, // Enrollment Status
        { wch: 20 }, // Last Action
        { wch: 18 }, // Last Action Date
        { wch: 15 }, // Call Status
        { wch: 40 }, // Notes
        { wch: 10 }, // Priority
        { wch: 10 }, // Quality
        { wch: 20 }, // Profession
        { wch: 20 }, // Instagram
        { wch: 12 }, // Date Added
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Contacts');

      // Generate filename
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      const filterLabel = getFilterLabel();
      const filename = `NevorAI_Contacts_${dateStr}_${filterLabel}.xlsx`;

      // Trigger download
      XLSX.writeFile(wb, filename);

      toast.success(`Exported ${filtered.length} contacts successfully!`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const filteredCount = getFilteredProspects().length;

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Export Data</h3>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          {isPro ? `${filteredCount} contacts` : '– contacts'}
        </span>
      </div>
      
      <p className="text-xs text-muted-foreground mb-4">
        Filter and download contact data as Excel file
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)} disabled={!isPro}>
          <SelectTrigger className="flex-1 h-10 bg-muted/50 border-border/50">
            <SelectValue placeholder="Select filter..." />
          </SelectTrigger>
          <SelectContent className="max-h-64 bg-popover border border-border">
            {FILTER_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-sm">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button 
          onClick={handleExport} 
          disabled={exporting || !isPro || filteredCount === 0}
          className="h-10 gap-2"
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export to Excel
            </>
          )}
        </Button>
      </div>

      {!isPro && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Upgrade to Pro to export data
        </p>
      )}
    </div>
  );
}
