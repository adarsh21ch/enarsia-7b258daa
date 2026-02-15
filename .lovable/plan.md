

## Redesign: Global Tracking Settings (Remove Source Confusion)

### Problem
Users are confused by the small gear/dropdown source switchers ("Manual" vs "Application") buried inside the Personal and Total column headers of the Update Tracking drawer. They don't understand why their calling data isn't showing and think it's a bug.

### What Changes

#### 1. Remove Inline Source Dropdowns
Remove the `SourceGear` popover components from the `ManualUpdateDrawer` column headers (Personal and Total). These are the confusing gear icons next to "Personal" and "Total" in the data entry grid.

#### 2. Add Settings Icon to Tracking Page Header
Add a Settings (gear) icon button in the top-right of the Tracking page header (next to the existing "Team Tracking" button). Tapping it opens a dialog/modal.

#### 3. New "Tracking Settings" Dialog
A clean modal with two sections using radio buttons:

**A) Personal Tracking Mode**
- ( ) Manual Entry
- ( ) Automatic (From Application)
- Helper text: "Automatic mode updates your tracking from app activities like calling, follow-ups, and enrollments."

**B) Total Tracking Mode**
- ( ) Manual Entry
- ( ) Automatic (Personal + Team Auto Calculation)
- Helper text: "Automatic total tracking calculates your personal + team data automatically."

A "Save Settings" button saves to the existing `tracking_source_preferences` table (no database changes needed).

#### 4. Active Mode Status Strip
Below the ModeSelectors (Personal/Total, Leads/Funnels pills), show a subtle status bar:

```
Personal: Manual  |  Total: Automatic
```

This always-visible strip tells the user what mode is active at a glance.

#### 5. Disable Manual Inputs When Auto Mode Active
This already works -- the `ManualUpdateDrawer` already disables inputs when source is AUTO. We just add a small "Auto Mode" badge next to disabled columns instead of the gear icon.

#### 6. Profile TrackUp Section
The `ProfileTrackUp` component already reads `personalSource` from the hook. No changes needed there -- it will respect the global setting automatically.

---

### Technical Details

**No database changes required.** The `tracking_source_preferences` table and `useTrackingSourcePreferences` hook already handle persistence with `MANUAL` / `AUTO` values.

**Files to create:**
- `src/components/trackup-v2/TrackingSettingsDialog.tsx` -- New dialog with radio buttons for Personal and Total mode selection

**Files to modify:**

1. **`src/pages/Tracking.tsx`**
   - Import `TrackingSettingsDialog` and `useTrackingSourcePreferences`
   - Add `showSettings` state
   - Add Settings icon button in header (next to "Team Tracking")
   - Add active mode status strip below ModeSelectors
   - Render `TrackingSettingsDialog`

2. **`src/components/trackup-v2/ManualUpdateDrawer.tsx`**
   - Remove the `SourceGear` sub-component entirely
   - Remove the gear icons from Personal/Total column headers
   - Replace with a simple "Auto" badge when that column is in auto mode
   - Keep the existing `isPersonalDisabled` / `isTotalDisabled` logic (already works)

3. **`src/components/trackup-v2/ModeSelectors.tsx`**
   - No changes to this file (Personal/Total and Leads/Funnels dropdowns stay -- these control which DATA to view, not the source mode)

**Component structure for TrackingSettingsDialog:**
```
TrackingSettingsDialog
  - Dialog (from shadcn)
  - Section: Personal Tracking Mode
    - RadioGroup with two items: "Manual Entry" / "Automatic"
    - Description text
  - Section: Total Tracking Mode  
    - RadioGroup with two items: "Manual Entry" / "Automatic"
    - Description text
  - Save Settings button
    - Calls setPreferences() from useTrackingSourcePreferences
    - Shows toast on success
    - Closes dialog
```

**Active mode strip markup (in Tracking.tsx header):**
```
<div className="flex items-center gap-2 text-[10px] text-muted-foreground px-4 pb-2">
  <span>Personal: {personalSource === 'AUTO' ? 'Automatic' : 'Manual'}</span>
  <span>|</span>
  <span>Total: {teamSource === 'AUTO' ? 'Automatic' : 'Manual'}</span>
</div>
```

