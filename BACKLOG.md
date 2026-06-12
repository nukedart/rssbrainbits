# Feedbox Feature Backlog

Ordered by priority (top = next to implement). Each item is one `/iterate` session.
Mark items `[x]` when shipped.

---

## Quick Wins (High value, low effort — do these first)

- [x] **Mute/block keywords** — Client-side keyword filter in InboxPage; matches item title/description; persisted to localStorage. UI: Settings > Muted Keywords (add/remove list). Zero schema changes needed.
- [x] **Reading time estimate** — Already implemented in FeedItem.jsx:19 and ContentViewer.jsx:84.
- [x] **Podcast/YouTube playback speed** — Already implemented in PodcastPlayer.jsx:8 (RATES array + rate state + playbackRate).
- [x] **Export highlights to Obsidian (formatted Markdown)** — In ContentViewer highlights export menu, add "Copy for Obsidian" option: frontmatter block (`title`, `source`, `date`), each highlight as `> blockquote` with annotation and `#tags` on next line, wikilink-style `[[tag]]` index. Uses existing `highlightsToMarkdown` in exportUtils.js.
- [x] **Feed health indicator** — In ManageFeedsPage, show last-published date per feed and a "⚠ No posts in 60+ days" warning badge. Computed from cached feed data already in localStorage.
- [x] **Reading streak / habit tracker** — On StatsPage or TodayPage: GitHub-style heatmap (12 weeks × 7 days) of daily articles read. Data from `history` table already in Supabase.
- [x] **AI tag suggestions on highlight** — When NotePanel opens on a highlight, call Haiku with the highlight text and return top 3 suggested tags; show as one-click chips. Reuses existing AI infra in fetchers.js.
- [x] **Catch-up swipe-to-dismiss** — In Catch-Up filterMode on mobile, add swipe-right gesture on FeedItem to mark as read and remove from list with a spring animation.
- [x] **Inline word/term lookup** — In ContentViewer, add "Lookup" option to the highlight selection popover; calls Haiku "define/explain in 2 sentences"; shows result in a small inline tooltip or bottom sheet. Reuses AI infra.
- [ ] **Bulk select + mark read/save** — Long-press a FeedItem to enter multi-select mode; action bar appears at bottom for "Mark all read" / "Save all" / "Cancel". Works in any filter mode.

---

## Medium Effort (Build after quick wins)

- [ ] **Article translation** — Button in ContentViewer toolbar; calls Haiku "translate this to English, preserve formatting"; replaces body text in-place. Show original/translated toggle.
- [ ] **Chat with my highlights** — Input box on CardsPage: user types a question; selected highlights (filtered by active tag) are sent as context to Haiku; answer rendered below. Uses existing highlights data.
- [ ] **Image highlighting** — Tap/click an image in ContentViewer to save it as a highlight; store `type: 'image'` + `image_url` in highlights table. Show image thumbnail in HighlightsDrawer and CardsPage.

---

## Large Effort (Complex — tackle last)

- [ ] **Smart feed AI noise scoring** — Score each incoming item 1–10 for relevance using a keyword interest profile derived from user's highlight history. New `relevance_score` column. Start with keyword matching before ML.
- [ ] **Offline reading (pre-cache article text)** — Service Worker background sync: after feed fetch, extract full article text for unread items and store in IndexedDB. Reader falls back to IndexedDB when offline.
- [ ] **Newsletter subscriptions** — User gets a unique `user-id@inbound.feedbox.email`; emails routed via Cloudflare Email Workers → Edge Function → parsed as feed items. Requires email routing infrastructure.

---

## Notes

- Each item should be ONE `/iterate` session: audit → implement → `npm test` → CHANGELOG → AGENT_LOG → deploy
- Skip any item that turns out to conflict with product direction or requires infrastructure not yet in place
- Large Effort items may need planning sessions before implementation
