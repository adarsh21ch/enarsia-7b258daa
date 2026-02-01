
# Separate Authentication for Achievers Club and Nevorai

## Problem Analysis

Both Achievers Club and Nevorai currently share the **same authentication system**. When Achievers Club provisions a user or when a user signs up through Achievers Club, they get an entry in `auth.users`. Then when the same person tries to sign up for Nevorai, they see "An account with this email already exists."

**Current flow causing issues:**
1. User joins Achievers Club → Entry created in `auth.users`
2. Same user tries to sign up for Nevorai → `send-otp` checks `auth.admin.listUsers()` 
3. System finds the user → Returns "already registered" error

---

## Proposed Solution

Instead of trying to separate the Supabase auth entirely (which would require major infrastructure changes), we'll implement a **product-scoped authentication model**:

- Keep the shared `auth.users` table (this is necessary for Supabase)
- Track which products each user has access to using a new `user_products` table
- Modify signup/login flows to check product access instead of just user existence

### Why This Approach?

1. **No infrastructure changes needed** - both apps can keep using the same Supabase project
2. **Same email can "sign up" for both products** - system creates appropriate product access
3. **Independent experiences** - each product manages its own onboarding

---

## Technical Implementation

### 1. Database Changes

**Create new `user_products` table:**
```sql
CREATE TABLE user_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product text NOT NULL, -- 'nevorai' or 'achievers_club'
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product)
);
```

This tracks which products each user has actively signed up for.

### 2. Update `send-otp` Function

**Before:** Blocks signup if user exists in `auth.users`
**After:** Only blocks if user exists AND has 'nevorai' product access

```typescript
// Check if user already has Nevorai access (not just exists)
const { data: existingProfile } = await supabase
  .from('user_products')
  .select('id')
  .eq('email', normalizedEmail)  
  .eq('product', 'nevorai')
  .maybeSingle();

if (existingProfile) {
  return jsonResponse({ 
    success: false, 
    error: 'You already have a Nevorai account. Please sign in instead.' 
  }, 400);
}
// If no Nevorai access, allow signup (even if auth.users entry exists)
```

### 3. Update `verify-otp-and-signup` Function

**Before:** Creates new auth.user, fails if exists
**After:** If user exists but no Nevorai access, grant Nevorai access instead of failing

```typescript
// Check if user exists in auth
const existingUser = await supabase.auth.admin.listUsers()
  .then(r => r.data?.users?.find(u => u.email?.toLowerCase() === normalizedEmail));

if (existingUser) {
  // User exists - check if they have Nevorai access
  const { data: hasNevorai } = await supabase
    .from('user_products')
    .select('id')
    .eq('user_id', existingUser.id)
    .eq('product', 'nevorai')
    .maybeSingle();

  if (hasNevorai) {
    // Already has Nevorai - tell them to sign in
    return jsonResponse({ 
      error: 'You already have a Nevorai account. Please sign in.' 
    }, 400);
  }

  // Grant Nevorai access to existing user
  await supabase.from('user_products').insert({
    user_id: existingUser.id,
    product: 'nevorai'
  });

  // Update their password if provided (they're "creating" their Nevorai account)
  await supabase.auth.admin.updateUserById(existingUser.id, { password });

  // Update profile
  await supabase.from('profiles').update({ 
    display_name: name.trim() 
  }).eq('user_id', existingUser.id);

  return jsonResponse({ success: true, message: 'Nevorai account activated!' });
}

// User doesn't exist - create new auth.user as normal
```

### 4. Update Login Flow

No changes needed for login - existing login works for all users regardless of product.

### 5. Migrate Existing Users

Run a one-time migration to populate `user_products` for existing users:

```sql
-- Grant Nevorai access to all existing Nevorai users
INSERT INTO user_products (user_id, product)
SELECT user_id, 'nevorai' FROM profiles
WHERE source_app IS NULL OR source_app != 'achievers_club'
ON CONFLICT DO NOTHING;

-- Grant Achievers Club access to AC users
INSERT INTO user_products (user_id, product)
SELECT user_id, 'achievers_club' FROM profiles
WHERE source_app = 'achievers_club' OR source_app = 'achievers_club_linked'
ON CONFLICT DO NOTHING;
```

---

## User Experience After Changes

### Scenario 1: Achievers Club user signs up for Nevorai
1. User enters email → OTP sent (no "already registered" error)
2. User verifies OTP and sets password
3. System grants Nevorai access, updates password
4. User can now login to both products with same credentials

### Scenario 2: Nevorai user signs up for Achievers Club
1. User enters email → AC system checks for AC access (not Nevorai)
2. If no AC access → allow signup, grant AC access
3. Both products share same login credentials

### Scenario 3: New user signs up for Nevorai
1. Normal signup flow - creates auth.user + grants Nevorai access

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/xxx.sql` | Create `user_products` table + migration |
| `supabase/functions/send-otp/index.ts` | Check product access instead of user existence |
| `supabase/functions/verify-otp-and-signup/index.ts` | Handle existing users, grant product access |
| `supabase/functions/cross-app-auth/index.ts` | Update to use product-based model |

---

## Benefits

- No "already registered" confusion
- Same email works independently in both products
- Shared credentials (optional - users can set different passwords)
- Clean separation without infrastructure changes
- Easy to add more products in the future

---

## Testing Checklist

After implementation:
- [ ] Achievers Club user can "sign up" for Nevorai without errors
- [ ] New users can sign up for Nevorai normally
- [ ] Existing Nevorai users cannot sign up again (get appropriate message)
- [ ] Login works for all users regardless of which product they signed up through
- [ ] Password changes work correctly
