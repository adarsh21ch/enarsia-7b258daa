import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Sparkles, Trash2, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * One-time friendly banner shown to users who were auto-seeded with demo leads.
 * Lets them dismiss the notice or wipe all demo data in one tap.
 * Hides itself permanently after dismissal or after the demo leads are gone.
 */
export function DemoLeadsBanner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('demo_data_created, demo_notice_seen')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled || !profile) return;
      if (!profile.demo_data_created || profile.demo_notice_seen) return;

      const { count } = await supabase
        .from('prospects')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_demo', true);

      if (!cancelled && (count ?? 0) > 0) setVisible(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const markSeen = async () => {
    if (!user) return;
    setVisible(false);
    await supabase.from('profiles').update({ demo_notice_seen: true } as any).eq('user_id', user.id);
    queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
  };

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.rpc('delete_demo_data_for_user', { p_user_id: user.id });
      if (error) throw error;
      const result = data as { deleted?: number } | null;
      toast.success(`Removed ${result?.deleted ?? 0} demo leads`);
      setVisible(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile', user.id] }),
        queryClient.invalidateQueries({ queryKey: ['prospects'] }),
        queryClient.invalidateQueries({ queryKey: ['sheets'] }),
        queryClient.invalidateQueries({ queryKey: ['activity_logs'] }),
        queryClient.invalidateQueries({ queryKey: ['tracking'] }),
      ]);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete demo leads');
    } finally {
      setDeleting(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="mx-4 mt-2 mb-2 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3 shadow-sm">
      <div className="flex items-start gap-2.5">
        <div className="shrink-0 rounded-lg bg-primary/15 p-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold leading-tight">
            👋 These are demo leads to help you learn Enarsia
          </p>
          <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug">
            Explore tagging, follow-ups and tracking with them. Add your real leads anytime — delete the demo data with one tap when you're ready.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" className="h-7 px-2.5 text-[11px] gap-1">
                  <Trash2 className="h-3 w-3" />
                  Delete demo leads
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all demo leads?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes all 50 demo leads and their activity. Your own leads stay safe. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
                    {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Delete all'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button size="sm" variant="ghost" onClick={markSeen} className="h-7 px-2.5 text-[11px]">
              Got it
            </Button>
          </div>
        </div>
        <button
          aria-label="Dismiss"
          onClick={markSeen}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
