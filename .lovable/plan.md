

# Time-Based Free Trial Feature Implementation Plan

## Overview

You want to add a **day-wise limit** option in the admin panel that works as an alternative to lead-based limits. When enabled:
- New/existing free users get X days of free trial (e.g., 7 days)
- During the trial, they can use the app without lead limits
- After the trial expires, they see an upgrade prompt

This gives you flexibility to choose between:
1. **Lead-based limits only** (current system)
2. **Time-based trial only** (new system)
3. **Both combined** (e.g., 7-day trial + 200 lead limit)

---

## How It Will Work

### Admin Panel Controls

A new "Trial Period" section in the Limits tab with:

| Setting | Description | Example |
|---------|-------------|---------|
| **Enable Free Trial** | Toggle to activate time-based trial | ON/OFF |
| **Trial Duration (Days)** | Number of days for free trial | 7 |
| **Use Trial Only** | If ON, disable lead limits during trial | ON/OFF |

### User Experience Flow

```text
NEW USER SIGNS UP
       |
       v
  Is Free Trial Enabled?
       |
   YES |           NO
       v            v
  Show Welcome    Apply Lead
  "7-Day Trial!"   Limits
       |
       v
  User uses app freely
  (or with lead limits if combined)
       |
       v
  Trial Expires?
       |
   YES |
       v
  Show Upgrade Modal:
  "Your 7-day trial has ended"
```

### For Existing Users

When you enable the trial:
- Their trial starts from their original signup date (`profiles.created_at`)
- If they signed up 10 days ago and trial is 7 days: Trial already expired
- Option: Admin can set "Trial Start Date" as "Today" for all existing users (reset trial)

---

## Technical Implementation

### Phase 1: Database Changes

**Add new limit configurations to `admin_usage_limits`:**

```sql
INSERT INTO admin_usage_limits (config_key, config_value, description, is_enabled) VALUES
('free_trial_days', 7, 'Number of free trial days for new users', false),
('trial_only_mode', 0, 'If 1, disable lead limits during active trial', false);
```

**Update `check_upload_limit` function to include trial logic:**

The function will check:
1. Is free trial enabled?
2. Is user still within trial period? (Compare `profiles.created_at` + trial days vs now)
3. Is "trial only mode" enabled?

If trial is active and trial-only mode is ON: Allow unlimited uploads
If trial is expired: Apply normal lead limits OR block with "Trial ended" message

### Phase 2: Admin Panel UI

**Update `UsageLimitsManager.tsx`:**

Add a new "Trial Period" category with:
- Toggle: Enable Free Trial (is_enabled)
- Input: Trial Duration in Days (config_value)
- Toggle: Trial Only Mode (disable lead limits during trial)

```typescript
const LIMIT_CATEGORIES = {
  'Trial Period': ['free_trial_days', 'trial_only_mode'],
  'Lead Limits': ['free_total_leads', 'free_daily_upload', 'pro_daily_upload'],
  // ... existing categories
};

const LIMIT_ICONS: Record<string, React.ReactNode> = {
  free_trial_days: <Clock className="h-4 w-4" />,
  trial_only_mode: <Timer className="h-4 w-4" />,
  // ... existing icons
};
```

### Phase 3: Frontend Hooks

**Create `useFreeTrial` hook:**

```typescript
export function useFreeTrial() {
  const { profile } = useProfile();
  const { config } = useAdminConfig();
  const { isPaid } = useSubscription();
  
  const trialEnabled = config.limits.free_trial_days !== undefined 
    && config.limits.free_trial_days > 0;
  const trialDays = config.limits.free_trial_days ?? 0;
  
  const signupDate = profile?.created_at;
  const trialEndDate = signupDate 
    ? addDays(new Date(signupDate), trialDays) 
    : null;
  
  const isTrialActive = trialEndDate && new Date() < trialEndDate;
  const isTrialExpired = trialEndDate && new Date() >= trialEndDate;
  const daysRemaining = trialEndDate 
    ? Math.max(0, differenceInDays(trialEndDate, new Date())) 
    : 0;
  
  return {
    trialEnabled,
    trialDays,
    isTrialActive: !isPaid && isTrialActive,
    isTrialExpired: !isPaid && isTrialExpired,
    daysRemaining,
    trialEndDate,
  };
}
```

**Update limit enforcement:**

Modify `check_upload_limit` RPC to check trial status:

```sql
-- Inside check_upload_limit function
DECLARE
  v_trial_enabled boolean;
  v_trial_days integer;
  v_trial_only_mode boolean;
  v_user_created_at timestamptz;
  v_trial_end_date timestamptz;
  v_is_trial_active boolean;
BEGIN
  -- Get trial settings
  SELECT is_enabled, config_value INTO v_trial_enabled, v_trial_days
  FROM admin_usage_limits WHERE config_key = 'free_trial_days';
  
  SELECT is_enabled INTO v_trial_only_mode
  FROM admin_usage_limits WHERE config_key = 'trial_only_mode';
  
  -- Get user signup date
  SELECT created_at INTO v_user_created_at
  FROM profiles WHERE user_id = p_user_id;
  
  -- Calculate if trial is active
  v_trial_end_date := v_user_created_at + (v_trial_days || ' days')::interval;
  v_is_trial_active := v_trial_enabled AND now() < v_trial_end_date;
  
  -- If trial active and trial-only mode: allow unlimited
  IF v_is_trial_active AND v_trial_only_mode THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', '',
      'limit_type', 'free_trial',
      'trial_days_remaining', EXTRACT(DAY FROM v_trial_end_date - now())::integer
    );
  END IF;
  
  -- If trial expired and trial-only mode: block
  IF v_trial_enabled AND v_trial_only_mode AND NOT v_is_trial_active THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Your free trial has ended. Upgrade to Pro to continue.',
      'limit_type', 'trial_expired'
    );
  END IF;
  
  -- Otherwise, apply normal lead limits...
END;
```

### Phase 4: User Interface Updates

**Welcome Banner (new users):**

Show a celebratory banner for users with active trial:

```typescript
// In Home.tsx or a global component
const { isTrialActive, daysRemaining } = useFreeTrial();

{isTrialActive && (
  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
    <div className="flex items-center gap-2">
      <Gift className="h-5 w-5 text-green-500" />
      <span className="font-medium">🎉 {daysRemaining} days left in your free trial!</span>
    </div>
  </div>
)}
```

**Trial Expired Modal:**

When trial expires and trial-only mode is on, show upgrade modal with trial-specific messaging:

```typescript
// TrialExpiredModal.tsx
<DialogTitle>Your Free Trial Has Ended</DialogTitle>
<DialogDescription>
  You've completed your {trialDays}-day free trial. 
  Upgrade to Pro to continue using all features.
</DialogDescription>
```

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/hooks/useFreeTrial.ts` | Trial status checking hook |
| `src/components/subscription/TrialExpiredModal.tsx` | Modal for expired trials |
| `src/components/subscription/TrialBanner.tsx` | Banner showing trial status |

### Modified Files
| File | Changes |
|------|---------|
| `UsageLimitsManager.tsx` | Add Trial Period section UI |
| `useAdminConfig.ts` | Add trial limits to SAFE_DEFAULTS |
| `check_upload_limit` (RPC) | Add trial checking logic |
| `Home.tsx` or `ListUp.tsx` | Show trial banner |
| `HardLimitModal.tsx` | Add trial-expired variant |

### Database Migration
- Insert `free_trial_days` and `trial_only_mode` rows in `admin_usage_limits`
- Update `check_upload_limit` function with trial logic
- Update `get_app_config` to include trial settings

---

## Admin Workflow

1. Go to Admin Panel > Limits tab
2. See new "Trial Period" section at top
3. Enable "Free Trial Days" toggle
4. Set value to 7 (or any number)
5. Optionally enable "Trial Only Mode" to disable lead limits during trial
6. Save changes
7. All free users now follow trial rules

---

## Expected Outcomes

After implementation:
- Admin can enable 7-day (or any) free trial from the Limits panel
- New users see "7 days free trial!" welcome message
- During trial, users can use app without hitting lead limits (if trial-only mode is on)
- After trial expires, upgrade modal appears with trial-specific messaging
- Existing users' trial is calculated from their original signup date
- System is flexible: can use trial only, lead limits only, or both

