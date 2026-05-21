# New Direcall Logo

Replace the existing Nevorai logo with a unique, brandable Direcall logo built for a calling app aimed at network marketers and direct sellers.

## Concept

A monogram **"D"** formed from a phone-call wave/arrow — the curve of the "D" doubles as an outbound sound wave, with a subtle arrow tip suggesting "direct". Reads as both a letter and a call signal. Works flat, in a circle (favicon/app icon), and in pure black or white.

- Color: brand blue (#3B82F6) → deeper indigo gradient on the primary mark
- Mono versions: solid black and solid white (1-color) for print, dark mode, embossing
- Geometric, rounded, modern — feels closer to Linear/Superhuman than a generic CRM

## Deliverables

1. **Primary logo (color)** — `src/assets/direcall-logo.png` (transparent, square, 1024×1024)
2. **Wordmark lockup** — `src/assets/direcall-wordmark.png` (icon + "Direcall" text, transparent)
3. **Mono black** — `src/assets/direcall-logo-black.png`
4. **Mono white** — `src/assets/direcall-logo-white.png`
5. **Favicon + PWA icons** — overwrite `public/favicon.png`, `public/icons/icon-192.png`, `public/icons/icon-512.png` (derived from the primary mark on solid brand background for maskable safety)

## Code changes

- Replace `src/assets/nevorai-logo.jpeg` imports across the app with the new `direcall-logo.png` (Header, Auth, ResetPassword, PaymentSuccess, InstallPromptBanner, onboarding popups, etc.)
- Keep `alt="Direcall"` (already done in rebrand)
- Update `index.html` `<meta name="theme-color">` if logo gradient shifts the brand color (likely stays #3B82F6)
- Leave the old `nevorai-logo.jpeg` file in place for now (unreferenced) so nothing breaks during rollout; delete in a follow-up

## Out of scope

- No marketing site / OG image regeneration (separate task)
- No animated splash screen
- No change to brand color tokens in `index.css`

## Process

1. Generate primary color mark (premium model, transparent PNG)
2. Generate mono black + mono white variants
3. Generate wordmark lockup
4. Generate favicon + 192/512 app icons (solid bg, maskable safe area)
5. Swap imports across the codebase in one pass
6. QA: view each generated PNG, confirm legibility at 32×32 and 16×16, confirm light/dark backgrounds
