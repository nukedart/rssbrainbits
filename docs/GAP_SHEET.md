# Feedbox — User Value vs. App Difference Sheet

Source: user value form (2026-10-17) compared against the code at v2.0.1.
Status values were checked in source, not assumed. Nothing here has been click-tested in a signed-in browser yet.

## Difference sheet

| # | User want | Feedbox today (verified) | Gap | Pri |
|---|---|---|---|---|
| 1 | Fast, calm inbox | Unread/All/Saved tabs, smart feeds, mute keywords, catch-up | None | — |
| 2 | Frictionless highlighting | Highlight-first reader, selection toolbar, per-highlight notes | None known | — |
| 3 | Notes in own words | Annotation per highlight; article notes removed by design | None | — |
| 4 | Browse by theme | Tags editable per card in `CardsPage.jsx`; filter by tag | **No tag rename / merge / delete-everywhere** (no code for it) | P1 |
| 5 | Resurface what I captured | Review (spaced repetition), due-count badge on nav | **Onboarding never introduces Review** — feed picker only | P1 |
| 6 | Clean reading | Readability, Aa sheet, themes, TTS | Visual consistency pass in progress (radii done; spacing/type not) | P2 |
| 7 | Trust, no data loss | Supabase sync, SWR feed cache, SW asset cache | **Unverified end to end** — no signed-in functional test run | P0 |
| 8 | Data out | Markdown + **Obsidian** export (`exportUtils.js`), OPML | Export is per article only; no "export all highlights" or Notion/Readwise format | P2 |
| 9 | Free tier feels fair | Free: 10 feeds, 25 read-later, 5 AI summaries/day | Unvalidated — may be too tight for heavy RSS users | P3 |

Correction to the earlier value form: it listed Obsidian export as a gap. It exists (`highlightsToObsidian`); the real gap is bulk export.

## Sprints

### Sprint 1 — Confidence (P0)
- Signed-in functional test of Inbox, Reader, highlight/annotate, Cards, Review, Today, mobile nav. Pedro signs in; Claude drives.
- Add unit tests for saved/unread filtering and `exportUtils.js`.
- Fix whatever the test finds.
- Done when: a written pass/fail list exists and all P0 failures are fixed.

### Sprint 2 — Close the loop (P1)
- Onboarding step: explain Highlight → Tag → Review, and show the due count.
- Tag management: rename, merge, delete a tag across all cards (`supabase.js` + Cards UI).
- Done when: a new user sees Review explained before first article; renaming a tag updates every card carrying it.

### Sprint 3 — Polish and portability (P2)
- Spacing and typography pass using screenshots (Inbox, Reader, Cards, Review, Today).
- "Export all highlights" (Markdown/Obsidian, zipped by article) from Cards or Settings.
- Done when: gutters and gaps follow one scale on every primary screen; bulk export downloads a valid file.

### Sprint 4 — Validate (P3)
- Interview 5 heavy readers using the questions in the value form.
- Revisit free-tier limits and Pro candidates based on answers.

## Open question
Native (iOS/macOS) has its own backlog (`native/BACKLOG.md`); this sheet covers web only.
