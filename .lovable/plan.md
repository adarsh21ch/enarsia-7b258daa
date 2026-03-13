

## Subscription Modal UI/UX Redesign

### Current Problems
- Narrow `sm:max-w-md` dialog on desktop forces vertical stacking of plan cards
- Users must scroll to compare Basic vs Pro
- Mobile drawer also stacks everything vertically

### Plan

#### 1. Widen the modal and use side-by-side layout (desktop)

**UpgradeModal.tsx changes:**
- Desktop: Change `DialogContent` from `sm:max-w-md` to `sm:max-w-2xl` (672px) to fit two columns
- Render the two `TierCard` components in a `grid grid-cols-2 gap-4` layout on desktop
- Mobile: Keep the Drawer approach but with stacked cards (no change needed)
- Move the header (icon + title + description) outside the scrollable area so it stays fixed
- Keep the CTA button sticky at the bottom

#### 2. Redesign TierCard for comparison-friendly layout

**TierCard.tsx changes:**
- Make the card fill its column height using `flex flex-col h-full`
- Move feature list into a compact section at the top
- Billing options section grows to fill remaining space
- Pro card gets a subtle `ring-2 ring-amber-500 shadow-lg` and relative positioning for the "Recommended" badge
- Improve the billing option rows: slightly larger touch targets, clearer price hierarchy (monthly price large, total price secondary)
- Each card gets its own implicit selection — selecting any billing option within a card selects that tier

#### 3. CTA button updates

- Button text dynamically shows the selected plan name and price
- Pro selection uses amber styling, Basic uses primary
- Single CTA row below both columns, spanning full width

#### 4. Files to modify

| File | Change |
|------|--------|
| `src/components/subscription/UpgradeModal.tsx` | Wider dialog, grid layout for desktop, restructured content flow |
| `src/components/subscription/TierCard.tsx` | `h-full` flex layout, refined spacing, visual emphasis for Pro |

No backend, pricing, or plan config changes. TierCard continues to dynamically render whatever billing options it receives via props.

