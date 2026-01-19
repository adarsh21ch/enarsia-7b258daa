import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ProspectDistributionCardProps {
  threshold: number;
  label: string;
  userCount: number;
  isLoading?: boolean;
  onClick: () => void;
}

export function ProspectDistributionCard({
  threshold,
  label,
  userCount,
  isLoading,
  onClick,
}: ProspectDistributionCardProps) {
  if (isLoading) {
    return (
      <Card className="cursor-pointer">
        <CardContent className="p-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
        "active:scale-[0.98]"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground font-medium">
            {label} prospects
          </span>
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold text-foreground">
          {userCount.toLocaleString()}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          users
        </p>
      </CardContent>
    </Card>
  );
}
