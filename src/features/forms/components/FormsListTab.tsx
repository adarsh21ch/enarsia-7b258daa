import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, Copy, Trash2, Share2, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
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
      <div className="border border-blue-100/50 dark:border-blue-900/30 rounded-2xl overflow-hidden bg-white/80 dark:bg-card/80 shadow-sm shadow-blue-100/40 dark:shadow-blue-900/20">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-blue-100/40 dark:border-blue-900/20 hover:bg-transparent bg-blue-50/30 dark:bg-blue-950/10">
              <TableHead className="text-xs font-medium text-muted-foreground">Form Name</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Type</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Submissions</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Created</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {forms.map(form => (
              <TableRow key={form.id} className="cursor-pointer hover:bg-blue-50/30 dark:hover:bg-blue-950/10 border-b border-blue-50/50 dark:border-blue-950/20" onClick={() => onEdit(form)}>
                <TableCell className="font-medium text-sm">{form.title}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600 bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:bg-orange-950/30">
                    {form.form_type || 'Custom'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{counts[form.id] ?? '...'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(form.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${form.is_accepting
                      ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950/30'
                      : 'border-red-300 text-red-600 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950/30'
                    }`}
                  >
                    {form.is_accepting ? 'Active' : 'Closed'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30" onClick={() => navigate(`/forms/${form.id}/responses`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30" onClick={() => handleShare(form)}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
