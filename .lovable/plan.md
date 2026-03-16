

# Plan: Nevorai Notes — MVP

## Scope (Apple Notes / Samsung Notes style)

**Included:**
- Rich text notes (bold, italic, lists, checklists)
- Audio recording & playback (voice memos)
- Photo attachments (camera/gallery)
- Clickable links with smart detection (YouTube, Zoom, PDF URLs auto-preview)
- Tappable phone numbers (call/text)
- Color labels, pinning, search
- Folders/tags for organization

**Excluded (for now):**
- Video recording/attachment
- Team sharing
- Prospect linking (can add later)

---

## Database

Create a `notes` table and a `note_attachments` table, plus a `note-attachments` storage bucket.

```sql
-- notes table
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content JSONB NOT NULL DEFAULT '[]',  -- rich text blocks
  color_label TEXT DEFAULT 'default',
  is_pinned BOOLEAN DEFAULT false,
  folder TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- note_attachments (photos + audio)
CREATE TABLE public.note_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('photo', 'audio')),
  storage_path TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  duration_seconds INTEGER, -- for audio
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-attachments', 'note-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: users can only access their own notes & attachments
```

## File Structure

```text
src/
├── pages/Notes.tsx                    -- Main notes list page
├── pages/NoteEditor.tsx               -- Single note editor
├── components/notes/
│   ├── NoteCard.tsx                   -- Grid/list card preview
│   ├── NoteToolbar.tsx                -- Bold, list, checklist, attach, audio, color
│   ├── RichTextEditor.tsx             -- Block-based editor (paragraphs, lists, checklists)
│   ├── AudioRecorder.tsx              -- Record & playback voice memos
│   ├── PhotoAttachment.tsx            -- Camera/gallery picker + grid display
│   ├── LinkPreview.tsx                -- Smart link detection (YT, Zoom, PDF, phone)
│   ├── FolderSidebar.tsx              -- Folder/tag filter
│   └── NoteSearchBar.tsx              -- Full-text search across notes
├── hooks/
│   ├── useNotes.ts                    -- CRUD operations
│   └── useNoteAttachments.ts          -- Upload/delete attachments
```

## Routes & Navigation

- Add `/notes` route in `App.tsx`
- Add "Notes" entry in Profile page (similar to other menu items) with a notebook icon
- Notes page: masonry/grid of note cards, FAB to create new note, search bar, folder filter

## Key Features Detail

### Rich Text Editor
- Lightweight block-based editor (no heavy library needed)
- Each block: `{ type: 'text'|'checklist'|'heading', content: string, checked?: boolean, style?: 'bold'|'italic' }`
- Stored as JSON array in `content` column

### Audio Recording
- Use browser `MediaRecorder` API
- Record → upload to `note-attachments` bucket
- Inline playback with waveform-style progress bar
- Max 5 minutes per recording

### Photo Attachments
- File input (camera + gallery on mobile)
- Upload to `note-attachments` bucket
- Display as inline thumbnails in the note

### Smart Link Detection
- Auto-detect URLs in text, render as tappable links
- Phone numbers: detect patterns like `+91 98765 43210`, render with call/WhatsApp buttons
- YouTube links: show thumbnail preview
- Other links (Zoom, PDF): show favicon + domain label

### Color Labels & Pinning
- 6 color options (default, red, orange, yellow, green, blue)
- Pin to top of list
- Sort: pinned first, then by `updated_at` desc

## Summary of Changes

| Area | Change |
|------|--------|
| Database | Create `notes`, `note_attachments` tables + storage bucket + RLS |
| `App.tsx` | Add `/notes` and `/notes/:id` routes |
| `Profile.tsx` | Add "Notes" menu item |
| New pages | `Notes.tsx` (list), `NoteEditor.tsx` (editor) |
| New components | 7 components in `src/components/notes/` |
| New hooks | `useNotes.ts`, `useNoteAttachments.ts` |

