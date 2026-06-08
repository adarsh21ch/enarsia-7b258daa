# Fix remaining "Funnel" label in Manage Response Tags

## Problem
The badge on tag #4 (REGISTRATION) in the Manage Response Tags dialog still reads **"Funnel"**. Previous renames missed this specific component.

The Funnel **tab** at the top of the Calling page (`CallingFunnelTabs.tsx`) and the standalone **Funnels feature** (`FunnelTracker`, ListUp mode selector, UserGuide, ModeSelectors) are separate product areas and will NOT be renamed — only the response-tag badge.

## Change
**File:** `src/components/prospects/ManageResponseTagsDialog.tsx` (line 463)

Replace:
```tsx
{tag.isStageTag && <span>Funnel</span>}
```
with:
```tsx
{tag.isStageTag && <span>Filter</span>}
```

Also verify the surrounding star-button title/aria text in the same file still says "Funnel Tag" anywhere — if found, switch to "Filter Tag" to stay consistent.

## Verification
1. Open Calling → Manage Response Tags → tag #4 should show a **Filter** badge (not Funnel).
2. Star toggle tooltip should read "Mark as Filter Tag".
3. No other UI changes; Funnels feature/tab unaffected.

After this, you can use Visual Edits for any further label tweaks — it's free for static text changes.