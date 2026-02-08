

# Speed Up TrackUp Loading — Instant Data on Tab Switch

## Root Cause

When you open TrackUp, there is a **waterfall of 5-7 sequential database calls** before any data appears:

1. Auth loads user
2. `useTrackingFormat` fetches your profile, then your leader's profile via 2-3 RPC calls
3. `useFunnelConfig` fetches funnel config + checks leader connection (2-3 more calls)
4. Only AFTER steps 2-3 finish do the snapshot read hooks (`usePersonalSnapshotV2Read`, `useTotalSnapshotV2Read`) fire
5. Tag name resolution must complete before data renders correctly

FollowUp feels instant because it does a single `prospects` query with no dependencies.

## Solution: Aggressive Caching + Prefetching

The key insight: **tracking format, funnel config, and snapshot data rarely change**. We can cache them so that switching tabs or reopening the app shows stale data immediately, then silently refreshes in the background.

### Changes

**1. `src/hooks/useTrackingFormat.ts`** — Add localStorage caching

- On successful load, save `trackingFormat` to `localStorage`
- On mount, immediately read from `localStorage` and set state (so data shows in ~5ms)
- Then fetch fresh data from DB in the background and update if changed
- This eliminates the 3-5 second wait for tag names on every tab switch

**2. `src/hooks/usePersonalSnapshotV2Read.ts`** — Increase staleTime and gcTime

- Change `staleTime` from 30s to 5 minutes (`300_000`)
- Add `gcTime: 10 * 60 * 1000` (10 minutes) so React Query keeps data in memory across tab switches
- Data still refreshes in the background, but the UI shows cached data instantly

**3. `src/hooks/useTotalSnapshotV2Read.ts`** — Same caching changes

- Match personal snapshot caching: `staleTime: 300_000`, `gcTime: 600_000`

**4. `src/hooks/useFunnelConfig.ts`** — Add localStorage caching

- Cache own config and leader config to localStorage on successful fetch
- Read from cache on mount for instant display
- Fetch fresh data in background

**5. `src/hooks/useTrackingSourcePreferences.ts`** — Increase staleTime

- Add `staleTime: 300_000` and `gcTime: 600_000` so preference loads from cache on tab switch

### How It Works

```text
BEFORE (current):
Tab switch -> Auth -> TrackingFormat (3 RPCs) -> FunnelConfig (2 RPCs) -> Snapshots (2 queries)
                                    ~10-12 seconds total

AFTER (with caching):
Tab switch -> Cached TrackingFormat (5ms) -> Cached Snapshots (5ms) -> UI renders
             Background: fresh fetch -> update if changed
                                    ~instant display, background refresh
```

### Safety

- Cached data is only used for display while fresh data loads
- If cached data is stale, it gets replaced silently within 1-2 seconds
- First-ever login still loads normally (no cache exists yet)
- Cache is keyed per user ID to prevent data leaks between accounts
- Logout clears cached tracking data
- No changes to any API, edge function, KPI calculation, or snapshot logic

