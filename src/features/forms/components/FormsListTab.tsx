import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Trash2, Share2, MoreHorizontal, Edit, Eye, FileText, MessageCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ShareFormDialog } from './ShareFormDialog';
import { useForms } from '../hooks/useForms';
import { format } from 'date-fns';
import type { NevoraFormWithFields } from '../types';

interface Props {
  onEdit: (form: NevoraFormWithFields) => void;
}

export function FormsListTab({ onEdit }: Props) {
  const navigate = useNavigate();
  const { forms, loading, fetchForms, duplicateForm, deleteForm, getShareToken, getShareUrl } = useForms();
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareTitle, setShareTitle] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  useEffect(() => {
    if (forms.length === 0) return;
    const fetchCounts = async () => {
      const { getSubmissionCount } = useForms();
      const newCounts: Record<string, number> = {};
      await Promise.all(forms.map(async f => {
        newCounts[f.id] = await getSubmissionCount(f.id);
      }));
      setCounts(newCounts);
    };
    fetchCounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forms.length]);

  const copyToClipboard = async (url: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        return true;
      }
    } catch { /* fall through */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const handleShareCopy = async (form: NevoraFormWithFields) => {
    const token = await getShareToken(form.id);
    if (!token) {
      toast.error('Could not generate share link');
      return;
    }
    const url = getShareUrl(token);
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedId(form.id);
      toast.success('Form link copied!');
      setTimeout(() => setCopiedId(prev => (prev === form.id ? null : prev)), 2000);
    } else {
      toast.error('Could not copy. Try the Share menu.');
    }
  };

  const handleShareModal = async (form: NevoraFormWithFields) => {
    const token = await getShareToken(form.id);
    if (token) {
      setShareUrl(getShareUrl(token));
      setShareTitle(form.title);
      setShareOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (forms.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mb-3">
          <FileText className="h-6 w-6 text-blue-400" />
        </div>
        <p className="text-muted-foreground font-medium">No forms yet</p>
        <p className="text-xs text-muted-foreground">Switch to "Create Form" tab to build your first form</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {forms.map(form => (
          <div
            key={form.id}
            className="border border-blue-100/50 dark:border-blue-900/30 rounded-2xl bg-white/80 dark:bg-card/80 shadow-sm shadow-blue-100/40 dark:shadow-blue-900/20 p-4 cursor-pointer hover:border-blue-300/60 dark:hover:border-blue-700/50 transition-all active:scale-[0.99]"
            onClick={() => navigate(`/forms/${form.id}/responses`)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{form.title}</h3>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600 bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:bg-orange-950/30">
                    {form.form_type || 'Custom'}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${form.is_accepting
                      ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950/30'
                      : 'border-red-300 text-red-600 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950/30'
                    }`}
                  >
                    {form.is_accepting ? 'Active' : 'Closed'}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30" onClick={() => handleShareCopy(form)}>
                  <Share2 className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(form)}>
                      <Edit className="h-4 w-4 mr-2" /> Edit Form
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/forms/${form.id}/responses`)}>
                      <Eye className="h-4 w-4 mr-2" /> View Responses
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShareModal(form)}>
                      <MessageCircle className="h-4 w-4 mr-2" /> Share Options
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicateForm(form.id)}>
                      <Copy className="h-4 w-4 mr-2" /> Duplicate
                    </DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{form.title}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the form, all fields, submissions, and responses.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteForm(form.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-blue-50/80 dark:border-blue-900/20">
              <span className="text-xs text-muted-foreground">
                {format(new Date(form.created_at), 'MMM d, yyyy')}
              </span>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                {counts[form.id] !== undefined ? `${counts[form.id]} responses` : '...'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <ShareFormDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        shareUrl={shareUrl}
        formTitle={shareTitle}
      />
    </>
  );
}
