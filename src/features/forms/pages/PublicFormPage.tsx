import { useState, useEffect, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { FormFieldRenderer } from '../components/FormFieldRenderer';
import { useForms } from '../hooks/useForms';
import { validateAllFields, isFieldVisible, extractUTMParams } from '../utils/formUtils';
import { BRAND_NAME, PARENT_COMPANY_NAME } from '@/config/brand';
import nevoraiLogo from '@/assets/nevorai-call-logo.png';
import type { NevoraFormWithFields } from '../types';

function PublicFormShell({ children }: { children: ReactNode }) {
  return (
    <div className="public-page-layout bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-xl mx-auto px-4 py-6 sm:py-10 pb-16">{children}</div>
    </div>
  );
}

export default function PublicFormPage() {
  const { token } = useParams<{ token: string }>();
  const { fetchFormByToken, submitForm } = useForms();
  const [form, setForm] = useState<NevoraFormWithFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoading(true);
      const f = await fetchFormByToken(token);
      if (f) {
        setForm(f);
        if (!f.is_accepting) setClosed(true);
      }
      setLoading(false);
    };
    load();
  }, [token, fetchFormByToken]);

  const handleSubmit = async () => {
    if (!form || !token) return;
    const visibleFields = form.fields.filter(f => isFieldVisible(f, answers));
    const validationErrors = validateAllFields(visibleFields, answers, answers);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      // Scroll to first error
      const firstKey = Object.keys(validationErrors)[0];
      const el = document.querySelector(`[data-field-key="${firstKey}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    const utmData = extractUTMParams();
    const success = await submitForm(token, answers, undefined, utmData);
    setSubmitting(false);
    if (success) setSubmitted(true);
  };

  if (loading) {
    return (
      <PublicFormShell>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm text-muted-foreground">Loading form…</p>
        </div>
      </PublicFormShell>
    );
  }

  if (!form) {
    return (
      <PublicFormShell>
        <Card className="p-8 text-center rounded-2xl border-slate-200/70 dark:border-slate-800 shadow-sm">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Form Not Found</h1>
          <p className="text-muted-foreground text-sm">This form may have been deleted or the link is invalid.</p>
        </Card>
      </PublicFormShell>
    );
  }

  if (closed) {
    return (
      <PublicFormShell>
        <Card className="p-8 text-center rounded-2xl border-slate-200/70 dark:border-slate-800 shadow-sm">
          <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Form Closed</h1>
          <p className="text-muted-foreground text-sm">This form is no longer accepting responses.</p>
        </Card>
      </PublicFormShell>
    );
  }

  if (submitted) {
    return (
      <PublicFormShell>
        <Card className="p-10 text-center rounded-2xl border-emerald-200/70 dark:border-emerald-900/40 shadow-sm bg-gradient-to-b from-emerald-50/60 to-white dark:from-emerald-950/30 dark:to-slate-900">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-5">
            <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Thank you!</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {form.confirmation_message || 'Your response has been recorded successfully.'}
          </p>
        </Card>
      </PublicFormShell>
    );
  }

  return (
    <PublicFormShell>
      {/* Branded header */}
      <div className="flex items-center justify-center gap-2 mb-5">
        <img src={nevoraiLogo} alt={`${PARENT_COMPANY_NAME} logo`} className="h-8 w-8 rounded-lg object-contain" />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">{BRAND_NAME}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">by {PARENT_COMPANY_NAME}</span>
        </div>
      </div>

      {/* Title card */}
      <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 shadow-sm overflow-hidden mb-4">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500" />
        <div className="p-5 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold leading-tight">{form.title}</h1>
          {form.description && (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">
              {form.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-muted-foreground">
            <span className="text-destructive">*</span>
            <span>Indicates required field</span>
          </div>
        </div>
      </Card>

      {/* Fields */}
      <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 shadow-sm p-5 sm:p-6">
        {form.fields.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            This form has no questions yet.
          </p>
        ) : (
          <div className="space-y-6">
            {form.fields
              .filter(f => isFieldVisible(f, answers))
              .map((field, index) => (
                <div key={field.id || `${field.field_key}-${index}`} data-field-key={field.field_key}>
                  <FormFieldRenderer
                    field={field}
                    value={answers[field.field_key] || ''}
                    onChange={val => {
                      setAnswers(prev => ({ ...prev, [field.field_key]: val }));
                      if (errors[field.field_key]) {
                        setErrors(prev => {
                          const next = { ...prev };
                          delete next[field.field_key];
                          return next;
                        });
                      }
                    }}
                    error={errors[field.field_key]}
                  />
                </div>
              ))}
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={submitting || form.fields.length === 0}
          className="w-full mt-7 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Submitting…
            </>
          ) : (
            'Submit'
          )}
        </Button>
      </Card>

      {/* Footer trust line */}
      <div className="flex items-center justify-center gap-1.5 mt-5 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>Secured by Enarsia · Never submit passwords</span>
      </div>
    </PublicFormShell>
  );
}
