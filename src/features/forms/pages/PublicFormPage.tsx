import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { FormFieldRenderer } from '../components/FormFieldRenderer';
import { useForms } from '../hooks/useForms';
import { validateAllFields, isFieldVisible, extractUTMParams } from '../utils/formUtils';
import type { NevoraFormWithFields } from '../types';

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
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    const utmData = extractUTMParams();
    const success = await submitForm(token, answers, undefined, utmData);
    setSubmitting(false);
    if (success) setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 text-center max-w-md">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Form Not Found</h1>
          <p className="text-muted-foreground">This form may have been deleted or the link is invalid.</p>
        </Card>
      </div>
    );
  }

  if (closed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 text-center max-w-md">
          <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Form Closed</h1>
          <p className="text-muted-foreground">This form is no longer accepting responses.</p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 text-center max-w-md">
          <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Submitted!</h1>
          <p className="text-muted-foreground">{form.confirmation_message || 'Thank you for your submission!'}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{form.title}</h1>
          {form.description && <p className="text-muted-foreground mt-1">{form.description}</p>}
        </div>

        <div className="space-y-5">
          {form.fields
            .filter(f => isFieldVisible(f, answers))
            .map(field => (
              <FormFieldRenderer
                key={field.field_key}
                field={field}
                value={answers[field.field_key] || ''}
                onChange={val => setAnswers(prev => ({ ...prev, [field.field_key]: val }))}
                error={errors[field.field_key]}
              />
            ))}
        </div>

        <Button onClick={handleSubmit} disabled={submitting} className="w-full mt-6">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Submit
        </Button>
      </div>
    </div>
  );
}
