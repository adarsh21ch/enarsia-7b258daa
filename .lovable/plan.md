

# Fix Link Preview (OG Tags) for Funnel & Form Share Links

## Problem

When you share a funnel link on WhatsApp (or any social platform), the preview shows the generic "Nevorai - Sales Follow-Up & Team Tracking System" title and description instead of the actual funnel title, thumbnail, and description. This happens because the app is a single-page application (SPA) -- social media crawlers cannot execute JavaScript, so they only see the default meta tags from the HTML file.

## Solution

Create a backend function called `og-share` that serves a small HTML page with the correct title, description, and thumbnail for each funnel or form. When WhatsApp crawls the link, it gets the right preview. When a real user clicks the link, they are automatically redirected to the actual funnel/form page.

## How It Works

1. User copies a share link (e.g., `https://nevorai.com/share/f/my-funnel-slug`)
2. WhatsApp crawler visits the link and hits the `og-share` backend function
3. The function fetches the funnel's title, description, and thumbnail from the database
4. It returns an HTML page with the correct preview tags
5. When a real user clicks the link, the page instantly redirects them to the actual funnel

## What Changes

### 1. New backend function: `og-share`
- Accepts query parameters: `type` (funnel or form) and `slug`/`token`
- Fetches the relevant data from the database
- Returns HTML with correct Open Graph meta tags (title, description, image)
- Includes an automatic redirect for real users
- Falls back to default NevorAI branding if data is missing

### 2. Update share URL format
- **`src/types/funnels.ts`** -- Update `getFunnelPublicUrl()` to generate the new share URL format pointing to the backend function
- **`src/config/siteUrl.ts`** -- Update `getFormShareUrl()` similarly for forms

### 3. Update `index.html`
- Update the default OG image URL from the Lovable placeholder to the actual NevorAI brand image/logo

## Technical Details

### Edge Function: `supabase/functions/og-share/index.ts`

The function will:
- Parse `type` and `slug`/`token` from query params
- Query the database for the funnel/form record
- Generate HTML with these OG meta tags:
  - `og:title` -- Funnel/form title
  - `og:description` -- Funnel/form description or default text
  - `og:image` -- Thumbnail URL or default brand image
  - `og:url` -- The canonical share URL
- Include a `<meta http-equiv="refresh">` and JS redirect to the actual SPA page (`/f/:slug` for funnels, `/share/form/:token` for forms)

### Share URL Format

Current: `https://app.nevorai.com/f/my-funnel-slug` (no OG tags, just SPA)

New: Points to the edge function URL which serves proper OG HTML, then redirects the user to the SPA page.

The `getFunnelPublicUrl` and `getFormShareUrl` functions will be updated to generate these new URLs.

### Files to Create
- `supabase/functions/og-share/index.ts`

### Files to Modify
- `src/types/funnels.ts` -- Update `getFunnelPublicUrl()`
- `src/config/siteUrl.ts` -- Update `getFormShareUrl()`
- `index.html` -- Replace placeholder OG image with NevorAI brand image

