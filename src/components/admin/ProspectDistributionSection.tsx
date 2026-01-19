import { useState } from "react";
import { useProspectDistribution, useUsersByProspectThreshold } from "@/hooks/useProspectDistribution";
import { ProspectDistributionCard } from "./ProspectDistributionCard";
import { ProspectDistributionDrawer } from "./ProspectDistributionDrawer";

export function ProspectDistributionSection() {
  const [selectedThreshold, setSelectedThreshold] = useState<number | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string>("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: distribution, isLoading: distributionLoading } = useProspectDistribution();
  const { data: users, isLoading: usersLoading } = useUsersByProspectThreshold(selectedThreshold);

  const handleCardClick = (threshold: number, label: string) => {
    setSelectedThreshold(threshold);
    setSelectedLabel(label);
    setDrawerOpen(true);
  };

  const handleDrawerClose = (open: boolean) => {
    setDrawerOpen(open);
    if (!open) {
      // Clear selection after drawer closes
      setTimeout(() => setSelectedThreshold(null), 300);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Prospect Distribution by Users</h3>
        <p className="text-sm text-muted-foreground">
          Users who have crossed prospect thresholds
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {distributionLoading ? (
          // Loading skeletons
          [...Array(4)].map((_, i) => (
            <ProspectDistributionCard
              key={i}
              threshold={0}
              label=""
              userCount={0}
              isLoading
              onClick={() => {}}
            />
          ))
        ) : (
          distribution?.map((item) => (
            <ProspectDistributionCard
              key={item.threshold}
              threshold={item.threshold}
              label={item.threshold_label}
              userCount={item.user_count}
              onClick={() => handleCardClick(item.threshold, item.threshold_label)}
            />
          ))
        )}
      </div>

      <ProspectDistributionDrawer
        open={drawerOpen}
        onOpenChange={handleDrawerClose}
        threshold={selectedThreshold}
        thresholdLabel={selectedLabel}
        users={users || []}
        isLoading={usersLoading}
      />
    </div>
  );
}
