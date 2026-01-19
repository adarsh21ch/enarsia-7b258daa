import { format } from "date-fns";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserByThreshold } from "@/hooks/useProspectDistribution";

interface ProspectDistributionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threshold: number | null;
  thresholdLabel: string;
  users: UserByThreshold[];
  isLoading: boolean;
}

export function ProspectDistributionDrawer({
  open,
  onOpenChange,
  threshold,
  thresholdLabel,
  users,
  isLoading,
}: ProspectDistributionDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b">
          <DrawerTitle>
            Users with {thresholdLabel} prospects ({users.length})
          </DrawerTitle>
        </DrawerHeader>
        
        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-3 border rounded-lg">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found with {thresholdLabel} prospects
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.user_id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground truncate">
                        {user.display_name || "Unnamed User"}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {user.email || "No email"}
                      </div>
                      {user.neverai_id && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          ID: {user.neverai_id}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-primary">
                        {user.prospect_count.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">prospects</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge
                      variant={user.plan === "pro" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {user.plan === "pro" ? "Pro" : "Free"}
                    </Badge>
                    {user.last_active && (
                      <span className="text-xs text-muted-foreground">
                        Last active: {format(new Date(user.last_active), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
