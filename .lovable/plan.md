

## Onboarding System — Complete Production Rebuild

### Summary

Full rewrite of the onboarding system: 8 files changed. Adds step readiness gates, scroll safety, route mismatch handling, missing-target fallbacks, clean transitions, hard cleanup on skip/finish, capped retries, mobile stability, and persistent AI tip dismissal.

---

### Architecture

```text
useOnboarding (hook)
  ├─ New-user-only eligibility (defaults isCompleted=true)
  ├─ Extra guard: if user has prospects/sheets → force completed
  ├─ No RPC call, no restartTour (replaced by retakeTour)
  └─ DB persistence of step + completed + skipped

OnboardingOverlay (global, in App.tsx)
  ├─ Step 0: Welcome popup (Let's Start / Skip)
  ├─ Steps 1–11: StepBanner + BlockingOverlay + elevated target
  │   ├─ STEP_REGISTRY: central config per step
  │   ├─ Step readiness gate (route + DOM + data check)
  │   ├─ Target resolution with capped retries (max 10 × 300ms)
  │   ├─ Fallback: centered info card if target missing
  │   ├─ Action steps (5, 8): advance on route change
  │   └─ Info steps: advance on "Got it" click
  ├─ Step 12: Completion screen + confetti
  └─ Hard cleanup on unmount/skip/finish

OnboardingPrimitives (low-level components)
  ├─ BlockingOverlay: fixed, z-9000, pointer-events:all, blocks clicks
  ├─ useTargetElevation(selector, active):
  │   ├─ Finds element, injects z-9999 + blue border inline
  │   ├─ Auto-scrolls into view (handles nested containers)
  │   ├─ Retries up to 10× with 300ms delay
  │   ├─ Returns { found, rect }
  │   └─ Full cleanup on selector change / unmount
  ├─ StepBanner: compact top card (progress bar, title, desc, Got it, Skip)
  └─ Confetti (kept as-is)
```

---

### Files to Change

#### 1. `src/hooks/useOnboarding.ts` — Rewrite
- Default `isCompleted = true` (safe for all existing users on first render)
- On profile load: set `isCompleted = false` ONLY if `onboarding_completed === false` AND `onboarding_step` is 0 or 1–11
- **Extra eligibility guard**: query `prospects` count — if user has any real prospects, force `isCompleted = true`
- Remove `restartTour` → add `retakeTour` (resets step to 0, sets completed/skipped false)
- Remove RPC `setup_new_user_onboarding` call entirely
- `startTour`: just sets step=1, no async RPC
- `skipAllOnboarding`: sets both completed + skipped = true

#### 2. `src/components/onboarding/OnboardingPrimitives.tsx` — Full Rewrite
**Remove**: `HighlightBox`, `LightDimOverlay`, `TopTooltipBanner`, `useTargetHighlight`

**New**:
- **`BlockingOverlay`**: `position:fixed; inset:0; z-index:9000; pointer-events:all; background:rgba(0,0,0,0.45)`. On click → toast "Complete this step first".
- **`useTargetElevation(selector: string|null, active: boolean)`**:
  - Finds DOM element via `document.querySelector(selector)`
  - Retries up to 10 times at 300ms intervals if not found; returns `{ found: false }` after max retries (no infinite loop)
  - When found: saves original styles, injects `position:relative; z-index:9999; pointer-events:all; box-shadow:0 0 0 4px rgba(37,99,235,0.4); border-radius:8px; outline:2.5px solid #2563EB`
  - Auto-scrolls target into view: checks if inside scrollable container (`overflow:auto/scroll`) and scrolls that container; otherwise `scrollIntoView({ behavior:'smooth', block:'center' })`
  - Waits 200ms after scroll before marking as ready
  - Cleanup: restores original styles on selector change, `active=false`, or unmount
  - Returns `{ found: boolean, rect: DOMRect|null, ready: boolean }`
- **`StepBanner`**: fixed `top:0; z-index:10001`. Contains: 3px progress bar, step badge, title, 1-line description, action hint, "Got it →" button, "Skip" link. Max ~130px height.
- **`FallbackCard`**: centered card shown when target not found after retries. Shows step title + description + "Got it →" to continue.
- **`Confetti`**: keep as-is.

#### 3. `src/components/onboarding/OnboardingOverlay.tsx` — Full Rewrite

**Central Step Registry**:
```typescript
interface StepDef {
  id: number;
  route: string;
  title: string;
  description: string;
  actionHint: string;
  selector: string;
  type: 'info' | 'action'; // info=Got it, action=must interact
  fallback: 'skip' | 'show-centered';
}
```

11 steps (same as current but with `type` field):
- Steps 1–4, 6–7, 9–11: type `info` (Got it to advance)
- Steps 5, 8: type `action` (must tap nav → advance on route change detection)

**Step Readiness Gate** (new):
- Before rendering any step: check `isStepReady` state
- `isStepReady = false` until:
  1. Route matches step's required route (if not, navigate first, wait)
  2. A short delay (300ms) for DOM to render
  3. `useTargetElevation` reports `found` OR max retries exhausted
- While not ready: show only `StepBanner` with a subtle loading indicator, NO overlay, NO broken highlight
- When ready: show `BlockingOverlay` + elevated target
- If target never found (retries exhausted): show `FallbackCard` instead of overlay+highlight

**Route mismatch handling**:
- On step change: if `location.pathname !== stepDef.route`, call `navigate(stepDef.route)` and set `isStepReady = false`
- Listen for route change via `useEffect` on `location.pathname`; when it matches, start DOM readiness checks
- On app reopen mid-tour: same logic — if wrong route, navigate first

**Action step advancement** (steps 5, 8):
- Watch `location.pathname` changes; when user navigates to the target route, auto-call `advanceStep()`
- Safeguard: only auto-advance if the route change matches the expected target

**Clean step transition**:
- `useEffect` on `currentStep`: set `isStepReady = false`, which triggers cleanup in `useTargetElevation` (restores previous target styles), then starts readiness checks for new step

**Hard cleanup on skip/finish/unmount**:
- `useEffect` cleanup function removes any injected styles
- `handleSkip` and completion both call cleanup before state change
- Window `beforeunload` listener as extra safety

#### 4. `src/components/layout/BottomNav.tsx` — Simplify
- During onboarding: all tabs get `pointer-events:none; opacity:0.4` EXCEPT:
  - Tab matching current step's route (user stays on correct page)
  - For action nav steps (5→followup, 8→trackup): target tab enabled with pulsing blue dot
- After onboarding: zero conditional logic, everything normal
- Keep z-index 9500 during onboarding (between overlay 9000 and elevated target 9999)
- No changes to the core structure — just cleaner conditional logic

#### 5. `src/pages/Profile.tsx` — Simplify restart
- Keep "How to Use Nevora AI" button
- Change to call `retakeTour` (which resets to step 0, shows welcome popup)
- Remove the confirmation modal — just navigate to `/dashboard` and start

#### 6. `src/components/tracking/AITipCard.tsx` — Persistent Dismiss
- Add X close button
- On dismiss: compute stable hash of tip message → store `dismissed_tips` array in localStorage
- On render: check if current tip's hash is in dismissed set → return `null`
- Persists forever (not daily). New tip content = new hash = shows again naturally

#### 7. `src/index.css` — Clean up
- Remove unused `onb-pulse`, old overlay animations
- Add `onb-target-pulse` for elevated target glow
- Keep `animate-confetti`

#### 8. `src/pages/ListUp.tsx` — Verify `data-onboarding="prospects-tab"`
- Already present on the tab option object. Verify it renders as a DOM attribute on the actual element. If not, add it to the rendered element directly.

---

### Safety Guarantees Summary

| Scenario | Handling |
|---|---|
| Existing user | `isCompleted` defaults true; extra prospects-count guard |
| Target missing (empty list) | Capped retries → fallback card → user continues |
| Wrong route on app reopen | Auto-navigate → wait for mount → then show step |
| Scroll needed | Auto-scroll (container-aware) → wait → then highlight |
| Step transition | Full cleanup of previous styles before activating next |
| Skip / finish / unmount | Hard cleanup: remove overlays, restore pointer-events, restore styles |
| Infinite retry | Max 10 retries (3s total) then fallback |
| AI tip spam | Persistent dismiss by content hash in localStorage |
| Mobile viewport | Banner max ~130px, no content overlap, no scroll lock |

