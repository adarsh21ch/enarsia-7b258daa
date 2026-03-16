import { useState } from 'react';
import { useAuditLogs, AuditLog } from '@/hooks/useAuditLogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Loader2, ChevronLeft, ChevronRight, History, ChevronDown, ChevronUp } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const ACTION_TYPES = [
  { value: 'all', label: 'All Actions' },
  { value: 'plan_created', label: 'Plan Created' },
  { value: 'plan_updated', label: 'Plan Updated' },
  { value: 'plan_deleted', label: 'Plan Deleted' },
  { value: 'limit_updated', label: 'Limit Updated' },
  { value: 'feature_flag_updated', label: 'Feature Flag Updated' },
  { value: 'offer_created', label: 'Offer Created' },
  { value: 'offer_updated', label: 'Offer Updated' },
  { value: 'user_pro_granted', label: 'Pro Access Granted' },
  { value: 'user_pro_revoked', label: 'Pro Access Revoked' },
  { value: 'user_override_set', label: 'User Override Set' },
  { value: 'user_suspended', label: 'User Suspended' },
  { value: 'user_unsuspended', label: 'User Unsuspended' },
];

const TARGET_TYPES = [
  { value: 'all', label: 'All Targets' },
  { value: 'plan', label: 'Plans' },
  { value: 'user', label: 'Users' },
  { value: 'limit', label: 'Limits' },
  { value: 'feature', label: 'Features' },
  { value: 'offer', label: 'Offers' },
];

function getActionColor(actionType: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (actionType.includes('created') || actionType.includes('granted')) return 'default';
  if (actionType.includes('deleted') || actionType.includes('suspended') || actionType.includes('revoked')) return 'destructive';
  if (actionType.includes('updated')) return 'secondary';
  return 'outline';
}

function ExpandableDetails({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  if (!log.old_value && !log.new_value) return null;

  return (
    <>
      <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>
      {expanded && (
        <div className="mt-1 p-2 bg-muted rounded text-[10px] font-mono max-w-[300px] overflow-x-auto">
          {log.old_value && <div className="mb-1"><span className="text-destructive">- </span><pre className="whitespace-pre-wrap inline">{JSON.stringify(log.old_value, null, 2)}</pre></div>}
          {log.new_value && <div><span className="text-green-600">+ </span><pre className="whitespace-pre-wrap inline">{JSON.stringify(log.new_value, null, 2)}</pre></div>}
        </div>
      )}
    </>
  );
}

export function AuditLogViewer() {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [targetFilter, setTargetFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading, error, refetch } = useAuditLogs({
    limit: pageSize,
    offset: page * pageSize,
    actionType: actionFilter === 'all' ? null : actionFilter,
    targetType: targetFilter === 'all' ? null : targetFilter,
  });

  const totalPages = Math.ceil((data?.totalCount || 0) / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Audit Log</h2>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={targetFilter} onValueChange={(v) => { setTargetFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue placeholder="Filter by target" />
          </SelectTrigger>
          <SelectContent>
            {TARGET_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="p-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">Failed to load audit logs</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </Card>
      ) : (
        <div className="rounded-lg border border-border/50 bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px]">Time</TableHead>
                <TableHead className="text-[11px]">Admin</TableHead>
                <TableHead className="text-[11px]">Action</TableHead>
                <TableHead className="text-[11px]">Target</TableHead>
                <TableHead className="text-[11px]">Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                data?.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="py-2 px-3 text-[11px] text-muted-foreground whitespace-nowrap">
                      <div>{format(new Date(log.created_at), 'MMM d, HH:mm')}</div>
                      <div className="text-[10px]">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</div>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-[11px] max-w-[120px] truncate">
                      {log.admin_email || 'Unknown'}
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <Badge variant={getActionColor(log.action_type)} className="text-[10px]">
                        {log.action_type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <Badge variant="outline" className="text-[10px]">{log.target_type}</Badge>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <p className="text-xs truncate max-w-[200px]">{log.description}</p>
                      <ExpandableDetails log={log} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-muted-foreground">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, data?.totalCount || 0)} of {data?.totalCount}
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-7" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
