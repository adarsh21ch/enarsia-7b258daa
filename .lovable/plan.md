## Goal
Make the Edit Topic dialog cleaner by hiding the Instagram URL and YouTube URL inputs behind opt-in toggles, instead of always rendering both empty fields.

## Changes (src/pages/creator/Ideas.tsx — Edit Topic dialog only)

1. Replace the always-visible "Instagram URL" and "YouTube URL" input blocks with a compact "Attach link" row containing two small buttons: **Instagram** and **YouTube**.
2. State rules:
   - If the topic already has a saved `instagram_url` → show the Instagram input expanded by default (so existing data stays visible/editable).
   - Same for `youtube_url`.
   - Otherwise the field stays hidden until the user clicks the matching button.
3. Clicking a button reveals its input inline (with placeholder + the existing LinkPreviewCard below when a valid URL is entered) and auto-focuses it. Clicking it again (or a small ✕ on the revealed field) hides and clears that URL.
4. Only one styling pass — same input look as today, just conditionally rendered. No layout changes to Title / Category / Context / Audio sections.
5. Topics tab composer (the bottom bar) is NOT touched — paste-to-attach behavior there stays as is.
6. Network Marketing mode untouched. No schema or hook changes.

## Acceptance
- Opening Edit Topic on a topic with no links shows just two small "Instagram" / "YouTube" chips, no empty URL inputs.
- Opening it on a topic that already has a YouTube URL shows the YouTube field expanded with the preview card; Instagram still collapsed.
- Toggling a chip reveals/hides the corresponding input and clears the value on hide.
- Save still persists `instagram_url` / `youtube_url` correctly.
- Clean `bun run build`.