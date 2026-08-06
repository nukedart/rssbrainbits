# Feedbox Feature Backlog

Ordered by priority (top = next to implement). Each item is one `/iterate` session.
Mark items `[x]` when shipped.

---

## 🔍 Audit findings — 2026-07-27 (next orchestration)

Full-app audit (UX, perf, backend/security, competitive gap, test coverage). All findings below were verified against the actual code, not taken on a worker's word.

### Security (do first)

- [ ] **[SECURITY-High] Cloudflare Worker AI endpoints have no real auth** — `cloudflare-worker/worker.js:100-260` (summarize/ask/tags handlers). The only gate is `corsHeaders()` (`worker.js:338-347`), which just echoes the Origin back — CORS is a browser-enforced convention, not a server check. Anyone with `curl` can hit these directly and burn the owner's `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` with zero rate limiting. Fix: require a shared-secret header or validated Supabase JWT worker-side, plus basic rate limiting.
- [ ] **[SECURITY-High] Orphaned `notes` feature — dead code + phantom DB table** — `src/lib/supabase.js:200-241` reads/writes a `notes` table that does not exist anywhere in `supabase-schema.sql` (verified: zero matches). The only consumers, `src/components/NotesPage.jsx` and `src/components/ArticleNotesPanel.jsx`, are not imported by `App.jsx` or any page — fully unreachable UI (verified via repo-wide grep). This also contradicts CLAUDE.md's explicit "we do NOT build article-level notes" decision. Fix: check prod DB for an actual `notes` table/data; if present, either delete it and this dead code entirely, or add RLS + schema entry if it turns out to be silently used. Given it's unreachable, deletion is almost certainly correct.
- [ ] **[SECURITY-Med] Incomplete SSRF protection in RSS proxy** — `cloudflare-worker/worker.js:280-289` blocks `localhost`/`127.0.0.1`/`192.168.*`/`10.*`/`172.16.*` by string prefix, but misses `169.254.*` (cloud metadata endpoints), the rest of the `172.16.0.0/12` range, `0.0.0.0`, and IPv6 loopback/link-local. Fix: CIDR-based checks instead of string prefixes.

### Quick wins

- [ ] **Fix duplicate/mismatched folder color maps** — `src/components/Sidebar.jsx:8-9` vs `src/pages/SecondaryPages.jsx:925,1146-1147` define the same color keys with different hex values (e.g. "teal" is `#accfae` in one place and `#2DA66E` in another; "amber" similarly differs) — verified by grep. Same folder can show a different dot color depending on which page you're on. Fix: single shared map in `src/lib/tokens.js`.
- [ ] **BottomNav overflow risk on narrow phones** — `src/components/BottomNav.jsx:95-114,116-129` — 6 fixed-shrink buttons inside a capped-width pill with no overflow handling can bleed past the rounded edge on 320px screens; tap width is also borderline (~42px, under the 44px guideline).
- [ ] **Modal close buttons under 44px tap target** — `FolderModal.jsx:51`, `SmartFeedModal.jsx:73`, `PWAInstallBanner.jsx:91` (28×28), `HighlightsDrawer.jsx:63` (32×32).
- [ ] **ErrorBoundary ignores theme** — `src/components/ErrorBoundary.jsx:36-92` hardcodes ~10 hex values, so a crash always renders a dark UI even for Light/Distilled theme users. Fix: fall back to `tokens.js` defaults.
- [ ] **Refresh stale Lighthouse baseline** — `scripts/perf-history.json` has one datapoint from 2026-03-30 (~4 months old); any regression since is invisible. Run `npm run perf` to add a current entry. (Bundle/render-perf otherwise already in good shape — lazy-loading and memoization are already correctly applied app-wide, verified.)
- [ ] **Delete 2 verified-dead exports** — `src/lib/apiKeys.js:9` (`setAiProvider`, never called outside its own file) and `src/lib/readerPrefs.js:49` (`applyBionicToText`, no callers found anywhere).

### Medium effort

- [ ] **Annotation-specific streak (not reading streak)** — `src/pages/TodayPage.jsx:72-84` currently tracks a streak of articles *read*. The product's primary action is highlighting, not consumption — a streak tied to highlights/notes created would reinforce the actual habit loop the app is designed around.
- [ ] **Silent error swallowing in supabase.js** — 52 of 54 `{ data, error }` destructures (e.g. `supabase.js:80,94,102,116,125,146,151,156,179,241,556`) never check `error` — failed writes fail silently while the UI reports success. Worth a pass adding error surfacing (toast/console) at least for writes.
- [ ] **Daily/weekly email digest of due review cards** — Review currently only surfaces cards when the user opens the page, so due cards can silently pile up. Readwise's email nudge is their strongest retention lever for the same review-loop problem.
- [ ] **Hierarchical/nested tags** — tags are currently flat; the Zettelkasten indexing philosophy the product is modeled on relies on a hierarchy, not just flat labels.
- [ ] **Test coverage for `src/lib/supabase.js` and `src/lib/fetchers.js`** — both at 0% coverage (938 and 666 lines respectively) despite being the two most critical files (DB access, RSS fetch, AI summaries). Everything else in `src/lib` that _has_ tests is at 100% statement coverage, so this is a real gap, not a general deficiency.

### Large effort

- [ ] **Structured highlight/card export API or two-way sync** — current export is a one-shot Markdown copy; a real API or Notion/Obsidian-style live sync would let the card graph live in the user's broader PKM stack.
- [ ] **"On this day" / periodic resurfacing outside the spaced-repetition queue** — surfaces forgotten cards even when not formally "due," reinforcing long-term recall.
- [ ] **AI-suggested synthesis note across co-tagged highlights** — one step past the existing "related highlights" clustering: draft the connective sentence between two highlights under the same tag.
- [ ] **Newsletter subscriptions** *(carried over, unchanged — see below)*.

**Explicitly considered and excluded** (conflict with CLAUDE.md's "do NOT build" list): public/social highlight sharing, Feedly Boards-style shared collections/teams. Also excluded as already shipped: related-cards graph and cross-tag linking (`src/lib/zettel.js`), full SM2-style spaced repetition (`ReviewPage.jsx`) — both already implemented, don't re-propose.

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
- [x] **Bulk select + mark read/save** — Long-press a FeedItem to enter multi-select mode; action bar appears at bottom for "Mark all read" / "Save all" / "Cancel". Works in any filter mode.

---

## Medium Effort (Build after quick wins)

- [x] **Article translation** — Button in ContentViewer toolbar; calls Haiku "translate this to English, preserve formatting"; replaces body text in-place. Show original/translated toggle.
- [x] **Chat with my highlights** — Input box on CardsPage: user types a question; selected highlights (filtered by active tag) are sent as context to Haiku; answer rendered below. Uses existing highlights data.
- [x] **Image highlighting** — Tap/click an image in ContentViewer to save it as a highlight; store `type: 'image'` + `image_url` in highlights table. Show image thumbnail in HighlightsDrawer and CardsPage.

---

## Large Effort (Complex — tackle last)

- [x] **Smart feed AI noise scoring** — Score each incoming item 1–10 for relevance using a keyword interest profile derived from user's highlight history. New `relevance_score` column. Start with keyword matching before ML.
- [x] **Offline reading (pre-cache article text)** — Service Worker background sync: after feed fetch, extract full article text for unread items and store in IndexedDB. Reader falls back to IndexedDB when offline.
- [ ] **Newsletter subscriptions** — User gets a unique `user-id@inbound.feedbox.email`; emails routed via Cloudflare Email Workers → Edge Function → parsed as feed items. Requires email routing infrastructure.

---

## Notes

- Each item should be ONE `/iterate` session: audit → implement → `npm test` → CHANGELOG → AGENT_LOG → deploy
- Skip any item that turns out to conflict with product direction or requires infrastructure not yet in place
- Large Effort items may need planning sessions before implementation
