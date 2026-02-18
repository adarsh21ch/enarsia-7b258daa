import { FunnelsStatsGrid } from './FunnelsStatsGrid';
import { FunnelsFeaturesControl } from './FunnelsFeaturesControl';
import { FunnelsSubscribersTable } from './FunnelsSubscribersTable';

export function AdminFunnelsTab() {
  return (
    <div className="space-y-6">
      <FunnelsStatsGrid />
      <FunnelsFeaturesControl />
      <FunnelsSubscribersTable />
    </div>
  );
}
