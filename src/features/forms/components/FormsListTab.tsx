import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, Copy, Trash2, Share2, BarChart3, MoreVertical } from 'lucide-react';
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

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  // Fetch submission counts
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

  const handleShare = async (form: NevoraFormWithFields) => {
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
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (forms.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <p className="text-muted-foreground">No forms yet</p>
        <p className="text-xs text-muted-foreground">Switch to "Create Form" tab to build your first form</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {forms.map(form => (
          <Card key={form.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0" onClick={() => onEdit(form)}>
                <h3 className="font-medium text-sm truncate">{form.title}</h3>
                {form.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{form.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant={form.is_accepting ? 'default' : 'secondary'} className="text-[10px]">
                    {form.is_accepting ? 'Active' : 'Closed'}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {counts[form.id] ?? '...'} responses
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(form.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/forms/${form.id}/responses`)}>
                    <Eye className="h-4 w-4 mr-2" /> View Responses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare(form)}>
                    <Share2 className="h-4 w-4 mr-2" /> Share
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
          </Card>
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
