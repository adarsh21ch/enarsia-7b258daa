import { useState } from 'react';
import { useAuditLogs, AuditLog } from '@/hooks/useAuditLogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, ChevronRight, History, User, Settings, Crown, Gift, Flag } from 'lucide-react';
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

function getActionIcon(actionType: string) {
  if (actionType.includes('plan')) return <Crown className="h-3 w-3" />;
  if (actionType.includes('user')) return <User className="h-3 w-3" />;
  if (actionType.includes('limit')) return <Settings className="h-3 w-3" />;
  if (actionType.includes('offer')) return <Gift className="h-3 w-3" />;
  if (actionType.includes('feature')) return <Flag className="h-3 w-3" />;
  return <History className="h-3 w-3" />;
}

function getActionColor(actionType: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (actionType.includes('created') || actionType.includes('granted')) return 'default';
  if (actionType.includes('deleted') || actionType.includes('suspended') || actionType.includes('revoked')) return 'destructive';
  if (actionType.includes('updated')) return 'secondary';
  return 'outline';
}

function AuditLogCard({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={getActionColor(log.action_type)} className="text-xs flex items-center gap-1">
              {getActionIcon(log.action_type)}
              {log.action_type.replace(/_/g, ' ')}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {log.target_type}
            </Badge>
          </div>
          <p className="text-sm mt-1 font-medium">{log.description}</p>
          <p className="text-xs text-muted-foreground mt-1">
            by {log.admin_email || 'Unknown'} • {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {(log.old_value || log.new_value) && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-6 text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Hide Details' : 'Show Details'}
        </Button>
      )}

      {expanded && (
        <div className="mt-2 p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
          {log.old_value && (
            <div className="mb-2">
              <span className="text-red-500">- Old:</span>
              <pre className="whitespace-pre-wrap">{JSON.stringify(log.old_value, null, 2)}</pre>
            </div>
          )}
          {log.new_value && (
            <div>
              <span className="text-green-500">+ New:</span>
              <pre className="whitespace-pre-wrap">{JSON.stringify(log.new_value, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AuditLogViewer() {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [targetFilter, setTargetFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading, error } = useAuditLogs({
    limit: pageSize,
    offset: page * pageSize,
    actionType: actionFilter === 'all' ? null : actionFilter,
    targetType: targetFilter === 'all' ? null : targetFilter,
  });

  const totalPages = Math.ceil((data?.totalCount || 0) / pageSize);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load audit logs
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" />
          Audit Log
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={targetFilter} onValueChange={(v) => { setTargetFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Filter by target" />
            </SelectTrigger>
            <SelectContent>
              {TARGET_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Logs List */}
        <div className="space-y-2">
          {data?.logs.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No audit logs found
            </p>
          ) : (
            data?.logs.map((log) => (
              <AuditLogCard key={log.id} log={log} />
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, data?.totalCount || 0)} of {data?.totalCount}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
