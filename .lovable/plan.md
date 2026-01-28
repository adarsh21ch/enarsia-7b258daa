

# Founder-Level Admin Panel Enhancement Plan

## Summary

This plan enhances the existing admin panel to add the remaining critical features: audit logging, enhanced user details, user suspension capabilities, and tighter integration between user management and override controls.

## Current State Analysis

The admin panel already has solid foundations:
- ✅ Plans Manager with full CRUD + payment links
- ✅ Offers Manager for discounts
- ✅ Usage Limits Manager for configuring free/pro limits
- ✅ Feature Flags Manager for feature gating
- ✅ User Override Drawer for per-user overrides
- ✅ Analytics Dashboard with revenue charts
- ✅ Backend-driven configuration (no hardcoded values)

**What's missing:**
- ❌ Audit logs for tracking admin actions
- ❌ Enhanced user details (leads count, signup source, last active)
- ❌ User suspension functionality
- ❌ Users tab integration with Override Drawer
- ❌ Free→Pro conversion rate display

---

## Implementation Plan

### Phase 1: Audit Logs System

**Database Changes:**

Create a new `admin_audit_logs` table to track all admin actions:

```text
admin_audit_logs
├── id (uuid)
├── admin_user_id (uuid) - Who performed the action
├── action_type (text) - e.g., 'plan_updated', 'pro_access_granted'
├── target_type (text) - e.g., 'plan', 'user', 'limit'
├── target_id (text) - ID of the affected entity
├── old_value (jsonb) - Previous state
├── new_value (jsonb) - New state
├── description (text) - Human-readable summary
├── created_at (timestamptz)
```

**Admin-only RLS:**
- Admins can INSERT and SELECT
- Regular users cannot access

**Automatic Logging:**
- Add database triggers on admin tables to auto-log changes
- Create helper function `log_admin_action()` for manual logging

**UI Component:**
- New "Audit Log" tab in Admin panel
- Filterable list of recent actions
- Shows: timestamp, admin email, action type, description, old→new values

---

### Phase 2: Enhanced User Management

**Database Function Updates:**

Enhance `admin_search_users` RPC to return additional fields:
- `total_leads_count` - Count of prospects for user
- `source_app` - Signup source (from profiles table)
- `last_active_at` - From user_app_access table
- `is_suspended` - New suspension status

**New Suspension System:**

Add `is_suspended` boolean to profiles table:
- When suspended, user sees "Account Suspended" message
- Admin can toggle suspension from Users list
- Log suspension actions to audit log

**UI Enhancements to Users Tab:**

For each user row, display:
- Email + Display name
- Plan badge (Free/Pro/Expired)
- Total leads count
- Signup source badge (Achievers Club / Direct)
- Last active date
- Actions: Plan dropdown, Override button, Suspend toggle

Add "Override" button that opens `UserOverrideDrawer` for quick access.

---

### Phase 3: Conversion Analytics

**New Metrics:**

Add to analytics dashboard:
- Free → Pro conversion rate (total Pro users / total users who were Free)
- Conversion funnel visualization
- Average time from signup to Pro upgrade

**UI Updates:**

In Analytics tab:
- Add "Conversion Rate" KPI card
- Show trend compared to previous period

---

### Phase 4: Users Tab Improvements

**Current Issues:**
1. Users tab doesn't show Override button
2. No way to quickly access user overrides
3. Missing user detail fields

**Solution:**

Refactor Users tab to:
1. Use enhanced RPC data with more fields
2. Add "Override" icon button per user row
3. Show leads count, source, last active
4. Add suspend toggle per user
5. Better mobile layout with expandable cards

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/admin/AuditLogViewer.tsx` | Displays admin action history |
| `src/hooks/useAuditLogs.ts` | Fetches audit log data |

## Files to Modify

| File | Changes |
|------|---------|
| Database migration | Create audit_logs table, add is_suspended to profiles |
| `src/pages/Admin.tsx` | Add Audit Log tab, enhance Users tab UI |
| `src/hooks/useAdmin.ts` | Add suspension toggle, enhanced user data |
| `src/components/admin/EnhancedStatsGrid.tsx` | Add conversion rate KPI |
| `src/hooks/useAdminAnalytics.ts` | Calculate conversion rate |

---

## Database Schema Additions

### Audit Logs Table

```sql
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  old_value JSONB,
  new_value JSONB,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX idx_audit_logs_created ON admin_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON admin_audit_logs(action_type);

-- RLS: Admin-only access
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs"
  ON admin_audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create audit logs"
  ON admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

### User Suspension Column

```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;
```

---

## Audit Log Action Types

Actions to be logged:
| Action Type | Target | Description |
|-------------|--------|-------------|
| `plan_created` | plan | New subscription plan added |
| `plan_updated` | plan | Plan price/duration/status changed |
| `plan_deleted` | plan | Plan removed |
| `limit_updated` | limit | Usage limit value changed |
| `feature_flag_updated` | feature | Feature access toggled |
| `offer_created` | offer | New discount offer created |
| `offer_updated` | offer | Offer modified |
| `user_pro_granted` | user | Pro access granted |
| `user_pro_revoked` | user | Pro access revoked |
| `user_override_set` | user | Custom override applied |
| `user_suspended` | user | User account suspended |
| `user_unsuspended` | user | User account reactivated |

---

## Technical Implementation Details

### Logging Function

```sql
CREATE FUNCTION log_admin_action(
  p_action_type TEXT,
  p_target_type TEXT,
  p_target_id TEXT,
  p_old_value JSONB,
  p_new_value JSONB,
  p_description TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO admin_audit_logs (
    admin_user_id, action_type, target_type, 
    target_id, old_value, new_value, description
  ) VALUES (
    auth.uid(), p_action_type, p_target_type,
    p_target_id, p_old_value, p_new_value, p_description
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;
```

### Enhanced User Search RPC

Update existing `admin_search_users` to include:
- Leads count via subquery
- Source app from profiles
- Last active from user_app_access
- Suspension status

---

## UI Mockup: Enhanced Users Tab

```text
┌─────────────────────────────────────────────────────┐
│ [Search by email, name, upline...]  [All ▾] [Pro ▾]│
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ user@example.com                    [Pro Badge] │ │
│ │ John Doe                                        │ │
│ │ ─────────────────────────────────────────────── │ │
│ │ 📊 245 leads  │  🏷️ Achievers Club  │  ⏰ Today │ │
│ │ ─────────────────────────────────────────────── │ │
│ │ [Free ▾] [30 days ▾] → Jan 28  [💾] [⚙️] [🚫]  │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ another@email.com                  [Free Badge] │ │
│ │ Jane Smith                                      │ │
│ │ ─────────────────────────────────────────────── │ │
│ │ 📊 52 leads   │  🏷️ Direct         │  ⏰ 3d ago │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘

Legend:
[⚙️] = Override settings
[🚫] = Suspend toggle
[💾] = Save changes
```

---

## Deliverables Summary

1. **Audit Logs** - Complete tracking of all admin actions with filterable viewer
2. **Enhanced User Management** - More data per user, suspend capability, override access
3. **Conversion Analytics** - Free→Pro conversion rate KPI
4. **Integrated Experience** - Users tab connects to override drawer

---

## Security Considerations

- All audit log access restricted to admin role
- Suspension enforced at auth level (check on protected routes)
- Audit logs are immutable (no UPDATE/DELETE policies)
- Admin actions traceable for compliance

---

## Priority Order

1. **High**: Audit Logs (critical for accountability)
2. **High**: User Suspension (moderation capability)
3. **Medium**: Enhanced User Details (better admin visibility)
4. **Medium**: Override Integration in Users Tab (workflow improvement)
5. **Low**: Conversion Analytics (nice-to-have metric)

