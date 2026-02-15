import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowLeft, Loader2, FileSpreadsheet, Download, LayoutGrid, Table2, Search, X, MoreVertical } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { SubmissionsSpreadsheetView } from '../components/SubmissionsSpreadsheetView';
import { SubmissionCardView } from '../components/SubmissionCardView';
import { SubmissionDetailDrawer } from '../components/SubmissionDetailDrawer';
import { useForms } from '../hooks/useForms';
import { format, isToday, isThisWeek } from 'date-fns';
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

  const todayCount = useMemo(() => submissions.filter(s => isToday(new Date(s.created_at))).length, [submissions]);
  const weekCount = useMemo(() => submissions.filter(s => isThisWeek(new Date(s.created_at))).length, [submissions]);

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
        <div className="max-w-6xl mx-auto pt-3 px-3 sm:px-4 pb-20">
          {/* Back */}
          <button
            onClick={() => navigate('/forms')}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Forms
          </button>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : form ? (
            <>
              {/* Compact header row */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <h1 className="text-base font-bold truncate">{form.title}</h1>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">{filtered.length} responses</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* View toggle */}
                  <div className="flex items-center rounded-lg border border-blue-200/60 dark:border-blue-800/40 overflow-hidden">
                    <button
                      onClick={() => setViewMode('card')}
                      className={`p-1.5 transition-colors ${viewMode === 'card' ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:bg-muted/50'}`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 transition-colors ${viewMode === 'table' ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:bg-muted/50'}`}
                    >
                      <Table2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Export 3-dot menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={exportCSV}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" /> Export CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportXLSX}>
                        <Download className="h-4 w-4 mr-2" /> Export Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Stats bar (desktop) */}
              {!isMobile && (
                <div className="flex items-center gap-4 mb-3 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50/80 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium border border-blue-100/60 dark:border-blue-800/40">
                    Total: {submissions.length}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-100/60 dark:border-emerald-800/40">
                    Today: {todayCount}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-orange-50/80 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 font-medium border border-orange-100/60 dark:border-orange-800/40">
                    This Week: {weekCount}
                  </span>
                </div>
              )}

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search name, phone, answers..."
                  className="w-full h-8 pl-8 pr-8 bg-muted/40 rounded-lg border border-blue-100/40 dark:border-blue-900/30 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-blue-400/60 focus:ring-1 focus:ring-blue-400/20 transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted">
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
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
