import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Download, FileSpreadsheet, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExportDialog } from '@/components/export/ExportDialog';
import { useGlobalProspects } from '@/contexts/ProspectsContext';
import { useSheets } from '@/hooks/useSheets';

export default function ExportData() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { prospects } = useGlobalProspects();
  const { sheets } = useSheets();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-md hover:bg-muted/60">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold text-base">Export My Data</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-base">Download a full backup</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Export your leads as an Excel file. Split by sheet, month, week, or download everything as one combined file. Includes the last response and date for each lead.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-muted/40 p-3">
              <div className="text-xl font-bold">{prospects.length}</div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Total Leads</div>
            </div>
            <div className="rounded-xl bg-muted/40 p-3">
              <div className="text-xl font-bold">{sheets.length}</div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Sheets</div>
            </div>
          </div>

          <Button onClick={() => setOpen(true)} className="w-full mt-5 gap-2" size="lg">
            <Download className="h-4 w-4" />
            Open Export Options
          </Button>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Multi-tab Excel.</span> When you split by month or week, each period becomes its own tab inside one .xlsx file — kept in order so you can scroll through your history.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Your data, anytime.</span> Files are generated on your device and downloaded directly — nothing is uploaded or stored on our servers.
            </div>
          </div>
        </div>
      </main>

      <ExportDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
