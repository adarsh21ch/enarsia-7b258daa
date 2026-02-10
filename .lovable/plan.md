

## Fix: Total Tracking Automated Mode

### What's Wrong
When Total Tracking is set to "Automated," it always reads from `total_snapshot_v2` (which has old manual data). It ignores your personal source preference, so your application-computed numbers don't appear in the total.

### The Fix (Safe, Minimal)

This uses the exact same pattern already working for Personal tracking -- just applied to the Total side.

**1. New Hook: `useApplicationTotalSnapshots.ts`**

Computes total data by merging:
- Your personal data (respects your personal source: if APPLICATION, computes from prospects; if MANUAL, reads from personal_snapshot_v2)
- Team members' data (from personal_snapshot_v2 where upline_leader_id = you)
- Sums everything per date, returns the same SnapshotRow[] format

**2. Tracking.tsx -- 1 conditional change**

Line 70 currently:
```
const { snapshots: totalSnapshots } = useTotalSnapshotV2Read(...)
```

Becomes:
```
// Both hooks always run (React rules), dashboard picks the right one
const { snapshots: manualTotalSnapshots } = useTotalSnapshotV2Read(...)
const { snapshots: autoTotalSnapshots } = useApplicationTotalSnapshots(...)
const totalSnapshots = teamSource === 'AUTO' ? autoTotalSnapshots : manualTotalSnapshots
```

**3. ProfileTrackUp.tsx -- same small conditional**

### Safety Guarantees

- No existing hooks modified
- No database or schema changes
- Manual mode path completely untouched
- Same SnapshotRow[] output format the dashboard already consumes
- Pure read-time computation, no writes or side effects

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useApplicationTotalSnapshots.ts` | NEW -- merges personal + team data |
| `src/pages/Tracking.tsx` | Conditional: use auto total when teamSource = AUTO |
| `src/components/profile/ProfileTrackUp.tsx` | Same conditional |

