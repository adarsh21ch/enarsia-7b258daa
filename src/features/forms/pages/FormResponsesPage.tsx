import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { SubmissionsSpreadsheetView } from '../components/SubmissionsSpreadsheetView';
import { useForms } from '../hooks/useForms';
import type { NevoraFormWithFields, SubmissionWithAnswers } from '../types';

export default function FormResponsesPage() {
  const { formId } = useParams<{ formId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { fetchFormWithFields, fetchSubmissions } = useForms();
  const [form, setForm] = useState<NevoraFormWithFields | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithAnswers[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user && !authLoading) navigate('/auth');
  }, [user, authLoading, navigate]);

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

  if (!user) return null;

  return (
    <div className="app-layout bg-background">
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/forms')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">{form?.title || 'Responses'}</h1>
            <p className="text-xs text-muted-foreground">{submissions.length} responses</p>
          </div>
        </div>
      </header>

      <main className="scrollable-content">
        <div className="container py-3 px-4 pb-20">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : form ? (
            <SubmissionsSpreadsheetView
              fields={form.fields}
              submissions={submissions}
              formTitle={form.title}
            />
          ) : (
            <p className="text-center text-muted-foreground py-12">Form not found</p>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
