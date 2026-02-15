import { Phone, MessageCircle, ChevronRight, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import type { NevoraFormField, SubmissionWithAnswers } from '../types';

interface Props {
  fields: NevoraFormField[];
  submissions: SubmissionWithAnswers[];
  onViewDetail: (submission: SubmissionWithAnswers) => void;
}

export function SubmissionCardView({ fields, submissions, onViewDetail }: Props) {
  // Identify name/phone fields heuristically
  const nameField = fields.find(f => /name/i.test(f.label) || f.field_key === 'name');
  const phoneField = fields.find(f => /phone|mobile|whatsapp/i.test(f.label) || f.field_type === 'phone');
  const emailField = fields.find(f => /email/i.test(f.label) || f.field_type === 'email');
  const otherFields = fields.filter(f => f !== nameField && f !== phoneField && f !== emailField).slice(0, 2);

  const getVal = (s: SubmissionWithAnswers, field?: NevoraFormField) => {
    if (!field) return '';
    return s.answers.find(a => a.field_key === field.field_key)?.value || '';
  };

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        No responses yet
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {submissions.map((s, i) => {
        const name = getVal(s, nameField) || s.submitter_name || `Response #${i + 1}`;
        const phone = getVal(s, phoneField);
        const email = getVal(s, emailField);

        return (
          <div
            key={s.id}
            className="border border-blue-100/50 dark:border-blue-900/30 rounded-2xl bg-white/80 dark:bg-card/80 p-3.5 cursor-pointer hover:border-blue-300/60 dark:hover:border-blue-700/50 transition-all active:scale-[0.99]"
            onClick={() => onViewDetail(s)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate">{name}</h4>
                {phone && <p className="text-xs text-muted-foreground mt-0.5">{phone}</p>}
                {email && !phone && <p className="text-xs text-muted-foreground mt-0.5">{email}</p>}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5" />
            </div>

            {otherFields.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {otherFields.map(f => {
                  const val = getVal(s, f);
                  if (!val) return null;
                  return (
                    <span key={f.field_key} className="text-xs text-muted-foreground">
                      <span className="text-muted-foreground/60">{f.label}:</span> {val}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-blue-50/80 dark:border-blue-900/20">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(s.created_at), 'MMM d, h:mm a')}
              </span>
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                {phone && (
                  <>
                    <a href={`tel:${phone}`} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                      <Phone className="h-3.5 w-3.5 text-blue-500" />
                    </a>
                    <a href={`https://wa.me/${phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors">
                      <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
