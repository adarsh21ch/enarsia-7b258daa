import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import type { NevoraFormField, SubmissionWithAnswers } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: SubmissionWithAnswers | null;
  fields: NevoraFormField[];
  onDelete?: (id: string) => void;
}

export function SubmissionDetailDrawer({ open, onOpenChange, submission, fields, onDelete }: Props) {
  if (!submission) return null;

  const phoneField = fields.find(f => /phone|mobile|whatsapp/i.test(f.label) || f.field_type === 'phone');
  const phone = phoneField ? submission.answers.find(a => a.field_key === phoneField.field_key)?.value : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-3 border-b border-border/50">
          <SheetTitle className="text-base">Submission Details</SheetTitle>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(submission.created_at), 'MMM d, yyyy · h:mm a')}
          </p>
        </SheetHeader>

        <div className="space-y-3 py-4">
          {fields.map(f => {
            const answer = submission.answers.find(a => a.field_key === f.field_key);
            const val = answer?.value || '-';
            return (
              <div key={f.field_key} className="space-y-0.5">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{f.label}</label>
                <p className="text-sm">{val}</p>
              </div>
            );
          })}
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-border/50">
          {phone && (
            <>
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5 flex-1" asChild>
                <a href={`tel:${phone}`}><Phone className="h-3.5 w-3.5" /> Call</a>
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5 flex-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50" asChild>
                <a href={`https://wa.me/${phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              </Button>
            </>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => { onDelete(submission.id); onOpenChange(false); }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
