import { Phone, MessageCircle, ChevronRight, Calendar, MoreVertical, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { NevoraFormField, SubmissionWithAnswers } from '../types';

interface Props {
  fields: NevoraFormField[];
  submissions: SubmissionWithAnswers[];
  onViewDetail: (submission: SubmissionWithAnswers) => void;
  onDelete?: (id: string) => void;
}

export function SubmissionCardView({ fields, submissions, onViewDetail, onDelete }: Props) {
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
    <div className="space-y-2">
      {submissions.map((s, i) => {
        const name = getVal(s, nameField) || s.submitter_name || `Response #${i + 1}`;
        const phone = getVal(s, phoneField);
        const email = getVal(s, emailField);

        return (
          <div
            key={s.id}
            className="border border-blue-100/50 dark:border-blue-900/30 rounded-xl bg-card shadow-sm shadow-blue-50/60 dark:shadow-none p-3 cursor-pointer hover:border-blue-300/60 dark:hover:border-blue-700/50 transition-all active:scale-[0.99]"
            onClick={() => onViewDetail(s)}
          >
            {/* Top row: name + 3-dot menu */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-sm truncate">{name}</h4>
                {(phone || email) && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{phone || email}</p>
                )}
              </div>
              <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded-md hover:bg-muted/60 transition-colors">
                      <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewDetail(s)}>
                      <ChevronRight className="h-3.5 w-3.5 mr-2" /> View Details
                    </DropdownMenuItem>
                    {onDelete && (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(s.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Extra fields */}
            {otherFields.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                {otherFields.map(f => {
                  const val = getVal(s, f);
                  if (!val) return null;
                  return (
                    <span key={f.field_key} className="text-[11px] text-muted-foreground">
                      <span className="text-muted-foreground/50">{f.label}:</span> {val}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Footer: date left, actions right */}
            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-blue-50/80 dark:border-blue-900/20">
              <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                <Calendar className="h-2.5 w-2.5" />
                {format(new Date(s.created_at), 'MMM d, h:mm a')}
              </span>
              <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                {phone && (
                  <>
                    <a href={`tel:${phone}`} className="p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                      <Phone className="h-3.5 w-3.5 text-blue-500" />
                    </a>
                    <a href={`https://wa.me/${phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-1 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors">
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
