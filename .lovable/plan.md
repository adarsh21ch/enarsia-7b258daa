# Port Team Tracking → Enarsia (1:1 parity)

## Goal
Make the website's `/trackup` dashboard available natively inside Enarsia at `/team-tracking`, reading/writing the same Lovable Cloud backend (`personal_snapshot_v2`, `team_snapshot_v2`, `team_access`, `leader_levels`, `leader_member_aliases`, `profiles`, `prospects`, `inbox_messages`, `funnel_configs`, etc.). Replace the existing external "Team Tracking" button in the Tracking page header with an internal link.

## What's already in Enarsia (reuse as-is)
- Backend tables (shared project `kisankusogixarejjphi`).
- Hooks: `useSnapshotV2ComputedData`, `useTrackingModes`, `useTrackingSourcePreferences`, `useTeamAccess`, `useFunnelConfig`, `useLeaderLevels`, `useMemberAliases`, `useProfile`, `useSubscription`, `useAdmin`, `useInbox`, `useProspectsQuery`, `useTodos`, `useDailyTasks`.
- Components: `TeamMemberSelector`, `TeamBar`, `TeamToggle`, `InboxDrawer`, follow-up / calling / todo / profile / forms / recent-activity / admin tabs.

## What needs porting from website (`NevorAI Website`)
All under `src/components/trackup-dashboard/`:
- Layout shell: `TrackUpSidebar`, `MobileDrawerSidebar`, `TrackUpStatusCard`, `TrackingViewToggle`, `TrackingOverflowMenu`, `LevelFilterDropdown`, `FloatingUpdateButton`, `PaywallModal`, `LockedFeatureCard`, `MemberLevelBadge`, `MemberListPanel`, `TeamExplorer`.
- Team-data views (the core of "Team Tracking"): `LeadsTrackingView`, `StageTrackingView`, `ExcelSummaryTables`, `CallingTrackingBox`, `CallingTrackingTable`, `FilterTrackingBox`, `FilterTrackingTable`, `StageFinalSummary`, `DateWiseLeadsTable`, `CompareColumns`, `DateFilter`, `EyeViewSheet`.
- Tab wrappers reused inside dashboard: `ActionsTrackingTab`, `ActivityStatusTab`, `CompulsoryActionsLeaderTab`, `CompulsoryActionsMemberTab`, `CompulsoryActionsSheet`, `SendMessageTab`, `SendMessageButton`, `QuickUpdateForm`, `ManualUpdateModal`, `UpdateTrackingButton`, `InboxBell`, `InboxPanel`, `AIChat`, `LeaderTrackingFormat` (website's version), `ContactButtons`, `AdminUsersTab`, `UpgradeTab`, `ProfileTab`, `FollowUpListTab`, `CallingTab`, `TodoListTab`, `TodoListTabWithDailyTasks`, `RecentActivityTab`.
- Page: `src/pages/TrackUpDashboard.tsx` → becomes `src/pages/TeamTracking.tsx`.
- Hooks not in Enarsia: `useTrackUpData`, `useProspectsCache`, `useTeamSnapshotV2Read`, `useTeamSnapshotV2Write`, `useViewedMemberTeam`, `useAutoSnapshotSync`, `useLevelFilterPreference`.

## Approach
Two-pass copy + adapt — do NOT touch backend (shared schema already supports everything).

### Pass 1 — wholesale copy
Use `cross_project--read_project_file` on each file above and recreate inside Enarsia at the same relative paths:
- `src/pages/TeamTracking.tsx`
- `src/components/trackup-dashboard/*` (entire folder)
- `src/hooks/useTrackUpData.ts`, `useProspectsCache.ts`, `useTeamSnapshotV2Read.ts`, `useTeamSnapshotV2Write.ts`, `useViewedMemberTeam.ts`, `useAutoSnapshotSync.ts`, `useLevelFilterPreference.ts`.

### Pass 2 — rewire to Enarsia conventions
Search-replace across the copied files:
- `@/contexts/AppAuthContext` (`useAppAuth`) → `@/contexts/AuthContext` (`useAuth`). Map `profile`/`loading`/`signOut` to Enarsia equivalents (load profile via `useProfile`).
- `@/integrations/app-supabase/client` (`appSupabase`, `AppProspect`, `AppProfile`, `FunnelConfig`, etc.) → `@/integrations/supabase/client` (`supabase`) and Enarsia types in `src/types/prospect.ts` / `src/integrations/supabase/types.ts`.
- `useProAccess` / `useAppSubscription` / `tierUtils` → Enarsia's `useSubscription` + `src/config/tierLabels.ts` + `src/lib/planUtils.ts`. Keep paywall gating but feed it through `useFeatureAccess` + `admin_feature_flags` (project standard).
- `useAdminAccess` → Enarsia's `useAdmin` (still gated by hardcoded `teamnevorai@gmail.com`).
- Forms tab: website imports `@/components/forms` (`FormsListTab`). Use Enarsia's `src/features/forms/components/FormsListTab.tsx`.
- Auth redirect: send to `/auth` (Enarsia route).
- Brand strings: any "Nevorai App"/"NevorAI" labels → "Enarsia"; logo → `src/assets/nevorai-call-logo.png`.
- Remove the website-only `TRACKUP_PAYWALL_ENABLED` config import; replace with `useFeatureAccess('team_tracking')` (add flag to `admin_feature_flags` if missing — but no schema change needed, just a row insert via migration).

### Pass 3 — entry point
- Add `<Route path="/team-tracking" element={<TeamTracking />} />` in `src/App.tsx` behind the auth-protected layout.
- In `src/pages/Tracking.tsx` change the header "Team Tracking" button: replace `window.open(NEVORAI_WEBSITE_URL + '/trackup')` with `navigate('/team-tracking')` and drop the `ExternalLink` icon for `Users`/`BarChart3`.
- (Optional) Add a bottom-nav / profile menu entry to `/team-tracking` for discoverability — confirm before adding.

### Pass 4 — verification
- Build passes; route loads without console errors.
- Sidebar shows the signed-in user's downline (data already exists in shared `team_access` / `personal_snapshot_v2`).
- Selecting a member renders Leads + Stage + Excel summary tables with the same numbers as the website.
- Quick-update / Manual-update writes land in `personal_snapshot_v2` and aggregate into `team_snapshot_v2` (cross-checked via `supabase--read_query`).
- Confirm reading the same row in both apps shows identical numbers (sanity check that the shared backend is wired correctly).

## Technical notes (for reference)
- Source page is 1,569 lines and pulls ~50 components + ~15 hooks. Plan on a multi-file copy job (~60 files). Most logic is presentational over the snapshot V2 tables, so the adapter surface is small (auth + supabase client + tier check).
- No backend migrations required — shared schema already has every table/RLS policy the website uses. The only optional DB change is inserting a `team_tracking` row into `admin_feature_flags` so we can gate visibility centrally.
- Keep the website code as the upstream reference; do not delete files there. If/when the website's version evolves, re-run Pass 1 for the changed files only.

## Out of scope
- Any change to backend schema, RLS, or edge functions.
- Removing the website's `/trackup` page (already hidden from website nav per your note).
- Visual redesign — porting at 1:1 parity first; restyling can be a follow-up.
