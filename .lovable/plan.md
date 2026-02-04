
# Plan: Persist Retargeting Filter State

## Problem Summary
When users apply a Retargeting filter (e.g., "Video Send") in the Calling > Leads tab, the selection gets reset when:
- Switching between tabs (Follow-Up, To-Do, TrackUp, Profile)
- Making a call and returning
- Refreshing the page
- Closing and reopening the app

This causes frustration as users must repeatedly reselect filters during their workflow.

## Root Cause
The filter state in `ProspectTable.tsx` uses `useState` with a hardcoded initial value. This state resets whenever the component remounts (tab switch, navigation) or the page reloads.

## Solution Overview
Persist the Retargeting filter state to `localStorage` and restore it on component mount. The filters will be stored with a key specific to the filter mode (calling vs funnel) so each tab maintains its own filter state.

## Implementation Steps

### Step 1: Create Filter Persistence Hook
Create a new custom hook `usePersistedFilters` that:
- Reads initial filter state from localStorage on mount
- Saves filter changes to localStorage automatically
- Uses filter mode (calling/funnel) as part of the storage key

File: `src/hooks/usePersistedFilters.ts`

### Step 2: Update ProspectTable to Use Persisted Filters
Modify `ProspectTable.tsx` to:
- Replace the hardcoded `useState` for filters with the new `usePersistedFilters` hook
- Pass `filterMode` to the hook to separate Leads vs Funnel filter storage

### Step 3: Handle Clear Filter Action
Ensure the "Clear" button in `ProspectFilters.tsx` properly clears both the state and the persisted storage.

---

## Technical Details

### Storage Key Format
```
nevorai-filters-calling  → stores Leads tab filters
nevorai-filters-funnel   → stores Funnel tab filters
```

### Data Structure Stored
```typescript
{
  actions: string[],     // Retargeting filters for Calling tab
  stages: string[],      // Stage filters for Funnel tab
  incompleteOnly: boolean
}
```

Note: `search` and `qualities` are intentionally NOT persisted as search is handled by the parent component and qualities is not actively used.

### Lazy Initialization
The hook will use lazy initialization for `useState` to read from localStorage only once on mount, avoiding unnecessary reads on re-renders.

### Error Handling
Wrap localStorage operations in try-catch to handle cases where:
- localStorage is unavailable (private browsing)
- Storage quota exceeded
- Corrupted data

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/usePersistedFilters.ts` | **New file** - Custom hook for filter persistence |
| `src/components/prospects/ProspectTable.tsx` | Replace useState with usePersistedFilters hook |

## Expected Behavior After Fix
- Filter selection persists across tab switches
- Filter selection persists after making calls
- Filter selection persists after page refresh
- Filter selection persists after app close/reopen
- Clear button properly resets both UI and storage
- Leads tab and Funnel tab maintain separate filter states
