# Feedbox Changelog

All notable changes documented here.
Format: `## [version] — YYYY-MM-DD`

---

## [1.5.0] — 2025-03-17

### Added
- **OPML Export** — Settings → Data & Export → "↓ Export OPML" downloads all subscribed feeds as a valid OPML 2.0 file, importable into Reeder, NetNewsWire, Feedly, or any RSS reader
- **Bionic Reading mode** — toggle in the `Aa` reader controls panel. Bolds the first ~45% of every word to guide the eye and increase reading speed. Works with highlights simultaneously.
- **Font controls** (`Aa` button in article toolbar):
  - Font size slider: 14–22px, applied via `--reader-font-size` CSS variable
  - Line width: Narrow (520px) / Medium (660px) / Wide (780px), via `--reader-line-width`
  - Font family: Sans (DM Sans) / Serif (Playfair Display), via `--reader-font-family`
  - All preferences persisted to `localStorage`, applied on app boot via `initReaderPrefs()`
- **Highlight export to Markdown** — two locations:
  - "↓ MD" button in ContentViewer toolbar (copies current article highlights)
  - "Copy MD" + "↓ .md" buttons in HighlightsDrawer panel header
  - Format: article title → URL → each highlight as blockquote → note in bold
- **Notes page** — dedicated sidebar nav item (📋 Notes icon) showing all highlights + notes across every article you've read, grouped by article, searchable, filterable to notes-only, with "Copy all as MD" and "↓ .md" export for your entire reading library

### Changed
- `HighlightedText` in ContentViewer now accepts `bionic` prop — when enabled, each word renders as `<strong>first 45%</strong>rest` without breaking highlight overlays
- `HighlightsDrawer` now accepts `articleTitle` and `articleUrl` props for accurate export filenames and Markdown headers
- Reader body area now reads from `--reader-font-size`, `--reader-line-width`, `--reader-font-family` CSS variables instead of hardcoded values

---


## [1.4.2] — 2025-03-17

### Fixed
- **Critical: feeds showing spinning wheels** — Two compounding bugs caused all feeds to load but display nothing:
  1. `fetchRSSFeed` returned the raw cache envelope `{ data, isStale }` when serving from cache, but callers expected `{ title, items }` directly. Fixed by unwrapping `cached.data` before returning.
  2. InboxPage had a broken first-pass cache read using `require ? null : window.__fbCache` — `require` doesn't exist in the browser, so this evaluated to `null` every time and the entire cache population block silently failed.
- Rewrote the `fetchAll` loop in InboxPage — removed the duplicated broken cache logic (cache is already handled inside `fetchRSSFeed`), simplified to a clean `Promise.allSettled` that merges items as each feed resolves.
- Added guard: feeds with zero items after fetch now show an error rather than silently contributing nothing.

### Added
- Full CHANGELOG history retroactively documented for all versions (v1.0.0–v1.4.1)

---

## [1.4.1] — 2025-03-17

### Fixed
- **Critical: Vite build failure** — `summarizeContent` in `fetchers.js` had a stray `import` statement inside the function body (a JS syntax error caught by Vite's import analysis). Caused by a botched automated sed script that converted dynamic `await import()` calls to static imports but left orphaned lines inside the function body. Rewrote the function cleanly.

---

## [1.4.0] — 2025-03-17

### Added
- **Skeleton loading screens** — replaced the centered spinner with shimmer-pulse skeleton rows (list) and skeleton cards (card view) that match the current view mode and card size. Staggered fade-in animation on each item.
- **Staggered item animations** — list and card items animate in with `fadeInUp` (8px, fade) with 20ms staggered delay per item, capped at 240ms.
- Landing page at `landing/index.html` — full production sales page with app mockup, feature grid, testimonials, pricing tiers, CTA band, footer.

### Fixed
- Toolbar spacing — unified to `height: 52px`, `gap: 8px`, `padding: 0 14px`. View toggle and size toggle grouped with consistent `borderRadius: 8`, `padding: 3px`.
- View toggle and size toggle now sit in a single flex group (gap: 4) for visual coherence.

### Performance
- `Promise.any` proxy race — both `corsproxy.io` and `allorigins.win` race simultaneously from the start (previously had a 2s delay before starting fallback). Typical fetch time: 4–6s → 1–2s.
- Static imports for `getCachedFeed`, `setCachedFeed`, `getAnthropicKey` — removed dynamic `await import()` on every call which forced module re-evaluation each time.
- Timeout reduced from 7s to 6s.

---

## [1.3.2] — 2025-03-16

### Fixed
- Smart buckets showing black page — `smartFeedDef` was used inside `InboxPage` but was never declared in the component's props. Fixed by adding `smartFeedDef = null` to the function signature.
- S/M/L size toggle was only showing in card view (wrapped in `viewMode === "card"` condition). Removed condition — toggle always visible.
- List view `FeedItem` was not receiving `cardSize` prop — added it.
- List item now responds to `cardSize`:
  - S: 36×36px thumbnail, 12px title, 7px row padding
  - M: 60×44px thumbnail, 13px title, 10px row padding (default)
  - L: 96×64px thumbnail, 14px 2-line title, 14px row padding

---

## [1.3.1] — 2025-03-16

### Fixed
- **Critical: `smartFeeds is not defined` crash** — React's Rules of Hooks requires all `useState`/`useEffect` calls to appear before any conditional returns. The automated patch in v1.3.0 injected `smartFeeds` state declarations after the `if (user === undefined)` early return guard, causing the crash. Rewrote `AppShell` with all hooks unconditionally at the top.

---

## [1.3.0] — 2025-03-16

### Added
- **Smart Feeds** — keyword-based virtual feeds in the sidebar
  - Create buckets with name + multiple keywords + color dot
  - Articles matching any keyword auto-collected across all feeds (client-side filter)
  - Edit/delete via `···` menu in sidebar
  - Supabase `smart_feeds` table with RLS policies
- **Card sizes S / M / L** — segmented toggle when in card view
  - S: 180px min-width grid, 16/12 image ratio, 2-line title, no description
  - M: 260px, 16/9, 3-line title, 2-line description (default)
  - L: 340px, 16/7 cinematic, 4-line title, 4-line description
  - Preference persisted to `localStorage`

### Fixed
- Feedbox logo now theme-aware — white on dark mode (`brightness(10) saturate(0)`), teal-tinted on light mode (CSS filter chain)
- Sidebar nav spacing tightened — consistent `padding: 7px 10px`, `gap: 1px` between items, `borderRadius: 7`

### Changed
- Source panel hidden when viewing a Smart Feed (not relevant)
- View toggle buttons show tooltip labels

---

## [1.2.1] — 2025-03-16

### Added
- **OPML Import** — `↑` button in Sources column header
  - Parses flat and folder-organized OPML files
  - Preview list with checkboxes, select/deselect all, folder grouping by source reader
  - Per-feed progress bar during bulk import
  - Export instructions for Reeder, NetNewsWire, Feedly, Inoreader

### Fixed
- Feedbox logo path changed from relative `feedbox-logo.png` to `{import.meta.env.BASE_URL}feedbox-logo.png` — the relative path broke inside React components when not at the site root
- Logo light-mode filter improved for better rendering on light sidebar background

---

## [1.2.0] — 2025-03-16

### Added
- **Full-text auto-fetch** — after initial RSS fetch, if `bodyText` is under 300 characters (truncated feed), ContentViewer silently re-fetches the full article URL. Upgrades content only if the second fetch returns more text.
- **Search bar** in toolbar — debounced 280ms, searches `history` + `saved` tables
  - Queries ≥3 chars use Postgres full-text search (`websearch` mode)
  - Short queries fall back to `ilike`
  - Results show favicon, title with match highlighted in teal, source, relative date
  - Click result opens article in ContentViewer
- Supabase migration: `search_vector` tsvector columns + GIN indexes on `history` and `saved`

### Changed
- Keyboard shortcuts moved from sidebar inline list to `?` popover button next to user avatar
- Feedbox logo repositioned inside `<nav>` block, sitting flush above Inbox button

---

## [1.1.1] — 2025-03-16

### Changed
- Keyboard shortcut hint block removed from sidebar body
- New `?` button next to user avatar opens a fixed-position shortcuts popover (7 shortcuts in `<kbd>` style, outside-click dismiss)

---

## [1.1.0] — 2025-03-16

### Removed
- **TTS (Text-to-Speech) removed entirely** — `TTSPlayer.jsx` deleted, all word-span TTS infrastructure removed from `ContentViewer`, TTS settings card removed from Settings, `speechSynthesis` voice detection removed, CSS TTS classes removed

### Added
- **Unread view** — dedicated sidebar nav item (between Inbox and Today) showing only unread articles across all feeds, no toggle needed
- SVG icons throughout sidebar — Inbox, Today, Unread, ReadLater, History, Settings, Sun, Moon (replaced emoji labels)
- RSS-inspired favicon — teal radiating arcs on charcoal background
- `deploy.sh` — one-command deploy script with patch/minor/major version bumping, auto CHANGELOG entry from git log, build verification, commit + tag + push
- `sync.sh` — applies a zip from a Claude session to the local repo via rsync, preserving `.git/` and `.env.local`
- `CHANGELOG.md` — version tracking established

### Changed
- Version tracking: zip filenames and in-app Settings version match semver
- `v1.1.0` shown in Settings → About

---

## [1.0.0] — 2025-03-16

### Added
- Initial release — RSS reader with GitHub OAuth + Supabase backend
- Inbox, Today, Unread, Read Later, History, Settings pages
- Three-column desktop layout: Sidebar → Sources → Article list → Reader
- Card view and list view with toggle (persisted to `localStorage`)
- Article full-text reader — fetches article body with scored container selector
- YouTube embed support with iframe player
- AI summaries via Claude Haiku (Anthropic API)
- Highlights (4 colors) + Kindle-style notes
- Tags per article with autocomplete from existing tags
- Unread tracking — mark read/unread, per-feed unread counts in sidebar
- Read Later queue
- Reading history persisted to Supabase
- Keyboard shortcuts: J/K navigate, O open, R read/unread, L read later, S save, A add, Esc close
- CORS proxy with dual-proxy race (corsproxy.io + allorigins.win)
- localStorage cache for feeds (30 min fresh TTL, 4h stale)
- Feedbox branding — teal `#65D5C4` / charcoal `#2F373B` / gold `#AA8439` palette
- Feedbox logo with light/dark mode CSS filter adaptation
- Deployed to `rss.brainbits.us` via GitHub Pages + custom CNAME
- `DEPLOY.md` with full step-by-step setup guide
