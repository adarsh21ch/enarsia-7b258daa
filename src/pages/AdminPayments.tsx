import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, ShieldAlert, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface PaymentLog {
  id: string;
  created_at: string;
  event_type: string;
  user_email: string | null;
  razorpay_payment_id: string | null;
  amount: number | null;
  status: string | null;
  found_user: boolean;
  user_id: string | null;
  action_taken: string | null;
  error_message: string | null;
}

export default function AdminPayments() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchLogs();
    }
  }, [isAdmin]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching payment logs:', error);
      } else {
        setLogs(data || []);
      }
    } catch (e) {
      console.error('Exception fetching logs:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  const getActionBadgeColor = (action: string | null) => {
    if (!action) return "secondary";
    if (action === 'upgraded_to_pro') return "default";
    if (action === 'no_user_found') return "destructive";
    if (action === 'event_ignored') return "secondary";
    if (action.includes('error') || action.includes('failed')) return "destructive";
    return "outline";
  };

  const formatAmount = (amount: number | null) => {
    if (!amount) return "–";
    return `₹${(amount / 100).toFixed(2)}`;
  };

  const formatPaymentId = (id: string | null) => {
    if (!id) return "–";
    return id.length > 12 ? `...${id.slice(-8)}` : id;
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">You don't have permission to view this page.</p>
        <Button onClick={() => navigate("/profile")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profile
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Payment Logs</h1>
              <p className="text-sm text-muted-foreground">Razorpay webhook audit trail</p>
            </div>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Card */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{logs.length}</p>
              <p className="text-xs text-muted-foreground">Total Logs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {logs.filter(l => l.action_taken === 'upgraded_to_pro').length}
              </p>
              <p className="text-xs text-muted-foreground">Upgrades</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">
                {logs.filter(l => l.action_taken === 'no_user_found').length}
              </p>
              <p className="text-xs text-muted-foreground">Not Found</p>
            </CardContent>
          </Card>
        </div>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Webhook Events (Last 20)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No payment logs yet. After a test payment, logs will appear here.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Time</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">
                          {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {log.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.user_email || <span className="text-muted-foreground">–</span>}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {formatPaymentId(log.razorpay_payment_id)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatAmount(log.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionBadgeColor(log.action_taken) as any} className="text-xs">
                            {log.action_taken || '–'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-red-600 max-w-[200px] truncate">
                          {log.error_message || '–'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
