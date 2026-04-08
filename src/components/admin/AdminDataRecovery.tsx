import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, RotateCcw, Loader2, AlertTriangle, CheckCircle2, User } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { logAdminAction } from '@/hooks/useAuditLogs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeletedLead {
  id: string;
  name: string | null;
  phone: string | null;
  sheet_id: string | null;
  deleted_at: string;
}

interface UserInfo {
  user_id: string;
  email: string;
  display_name: string | null;
}

export function AdminDataRecovery() {
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [deletedLeads, setDeletedLeads] = useState<DeletedLead[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [bulkRestoreOpen, setBulkRestoreOpen] = useState(false);
  const [bulkRestoring, setBulkRestoring] = useState(false);
  const [searched, setSearched] = useState(false);

  const maskPhone = (phone: string | null) => {
    if (!phone) return '—';
    if (phone.startsWith('ENC:')) return '••••••' + phone.slice(-4);
    if (phone.length <= 4) return phone;
    return '••••••' + phone.slice(-4);
  };

  const handleSearch = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setSearching(true);
    setSearched(true);
    setUserInfo(null);
    setDeletedLeads([]);

    try {
      // Find user by email
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('user_id, email, display_name')
        .ilike('email', trimmed)
        .limit(1);

      if (pErr) throw pErr;
      if (!profiles || profiles.length === 0) {
        toast.error('No user found with that email');
        setSearching(false);
        return;
      }

      const profile = profiles[0];
      setUserInfo({
        user_id: profile.user_id,
        email: profile.email || trimmed,
        display_name: profile.display_name,
      });

      // Fetch deleted prospects
      const { data: leads, error: lErr } = await supabase
        .from('prospects')
        .select('id, name, phone, sheet_id, deleted_at')
        .eq('user_id', profile.user_id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .limit(500);

      if (lErr) throw lErr;
      setDeletedLeads((leads as DeletedLead[]) || []);
    } catch (err: any) {
      toast.error('Search failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSearching(false);
    }
  };

  const restoreLead = async (leadId: string) => {
    setRestoringId(leadId);
    try {
      const { error } = await supabase
        .from('prospects')
        .update({ deleted_at: null } as any)
        .eq('id', leadId);

      if (error) throw error;

      await logAdminAction(
        'lead_restored', 'prospect', leadId, { deleted: true }, { deleted: false },
        `Restored deleted lead ${leadId} for user ${userInfo?.email}`
      );

      setDeletedLeads(prev => prev.filter(l => l.id !== leadId));
      toast.success('Lead restored');
    } catch (err: any) {
      toast.error('Restore failed: ' + (err.message || 'Unknown error'));
    } finally {
      setRestoringId(null);
    }
  };

  const bulkRestore = async () => {
    if (!userInfo) return;
    setBulkRestoring(true);
    try {
      const { error } = await supabase
        .from('prospects')
        .update({ deleted_at: null } as any)
        .eq('user_id', userInfo.user_id)
        .not('deleted_at', 'is', null);

      if (error) throw error;

      await logAdminAction(
        'leads_bulk_restored', 'prospect', userInfo.user_id,
        { deleted_count: deletedLeads.length }, { restored: true },
        `Bulk restored ${deletedLeads.length} deleted leads for ${userInfo.email}`
      );

      toast.success(`Restored ${deletedLeads.length} leads`);
      setDeletedLeads([]);
    } catch (err: any) {
      toast.error('Bulk restore failed: ' + (err.message || 'Unknown error'));
    } finally {
      setBulkRestoring(false);
      setBulkRestoreOpen(false);
    }
  };

  const getDaysRemaining = (deletedAt: string) => {
    const days = 30 - differenceInDays(new Date(), new Date(deletedAt));
    return Math.max(0, days);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">🔍 Search User by Email</h3>
        <div className="flex gap-2">
          <Input
            placeholder="user@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="text-sm"
          />
          <Button onClick={handleSearch} disabled={searching || !email.trim()} size="sm">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </Card>

      {userInfo && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{userInfo.display_name || 'Unnamed'}</p>
                <p className="text-xs text-muted-foreground">{userInfo.email}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {deletedLeads.length} deleted
            </Badge>
          </div>

          {deletedLeads.length > 0 && (
            <Button
              variant="default"
              size="sm"
              className="w-full mb-3"
              onClick={() => setBulkRestoreOpen(true)}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Restore All ({deletedLeads.length})
            </Button>
          )}

          {deletedLeads.length === 0 && searched && (
            <div className="flex flex-col items-center py-6 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mb-2 text-green-500" />
              <p className="text-sm">No deleted leads found for this user</p>
            </div>
          )}

          {deletedLeads.length > 0 && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {deletedLeads.map(lead => {
                const daysLeft = getDaysRemaining(lead.deleted_at);
                return (
                  <div key={lead.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/30">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{lead.name || 'Unnamed'}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{maskPhone(lead.phone)}</span>
                        <span>•</span>
                        <span>{format(new Date(lead.deleted_at), 'dd MMM yyyy')}</span>
                        <span>•</span>
                        <span className={daysLeft <= 5 ? 'text-destructive font-medium' : ''}>
                          {daysLeft <= 0 ? (
                            <span className="flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" /> Expiring</span>
                          ) : `${daysLeft}d left`}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs shrink-0"
                      disabled={restoringId === lead.id}
                      onClick={() => restoreLead(lead.id)}
                    >
                      {restoringId === lead.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <AlertDialog open={bulkRestoreOpen} onOpenChange={setBulkRestoreOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore All Deleted Leads?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore {deletedLeads.length} deleted leads for {userInfo?.email}. They will reappear in the user's prospect list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={bulkRestore} disabled={bulkRestoring}>
              {bulkRestoring ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Restore All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
