

## Add AI Assistant Feature Flag to Admin Panel

### Goal
Add the NevorAI AI Assistant as a controllable feature in the Feature Registry, so admins can restrict it to Pro-only, Free, or Trial users.

### Current State
- The AI Assistant button and chat appear on Dashboard, ListUp, and Tracking pages with NO access control
- The Feature Registry system (`admin_feature_flags` table) already supports Free/Pro/Trial toggling and numeric limits
- The `useFeatureAccess` hook already handles all the gating logic

### Implementation

**Step 1: Insert the `ai_assistant` feature flag into the database**

Add a new row to `admin_feature_flags` with:
- `feature_key`: `ai_assistant`
- `feature_name`: `AI Assistant`
- `category`: `general`
- `is_enabled`: true
- `free_access`: true (default to all users, admin can toggle)
- `pro_access`: true
- `trial_access`: true

**Step 2: Add a new category for AI in the Feature Registry UI**

Update `FeatureFlagsManager.tsx`:
- Add `'ai'` to `CATEGORY_ORDER`
- Add label: `ai: '🤖 AI'`

This groups the AI Assistant feature under its own category in the admin panel.

**Step 3: Gate the AI Assistant behind the feature flag**

Update three page files to conditionally render the AI button:

- `src/pages/Dashboard.tsx` -- wrap `AIAssistantButton` + `AIAssistantChat` with `useFeatureAccess('ai_assistant')` check
- `src/pages/ListUp.tsx` -- same
- `src/pages/Tracking.tsx` -- same

In each file:
```text
const { canAccess: canAccessAI } = useFeatureAccess('ai_assistant');

// Only render if access granted
{canAccessAI && (
  <>
    <AIAssistantButton onClick={() => setShowAIChat(true)} />
    <AIAssistantChat open={showAIChat} onOpenChange={setShowAIChat} />
  </>
)}
```

### Files Changed
| File | Change |
|------|--------|
| Database migration | Insert `ai_assistant` row into `admin_feature_flags` |
| `src/components/admin/FeatureFlagsManager.tsx` | Add `ai` category |
| `src/pages/Dashboard.tsx` | Gate AI behind `useFeatureAccess` |
| `src/pages/ListUp.tsx` | Gate AI behind `useFeatureAccess` |
| `src/pages/Tracking.tsx` | Gate AI behind `useFeatureAccess` |

### Result
- Admin can toggle AI Assistant between Free / Pro Only / Trial from the Features tab
- The AI button will immediately show/hide based on the user's plan
- No code changes needed in the future to adjust access -- purely admin-controlled

