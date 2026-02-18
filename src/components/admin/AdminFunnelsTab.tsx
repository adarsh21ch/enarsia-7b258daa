import { FunnelsStatsGrid } from './FunnelsStatsGrid';
import { FunnelsSubscribersTable } from './FunnelsSubscribersTable';

export function AdminFunnelsTab() {
  return (
    <div className="space-y-6">
      <FunnelsStatsGrid />
      <p className="text-xs text-muted-foreground">
        Funnel feature gates are now managed in the <strong>Features</strong> tab under the 🎬 Funnels module section.
      </p>
      <FunnelsSubscribersTable />
    </div>
  );
}
