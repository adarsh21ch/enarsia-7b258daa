import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, FileSpreadsheet, Download, LayoutGrid, Table2, Search, X } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { SubmissionsSpreadsheetView } from '../components/SubmissionsSpreadsheetView';
import { SubmissionCardView } from '../components/SubmissionCardView';
import { SubmissionDetailDrawer } from '../components/SubmissionDetailDrawer';
import { useForms } from '../hooks/useForms';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import type { NevoraFormWithFields, SubmissionWithAnswers } from '../types';

export default function FormResponsesPage() {
  const { formId } = useParams<{ formId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { fetchFormWithFields, fetchSubmissions } = useForms();
  const [form, setForm] = useState<NevoraFormWithFields | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithAnswers[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailSub, setDetailSub] = useState<SubmissionWithAnswers | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (!user && !authLoading) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    setViewMode(isMobile ? 'card' : 'table');
  }, [isMobile]);

  useEffect(() => {
    if (!formId || !user) return;
    const load = async () => {
      setLoading(true);
      const [f, s] = await Promise.all([
        fetchFormWithFields(formId),
        fetchSubmissions(formId),
      ]);
      setForm(f);
      setSubmissions(s);
      setLoading(false);
    };
    load();
  }, [formId, user, fetchFormWithFields, fetchSubmissions]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return submissions;
    const q = searchQuery.toLowerCase();
    return submissions.filter(s =>
      s.answers.some(a => (a.value || '').toLowerCase().includes(q)) ||
      (s.submitter_name || '').toLowerCase().includes(q)
    );
  }, [submissions, searchQuery]);

  const exportCSV = () => {
    if (!form) return;
    const headers = [...form.fields.map(f => f.label), 'Date & Time'];
    const rows = filtered.map(s => {
      const row: string[] = form.fields.map(f => {
        const a = s.answers.find(ans => ans.field_key === f.field_key);
        return a?.value || '';
      });
      row.push(format(new Date(s.created_at), 'yyyy-MM-dd HH:mm'));
      return row;
    });
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.title}_responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportXLSX = () => {
    if (!form) return;
    const headers = [...form.fields.map(f => f.label), 'Date & Time'];
    const rows = filtered.map(s => {
      const row: string[] = form.fields.map(f => {
        const a = s.answers.find(ans => ans.field_key === f.field_key);
        return a?.value || '';
      });
      row.push(format(new Date(s.created_at), 'yyyy-MM-dd HH:mm'));
      return row;
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Responses');
    XLSX.writeFile(wb, `${form.title}_responses.xlsx`);
  };

  const openDetail = (s: SubmissionWithAnswers) => {
    setDetailSub(s);
    setDetailOpen(true);
  };

  if (!user) return null;

  return (
    <div className="app-layout bg-background">
      <main className="scrollable-content">
        <div className="max-w-6xl mx-auto py-4 px-4 pb-20">
          {/* Back link */}
          <button
            onClick={() => navigate('/forms')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Forms
          </button>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : form ? (
            <>
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-lg font-bold">{form.title}</h1>
                  <p className="text-xs text-muted-foreground">{filtered.length} responses</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* View toggle */}
                  <div className="flex items-center border border-border/50 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setViewMode('card')}
                      className={`p-1.5 transition-colors ${viewMode === 'card' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600' : 'text-muted-foreground hover:bg-muted/50'}`}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 transition-colors ${viewMode === 'table' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600' : 'text-muted-foreground hover:bg-muted/50'}`}
                    >
                      <Table2 className="h-4 w-4" />
                    </button>
                  </div>
                  <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1 h-8 text-xs">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportXLSX} className="gap-1 h-8 text-xs">
                    <Download className="h-3.5 w-3.5" /> Excel
                  </Button>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search name, phone, answers..."
                  className="w-full h-9 pl-9 pr-9 bg-muted/50 rounded-lg border border-border/30 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Content */}
              {viewMode === 'card' ? (
                <SubmissionCardView
                  fields={form.fields}
                  submissions={filtered}
                  onViewDetail={openDetail}
                />
              ) : (
                <SubmissionsSpreadsheetView
                  fields={form.fields}
                  submissions={filtered}
                  formTitle={form.title}
                />
              )}

              <SubmissionDetailDrawer
                open={detailOpen}
                onOpenChange={setDetailOpen}
                submission={detailSub}
                fields={form.fields}
              />
            </>
          ) : (
            <p className="text-center text-muted-foreground py-12">Form not found</p>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
