# Enarsia — Demo Leads Onboarding Feature (Full Build Spec)

**Paste this whole file into Lovable.** Build this as a clean, complete, structural feature — NOT a quick patch. Reuse existing systems (tags, tracking, follow-up, to-do, admin, auth). When done, nothing should be left half-built and there must be no temporary/banded hacks. Prioritize a **simple, fast, non-technical-friendly UX** — most users are not tech-savvy.

---

## 1. Why we're building this (purpose)

A brand-new user opens Enarsia and sees **empty screens** — they don't know what to do or how the app works. That kills activation.

If, on first login, the app is **pre-filled with 50 realistic demo leads** — already tagged, with follow-up activity, daily tasks, and tracking numbers populated — the new user instantly *sees a working example*: "Oh, this is how I add leads, tag them, follow up, and track my numbers." They learn by example, not by reading.

They can **delete the demo data anytime** with one tap once they understand. This is a guided, self-explanatory onboarding.

---

## 2. What we want (summary)

On first login (if the admin has enabled it), seed each new user with:

1. **50 demo leads** with full details and **fake phone numbers**.
2. **Default tags applied** to those leads (response tags + personal tags + funnel/stage tags) in a set distribution.
3. **Follow-Up activity entries**, timestamped on the signup day within a fixed 1-hour window, so the Activity tab looks alive.
4. **Default daily tasks** + a friendly onboarding to-do item.
5. **Tracking numbers auto-populated** (leads, funnel, personal) for the signup date, derived from the demo tags/stages.
6. A **one-time notification** telling the user these are demo leads and how to delete them.
7. **Admin controls** to upload the demo source sheet and enable/disable the feature.

Plus a terminology change: rename **"Import"** to **"Upload"** everywhere.

---

## 3. Demo leads — data

- **50 leads**, each with: **Name, Phone (primary), WhatsApp Number (phone 2), Email, Date of Birth, Gender, City, State, Profession.**
- **All phone numbers must be FAKE** (not real, un-dialable) so nothing reaches a real person.
- The data source is an **admin-uploaded Excel/CSV** (see §8). A default demo sheet ships built-in so the feature works out of the box even before the admin uploads one.
- Every seeded lead is flagged **`is_demo = true`** so it can be identified and bulk-deleted.

---

## 4. Default tags applied to the 50 demo leads

Use the app's **existing tag system** — do not create a parallel one. Ensure these default tags exist for the user (create them if the user doesn't have them yet):

**Response / tracking tags:**
- **Video Send**
- **Registration** — marked as a **Funnel tag (⭐ star/funnel type)**, so registered people flow into the funnel.

**Personal tags:**
- **Not Picked**, **Callback**, **Busy**, **Not Interested**

**Funnel / stage tags:**
- **Day 1**, **Day 2**, **Day 3**

### 4.1 Response-tag distribution (across the 50 leads — sums to 50)

| Response tag | Count |
|---|---|
| Video Send | 10 |
| Registration (Funnel ⭐) | 10 |
| Not Picked | 15 |
| Busy | 7 |
| Callback | 5 |
| Not Interested | 3 |
| **Total** | **50** |

### 4.2 Funnel stage distribution (for the 10 "Registration" leads — sums to 10)

| Stage tag | Count |
|---|---|
| Day 1 | 5 |
| Day 2 | 3 |
| Day 3 | 2 |
| **Total** | **10** |

So the 10 Registration leads also carry a Day 1/2/3 stage, populating funnel tracking.

---

## 5. Follow-Up activity timeline

- Each tag assignment above must also create a **Follow-Up Activity entry** for that lead, **dated to the user's signup day**.
- **Spread the activity timestamps across a fixed 1-hour window on the signup day: 12:00 PM – 1:00 PM (IST).** (Distribute the ~50 entries evenly across that hour so the timeline looks natural.)
- Result: when the new user opens the **Follow-Up → Activity** tab, they see a realistic day of activity with the demo leads and their tags.

---

## 6. To-Do / Daily Tasks (seeded)

Seed these **recurring daily tasks** (the Yes/No/unset daily checklist):

1. Attend morning team meeting
2. Make 30 calls
3. Do your follow-ups
4. Attend night team meeting
5. Post 1 Instagram reel / post

Also seed **one friendly onboarding item** in the To-Do list (the free-text list), e.g.:

> "✅ This is your To-Do list — write what you want to get done today here. (Tick this box once you've read it!)"

This teaches them the To-Do feature by example.

---

## 7. Tracking (auto-populated)

- **No separate seeding needed** — Tracking should compute from the demo leads' tags/stages/activity dated to the signup day. Ensure the demo data flows into:
  - **Leads tracking** (Video Send, etc.),
  - **Funnel tracking** (Day 1/2/3 from the Registration leads),
  - **Personal tracking** (Not Picked, Busy, Callback, Not Interested).
- So on the signup date, the Tracking tab already shows filled numbers — the user sees tracking working automatically.
- Make sure the tracking-cache invalidation runs after seeding so numbers appear immediately.

---

## 8. Admin controls (Admin Panel → Manage → Demo Leads)

Add a **"Demo Leads"** section under Admin → Manage:

- **Enable / Disable toggle.** If **enabled**, every new user gets demo leads on first login. If **disabled**, new users get nothing.
- **Upload demo source sheet:** admin uploads an Excel/CSV of the 50 demo leads (same column set as §3). This becomes the master template seeded to new users. Show a preview/row count after upload.
- Show which sheet is currently active and how many demo rows it contains.
- Optional: a button to **seed existing users** (so current users can also receive demo leads once) — but the default behavior targets new signups.

---

## 9. One-time user notification

- The first time a seeded user views their leads, show a **one-time, dismissible banner/notice**:

  > "👋 These are demo leads to help you learn Enarsia. Add your real leads anytime — and you can delete all demo leads from here whenever you're ready."

- Include a **"Delete demo leads"** action that removes all `is_demo = true` rows for that user (and their seeded demo tasks/activity), in one tap, with a confirm.
- Show this notice only once (store a flag); don't nag.

---

## 10. Terminology change: "Import" → "Upload"

- Rename **"Import"** to **"Upload"** everywhere it appears (button, modal title, menu items, etc.). "Import" confuses non-tech users; "Upload" is universally understood.
- Example copy: **"Upload your list"**, **"Upload leads"**, **"Upload your leads to Enarsia."**
- This is a label change only — do not change the underlying upload/mapping logic.

---

## 11. Backend spec (clean — reuse, don't hack)

- **`prospects` table:** add `is_demo boolean default false`. All seeded demo leads set `is_demo = true`.
- **`profiles` (or a flags table):** add `demo_seeded boolean default false` and `demo_notice_seen boolean default false` per user, so seeding runs **once** and the notice shows once.
- **Demo master data:** store the admin-uploaded demo sheet (parsed rows) in a table, e.g. `demo_leads_master (id, name, phone, whatsapp, email, dob, gender, city, state, profession, sort_order)`, plus an admin config flag `demo_leads_enabled boolean`.
- **Seeding routine (server-side, runs once on first login when enabled):**
  1. If `demo_leads_enabled` and `profiles.demo_seeded = false`:
  2. Insert 50 prospects for the user from `demo_leads_master`, `is_demo = true`.
  3. Ensure the default tags exist for the user (Video Send, Registration[funnel], Not Picked, Callback, Busy, Not Interested, Day 1/2/3).
  4. Apply response tags per §4.1 and stage tags per §4.2.
  5. Create Follow-Up activity entries timestamped across 12:00–13:00 on signup day (§5).
  6. Seed the daily tasks + onboarding to-do item (§6).
  7. Trigger tracking recompute / cache invalidation (§7).
  8. Set `profiles.demo_seeded = true`.
- **RLS:** demo leads belong to the user (`auth.uid() = user_id`), same as normal leads. Master demo data + enable flag are admin-only to write, readable by the seeding routine.
- Use the existing tag, activity, task, and tracking tables/logic — the demo data is just normal data flagged `is_demo`, so every feature treats it identically and the user can edit/delete it like real data.

---

## 12. UI / UX requirements

- Non-tech friendly: the demo data should make the app feel **alive and self-explanatory** on first open.
- The one-time notice is friendly, short, and easy to dismiss; the "Delete demo leads" action is obvious and safe (with confirm).
- "Upload" wording everywhere instead of "Import."
- No clutter, no complexity added for the user — seeding happens silently in the background; the user just sees a populated, working app.

---

## 13. Engineering quality guardrails (READ CAREFULLY)

- **No patchwork / temporary hacks.** Proper schema + a clean, idempotent seeding routine.
- **Idempotent:** seeding must run **exactly once per user** (guard with `demo_seeded`). Never double-seed.
- Demo leads must be **fully normal data** (editable, deletable, taggable) — just flagged `is_demo`.
- **"Delete demo leads" must fully clean up** the user's demo leads (and their seeded demo activity/tasks) without touching any real data the user added.
- Tracking numbers must appear immediately after seeding (invalidate caches).
- **No regressions** to existing leads, tags, tracking, follow-up, to-do, or admin.

---

## 14. Acceptance criteria

- [ ] Admin → Manage → Demo Leads exists, with an enable/disable toggle and demo-sheet upload + row count.
- [ ] With the toggle ON, a brand-new user lands with 50 demo leads (fake numbers) on first login.
- [ ] Response tags match §4.1 distribution (Video Send 10, Registration 10, Not Picked 15, Busy 7, Callback 5, Not Interested 3).
- [ ] Registration leads carry Day 1/2/3 per §4.2 and appear in funnel tracking.
- [ ] Follow-Up → Activity shows the demo activity dated to signup day, spread 12:00–1:00 PM.
- [ ] To-Do shows the 5 seeded daily tasks + the onboarding to-do item.
- [ ] Tracking (leads, funnel, personal) shows populated numbers for the signup date immediately.
- [ ] A one-time notice explains the demo leads and offers a one-tap "Delete demo leads."
- [ ] "Delete demo leads" removes only demo data, leaving any real data intact.
- [ ] Seeding runs exactly once per user (no duplicates).
- [ ] With the toggle OFF, new users get no demo data.
- [ ] "Import" is renamed to "Upload" everywhere (label only).
- [ ] Clean, complete implementation — no half-built parts, no temporary hacks.

---

## 15. Out of scope

- Do not change pricing, the landing page, or the Academy.
- Do not alter the upload/column-mapping logic beyond the "Import → Upload" rename.
