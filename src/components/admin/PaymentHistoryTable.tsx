import { format, parseISO } from 'date-fns';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { PaymentLog } from '@/hooks/useAdminAnalytics';

interface PaymentHistoryTableProps {
  payments: PaymentLog[];
}

export function PaymentHistoryTable({ payments }: PaymentHistoryTableProps) {
  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  const formatAmount = (amount: number | null) => {
    if (!amount) return '-';
    return `₹${amount.toLocaleString()}`;
  };

  if (payments.length === 0) {
    return (
      <div className="rounded-xl bg-card border border-border/50 p-8 text-center">
        <p className="text-muted-foreground text-sm">No payment records found</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
        <h4 className="text-sm font-medium">Recent Payments</h4>
      </div>
      <div className="divide-y divide-border/50 max-h-64 overflow-y-auto">
        {payments.map((payment) => (
          <div key={payment.id} className="px-4 py-3 flex items-center gap-3">
            {getStatusIcon(payment.status)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {payment.user_email || 'Unknown User'}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(parseISO(payment.created_at), 'dd MMM yyyy, HH:mm')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">
                {formatAmount(payment.amount)}
              </p>
              <p className="text-[10px] text-muted-foreground capitalize">
                {payment.event_type?.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
