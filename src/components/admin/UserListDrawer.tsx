import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { User, Mail, Hash, Calendar, TrendingUp } from 'lucide-react';

export interface UserListItem {
  user_id: string;
  display_name: string | null;
  email: string | null;
  neverai_id: string | null;
  extra?: Record<string, unknown>;
}

interface UserListDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  users: UserListItem[];
  renderExtra?: (user: UserListItem) => React.ReactNode;
  loading?: boolean;
}

export function UserListDrawer({ 
  open, 
  onOpenChange, 
  title, 
  users, 
  renderExtra,
  loading 
}: UserListDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {title}
            <Badge variant="secondary" className="ml-2">{users.length}</Badge>
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-100px)] mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {users.map((user) => (
                <div 
                  key={user.user_id} 
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {user.display_name || 'No Name'}
                      </p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{user.email || 'No email'}</span>
                      </div>
                      {user.neverai_id && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Hash className="h-3 w-3" />
                          <span>{user.neverai_id}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {renderExtra && (
                    <div className="mt-2 pt-2 border-t">
                      {renderExtra(user)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// Specialized drawer for Pro Users
export function ProUserDrawer({ 
  open, 
  onOpenChange, 
  users,
  loading 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  users: Array<UserListItem & { 
    plan?: string;
    expires_at?: string | null;
    is_admin_override?: boolean;
    is_expired?: boolean;
    days_remaining?: number | null;
    payment_amount?: number | null;
  }>;
  loading?: boolean;
}) {
  const formatAmount = (amount: number | null) => {
    if (!amount) return null;
    return `₹${(amount / 100).toLocaleString('en-IN')}`;
  };

  return (
    <UserListDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Pro Users"
      users={users}
      loading={loading}
      renderExtra={(user) => {
        const proUser = user as typeof users[0];
        return (
          <div className="flex flex-wrap gap-2 text-xs">
            {proUser.is_admin_override ? (
              <Badge variant="outline" className="bg-purple-500/10 text-purple-600">
                Admin Override
              </Badge>
            ) : proUser.payment_amount ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-600">
                {formatAmount(proUser.payment_amount)}
              </Badge>
            ) : null}
            
            {proUser.is_expired ? (
              <Badge variant="destructive">Expired</Badge>
            ) : proUser.days_remaining !== null && proUser.days_remaining !== undefined ? (
              <Badge variant={proUser.days_remaining <= 7 ? "secondary" : "outline"}>
                {proUser.days_remaining} days left
              </Badge>
            ) : null}
            
            {proUser.expires_at && (
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Expires: {format(new Date(proUser.expires_at), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        );
      }}
    />
  );
}

// Specialized drawer for Free Users
export function FreeUserDrawer({ 
  open, 
  onOpenChange, 
  users,
  loading 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  users: Array<UserListItem & { 
    leads_count?: number;
    last_active?: string | null;
    created_at?: string;
  }>;
  loading?: boolean;
}) {
  return (
    <UserListDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Free Users"
      users={users}
      loading={loading}
      renderExtra={(user) => {
        const freeUser = user as typeof users[0];
        return (
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              {freeUser.leads_count || 0} leads
            </Badge>
            
            {freeUser.last_active && (
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Last active: {format(new Date(freeUser.last_active), 'MMM d')}
              </span>
            )}
          </div>
        );
      }}
    />
  );
}
