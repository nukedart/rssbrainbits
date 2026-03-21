# Feedbox Changelog

All notable changes documented here.
Format: `## [version] — YYYY-MM-DD`

## [1.28.3] — 2026-03-21

### Added
- **P6 — Push notification permission** — new Notifications card in Settings lets users enable browser notifications with a single click. Shows permission state, provides a "Test" button, and explains PWA usage.
- **P6 — Background sync** — service worker now listens for background sync events (`feedbox-sync`, `periodicsync`) and tells the app to silently refresh feeds when the browser triggers a sync.
- **New articles banner** — after a background refresh, a green banner appears at the top of the article list showing the count of newly arrived articles. Click it to scroll to top.
- **P5 — Discover tab in Add modal** — "✦ Discover" tab offers 18 hand-curated feeds across 6 categories (Tech, AI, Design, News, Science, Business) — one click to subscribe.
- **P4 — Always-visible reading panel** — on desktop, the right reading panel is always present when feeds are loaded. Before selecting an article it shows a clean empty state with a keyboard shortcut cheatsheet. Article list locks to 380px width.
- **P4 — Desktop prev/next navigation** — ‹ and › buttons now appear in the reading panel header on desktop (not just mobile), with keyboard shortcut hints.
- **P4 — Article position indicator** — "3 of 47" shown below the source name in the reading panel header.
- **Dynamic version number** — app version is now injected from `package.json` at build time (via Vite `define`). The sidebar footer and Settings page always show the correct version without manual updates.

### Changed
- **Toolbar redesign** — "Latest" / "Unread" pill tabs replace the old toggle button. Search collapses to an icon; click to expand the search input. Red `!` badge replaces verbose error text for failed feeds (click for popover with per-feed retry).
- **Refresh icon** — replaced `↺` text character with a proper SVG icon.
- **Mark-all-read** — now an icon-only button (double-check SVG) to save toolbar space.

### Fixed
- **Folder persistence** — folder assignments now survive login/refresh. The inbox route in App.jsx now passes `feeds={feeds}` so InboxPage uses the centralized feeds state instead of re-fetching on every mount.

---

## [1.28.2] — 2026-03-21

### Changes since v1.28.1

---

## [1.28.1] — 2026-03-21

### Changes since v1.28.0

---

## [1.28.0] — 2026-03-21

### Changes since v1.27.1

---

## [1.28.0] — 2026-03-21

### Added
- **3-pane reading layout** — on desktop, clicking any article in the Inbox opens a reading panel inline to the right (Feedly-style). The article list narrows to 380px; the reading panel fills the remaining space. Mobile keeps the full-screen overlay as before.
- **Manage Feeds page** — dedicated page (`Settings → Manage Feeds →`) for renaming feeds, assigning to collections, and toggling full-content fetch. No longer embedded inside the Settings page.

### Changed
- **Settings — Appearance moved into Account card** — Dark/Light toggle is now two small icon buttons (Moon/Sun) in the top-right of the Account card. Separate "Appearance" card removed.
- **Analytics removed from sidebar** — Admin analytics link moved to the bottom of the Settings page (admin-only). Left nav is now the same for all users.
- **Read Later redesigned** — articles now display as a card grid with thumbnails, title, source, and time-saved. Empty state improved. Remove button per card.
- **admin-stats edge function deployed** — resolves HTTP 401 on the Analytics Dashboard. The function was built but had never been deployed to Supabase.

---

## [1.27.1] — 2026-03-21

### Changed
- **Collections sidebar unified** — smart feeds and folders merged into a single "Collections" section. Left icon differentiates type: funnel = smart feed, folder = collection. Edit pencil appears on hover for both types.
- **BottomNav add button** — solid SVG plus icon replaces plain "+" text character inside the accent square.
- **View options popover** — the ≡/⊞ + S/M/L button strip replaced by a single icon button that opens a compact popover with Layout (List/Cards) and Size (S/M/L) options. Works on mobile and desktop.

---

## [1.26.1] — 2026-03-21

### Changed — Phase 3: Simplification
- **BottomNav + Add button** — replaced Stats tab with a prominent accent-colored `+` square button in the centre. Tapping it navigates to Inbox and immediately opens the Add Feed modal. Stats remains accessible in the desktop sidebar and Settings.
- **Theme simplified to 2** — Settings appearance picker now shows only **Dark** (Distilled) and **Light**. Nocturne remains in the codebase as a legacy theme but is no longer advertised. Sidebar Sun/Moon toggle now correctly switches between Distilled and Light (previously incorrectly toggled Nocturne).
- **Collections always expanded** — sidebar collections (folders) now auto-expand on first load. Users can still collapse individual ones; they re-expand when new folders are added.

---

## [1.26.0] — 2026-03-20

### Fixed
- **Home page items now open** — tapping any card or article row on the Home page now opens the full reader. `ContentViewer` is now rendered locally within `HomePage` via internal `openItem` state (the `onOpenItem` prop was never being passed from `App.jsx`).
- **Inbox search no longer hijacks keyboard on mobile** — `SearchBar` was calling `inputRef.current?.focus()` on every mount, popping the mobile keyboard instantly when navigating to Inbox. Auto-focus on mount removed; programmatic focus still works via the `f` keyboard shortcut.
- **Stats page now shows data** — `getReadingStats` was using `.catch()` on Supabase query builders (which don't throw — errors come back in the result object). Replaced with proper `try/catch` blocks. Added localStorage fallback for all-time count so total reads appear even if the DB `read_at` column is missing. Error message simplified.
- **Folders renamed to Collections** — `FolderModal` title, field label; Sidebar section headers and button labels all updated to "Collection / Collections". DB/code internals unchanged.

### Changed
- **Save → Star** — "Save" action renamed to "Star" throughout: card action buttons (🔖 → ⭐), list-view hover actions, toast notification ("✓ Saved" → "⭐ Starred"), keyboard shortcut tooltip, onboarding card copy.
- **Sidebar nav simplified** — removed "Today" and "History" from desktop sidebar nav. Remaining items: Home · Inbox · Read Later · Notes · Stats. Settings remains in the footer.

---

## [1.25.4] — 2026-03-20

### Fixed
- **Mobile nav always visible** — `BottomNav` z-index raised to 600 (was 400), so it now renders above `ContentViewer` (500) and any other overlays. Navigation is always accessible on mobile.
- **Frosted-glass nav background** — background was computed via a broken string-replace hack that only worked for `rgb(…)` colors. All theme tokens use hex; added a proper `hexToRgba()` converter so the `backdrop-filter` blur now correctly shows through a semi-transparent nav bar.
- **Feed cards/items look squashed on mobile** — default view mode changed from `list` to `card`. New and returning users who haven't explicitly chosen a view will land in card view, which shows images and gives each item more breathing room.
- **Images missing in list view on mobile** — list-view rows now show a 52×42 thumbnail on the right side on mobile (same pattern as desktop `lg` size). Items without images degrade gracefully (no broken element).
- **Home page loading slowly / appearing stuck** — `HomePage` was re-fetching every subscribed feed from the network on every render. It now reads from the feed cache first (instant) and only fetches feeds that are missing from cache or stale, in the background.

---

## [1.25.3] — 2026-03-20

### Changed
- **Full UI revamp — "Distilled Workspace" design language** applied across all primary surfaces:
  - **Sidebar** — background now matches the body (`T.bg`), removing the hard visual boundary. Header replaced with "Feed Box" serif italic branding + "Distilled Workspace" uppercase subtitle. Nav items use rounded-pill active state with `T.surface` tonal lift (no accent-colored bg). "Smart Feeds" label renamed to "COLLECTIONS". Bottom bar cleaned up — no border-top, tighter padding.
  - **Feed list rows** — redesigned as Things 3-style "task rows": content-type icon (article / podcast / YouTube) in a small rounded tile that turns accent on hover; title at 14px/500 weight; source·time meta in `T.textTertiary`; right side shows source pill + unread dot at rest, ghost action buttons on hover. No bottom borders — rows float on `T.bg` with `12px` border-radius and tonal lift on hover.
  - **Card items** — border removed; tonal background lift on hover replaces border/shadow treatment (no-line rule).
  - **Inbox toolbar** — border-bottom replaced with subtle `boxShadow`; buttons restyled as pill-shaped ghost controls on `T.surface` background.
  - **Source panel** — border-right removed; uses `T.surface` background for tonal separation from the article list (`T.bg`).
- **Default theme** changed to `distilled` for new dark-mode users (system dark preference).
- **Version** bumped to `1.25.3`.

---

## [1.25.2] — 2026-03-20

### Added
- **Daily Briefing Home page** — new `Home` tab replaces `Unread` as the app's landing screen. Matches the "Distilled Workspace" editorial design exactly: serif italic mega-heading with today's date, bento grid layout (8-col featured card with hero image + 4-col two stacked secondary cards), and a "Latest Updates" editorial row list. Items are pulled live from all subscribed feeds, sorted by recency.
- **Home nav item** — sun icon added to both the desktop sidebar and mobile bottom nav; `Unread` nav item removed from both.

### Changed
- **Default landing page** changed from `inbox` to `home` — users land on the Daily Briefing on every app open.
- **Sidebar version** bumped to v1.25.2.

---

## [1.25.1] — 2026-03-20

### Added
- **Three-theme system** — Settings → Appearance now shows three interactive theme tiles:
  - *Nocturne* — sage-emerald `#accfae` on deep slate `#121416`, Noto Serif editorial font
  - *Distilled* — periwinkle-blue `#aac7ff` on near-black `#131315`, Newsreader serif font
  - *Light* — warm parchment `#f4f2ee`, darker sage accent
- **Follow X / Twitter** — new `𝕏 Follow` tab in the Add modal. Paste any `x.com/username` or bare `@handle` and it auto-routes through RSSHub RSS relay. X URLs pasted in the URL tab are also auto-detected.
- **Apple Podcasts search** — new `🎙 Podcasts` tab in the Add modal. Live search against the iTunes Search API (no account required), showing artwork, host, and episode count. One-tap follow.
- **YouTube chapter list** — timestamps in video descriptions are parsed and rendered as a clickable chapter list (links open the video at that point).
- **YouTube description panel** — expandable show/hide description below the video.
- **Podcast episode view** — opening a podcast item in the reader now shows: artwork + duration header, parsed chapter timestamps from show notes, expandable show notes with gradient fade. Article fetch is skipped for podcast items.
- **Newsreader font** — added to the Google Fonts preload; used automatically when the Distilled theme is active.

### Changed
- **PodcastPlayer redesigned** — glassmorphic backdrop-blur bar, gradient seek fill, SVG play/pause/skip icons with accent glow on the play button, 5 speed steps (1×→1.25→1.5→1.75→2×), sleep timer toggle with `💤` icon.

---

## [1.25.0] — 2026-03-20

### Changed
- **Editorial Nocturne theme** — complete UI redesign applying the "Midnight Editor" design system:
  - Color tokens: sage-emerald accent `#accfae`, deep slate surface hierarchy (`#121416` → `#1a1c1e` → `#1e2022`), ghost borders (no-line rule: borders at 20% opacity)
  - Fonts: Noto Serif (editorial/reader default) + Inter (functional labels), replacing DM Sans
  - Scrollbar: sage-emerald thumb on `surface-container-highest` track (3px thin)
  - Reader defaults to Noto Serif at 19px for long-form editorial feel
  - Card hover uses tonal background shift instead of shadow/border lift
  - All hardcoded legacy teal `#4BBFAF`, charcoal `#2F373B`, and DM Sans references replaced

---

## [1.24.8] — 2026-03-20

### Changes since v1.24.7

---

## [1.24.7] — 2026-03-20

### Fixed
- **Admin panel 401 "Invalid JWT"** — edge function was creating an `anonClient` to validate the session token, which failed with the new `sb_publishable_` key format. Now uses `adminClient.auth.getUser(token)` directly, which works with any key format.
- **Refresh button did nothing** — was calling `setFeeds(prev => [...prev])` to re-trigger the feed effect, but that's a no-op when feed state is lifted to App.jsx. Now calls `fetchAllRef.current(true)` directly.
- **OPML import feeds silently dropped** — imported feeds were appended via `setFeeds()` (no-op with lifted state) instead of `onFeedAdded()`. Feeds now appear immediately after bulk import.
- **Mark All Read was N network requests** — replaced `Promise.all(N × markRead())` with a single batch upsert (`markAllRead()`), reducing API calls from N to 1.
- **Retry feed had redundant dynamic import** — `invalidateCachedFeed` was dynamically re-imported inside `handleRetryFeed` despite already being statically imported at the top of the file.
- **Version stuck at v1.24.1** — `Sidebar.jsx` had a hardcoded version constant that wasn't updated by `deploy.sh`. Now shows correct version.

---

## [1.24.6] — 2026-03-20

### Changes since v1.24.5

---

## [1.24.6] — 2026-03-20

### Fixed
- **Admin panel crash on retry** — `showLoadError` was replacing the section DOM with `innerHTML`, so clicking Retry destroyed all render targets and caused a silent JS crash. Error state is now an overlay that preserves the DOM underneath.
- **Admin panel render errors** — `renderAll` now wrapped in try/catch; unexpected data shapes show a clear error instead of a blank spinner.

### Added
- **Admin panel version number** — shown in the sidebar footer (e.g. v1.24.6).

---

## [1.24.5] — 2026-03-20

### Added
- **Admin panel at rss.brainbits.us/admin/** — deployed to public directory so it's accessible without a separate server.
- **Admin panel error handling** — was an infinite spinner on any failure. Now has full try/catch with a direct Supabase query fallback (analytics + subscriptions load even if the edge function is down), a warning banner when running in fallback mode, and a detailed error card with actionable steps when both paths fail.
- **Admin panel auto-refresh** — reloads data every 5 minutes automatically.
- **Events-per-day chart fixed** — was rendering DAU data twice. Edge function now returns a separate `eventsChart` (total event volume per day) and the admin panel uses it correctly.

### Added (app — v1.24.4)
- **Compact search bar** — reduced padding and shorter placeholder "Search…".
- **Mobile toolbar cleanup** — hide-read toggle is now a `●`/`○` dot on mobile; toolbar gap tightened.
- **Card image placeholders** — cards without images now show a colorful gradient + large source initial (deterministic hue from source name) instead of a blank gray box.
- **PWA install banner revamp** — rounded card with app icon, star rating row, full-width install button (Android) or pill instruction (iOS).
- **Podcast sleep timer** — "ZZ" button sets a 30-minute sleep timer; shows countdown (e.g. "28m"); auto-pauses when time expires.
- **Podcast scrubber** — progress bar height increased from 3px to 6px for easier mobile tapping.

---

## [1.24.4] — 2026-03-20

### Changes since v1.24.3
- Intermediate deploy — see v1.24.5 for full notes.

---

## [1.24.3] — 2026-03-19

### Added
- **Onboarding flow** — New users with no feeds see a rich welcome screen instead of a blank inbox. Includes a 3-step how-it-works grid, a primary "Add your first feed" CTA, and 6 one-tap popular feed suggestions (Hacker News, The Verge, Wired, NASA, BBC News, TechCrunch).
- **Mark all read** — "✓ All" button appears in the article toolbar whenever there are unread items. Shows "✓" on mobile, "✓ All" on desktop. Marks everything in the current view in one action.
- **Share button** — "↑ Share" is now a visible button in the reader top bar, no longer buried in the ··· overflow menu. Uses the native share sheet on iOS/Android, falls back to clipboard copy on desktop.

### Fixed
- **Feed error retry on mobile** — The red error badge in the toolbar was a static label with no action. It is now a clickable "↺ N errors" button that retries all failed feeds immediately.
- **Mobile feed list** — Thumbnails hidden in list view (were consuming ~60px of title width on every row), article titles now wrap to 2 lines, rows taller for easier tap targets, article list has bottom padding so BottomNav no longer covers the last item.
- **Mobile toolbar** — View mode (List/Cards) and size (S/M/L) toggles hidden on mobile — toolbar now fits comfortably.
- **Sidebar version label** — Corrected from hardcoded v1.17.0 to current version.

---

## [1.24.0] — 2026-03-19

### Added
- **Subscription badge in Settings** — Account card now shows an ⚡ PRO or FREE pill badge next to the user's display name.
- **App version in Settings** — About card displays the current version, kept in sync with `package.json`.

---

## [1.23.0] — 2026-03-19

### Added
- **Admin panel** (`admin/index.html`) — Standalone single-file dashboard. No build step. Authenticates via Supabase, checks `is_admin`, then calls the new `admin-stats` Edge Function. Five sections: Overview, Users, Subscriptions, Analytics, Activity.
- **`admin-stats` Edge Function** — Admin-gated endpoint using service role to query `auth.users`, `subscription_events`, and `analytics_events`. Returns all dashboard data in a single call.
- **RLS policy** — Admin read access added to `subscription_events`.

---

## [1.22.0] — 2026-03-19

### Added
- **Custom analytics system** — Self-hosted event tracking backed by Supabase `analytics_events` table. No third-party services. Fire-and-forget `track()` helper used throughout the app.
- **Analytics dashboard** (`AnalyticsPage`) — Admin-only in-app dashboard showing MAU/WAU/DAU, 30-day charts, top events, and upgrade funnel.
- **Tracked events** — `article_opened`, `feed_added`, `feed_deleted`, `article_saved_for_later`, `opml_imported`, `ai_summary_triggered`, `article_highlighted`, `highlights_exported`, `search_performed`, `upgrade_initiated`, `plan_limit_hit`, `page_navigated`, `mark_all_read`.

---

## [1.21.0] — 2026-03-19

### Added
- Landing page full rewrite — new hero copy, 3-step How it Works section, star ratings on testimonials, OG/Twitter meta tags, mobile hamburger nav.
- Fixed all Stripe upgrade paths (PlanGate, Stats, Settings) — replaced mailto: links with real Stripe checkout.
- Security: removed `VITE_ANTHROPIC_API_KEY` from client bundle; key now stored only in localStorage.

---

## [1.20.0] and earlier

- polish: readable toggles, retry button, sticky reader controls, better errors
- perf: cap animations, faster proxy fallback, parallel feed discovery
- feat: polish AI summaries, fix stats, $9 Pro, bug fixes
- feat: Cloudflare proxy, Stripe billing, PWA install, Terms of Service

---

---

## [1.24.0] — 2026-03-19

### Added
- **Subscription badge in Settings** — Account card now shows an ⚡ PRO or FREE pill badge next to the user's display name, making plan status immediately visible.
- **App version in Settings** — About card now displays the current version (v1.24.0), kept in sync with `package.json`.

### Fixed
- **Mobile toolbar** — View mode (List/Cards) and size (S/M/L) toggles are now hidden on mobile, eliminating the squished 48px toolbar. The toolbar now fits comfortably: title, search, refresh, unread filter, and Add button.
- **FeedItem list titles on mobile** — Titles were single-line with `nowrap`, cutting off at the screen edge. On mobile they now wrap to 2 lines (WebkitLineClamp), making headlines fully readable.

---

## [1.23.0] — 2026-03-19

### Added
- **Admin panel** (`admin/index.html`) — standalone single-file dashboard. No build step. Authenticates via Supabase, checks `is_admin`, then calls the new `admin-stats` Edge Function. Five sections:
  - **Overview** — total users, MRR, DAU, new signups KPIs + DAU chart + upgrade funnel + recent signups table
  - **Users** — full user list with plan badge, signup date, last seen
  - **Subscriptions** — upgrade/cancellation counts (30d), net change, full event log
  - **Analytics** — MAU/WAU/DAU, top events ranked, events-per-day chart
  - **Activity** — live feed of recent analytics events with email + relative timestamp
- **`admin-stats` Edge Function** (`supabase/functions/admin-stats/index.ts`) — admin-gated endpoint using service role to query `auth.users`, `subscription_events`, and `analytics_events`. Returns all dashboard data in a single call.
- **`subscription_events_admin_policy.sql`** — RLS policy allowing admin reads on `subscription_events`.

### Setup required
1. Deploy the edge function: `supabase functions deploy admin-stats`
2. Run `supabase/migrations/subscription_events_admin_policy.sql` in the Supabase SQL editor
3. Open `admin/index.html` in a browser (or serve it statically alongside the landing page)

---

## [1.22.0] — 2026-03-19

### Added
- **Custom analytics system** — self-hosted event tracking backed by Supabase. No third-party analytics service. Events are stored in a new `analytics_events` table with per-row RLS (users can only write their own events; only admins can read all).
- **Analytics dashboard** (`AnalyticsPage`) — admin-only page (gated by `is_admin` in user_metadata) showing MAU/WAU/DAU KPIs, 30-day DAU and event bar charts, upgrade funnel, and top-events table.
- **Analytics sidebar link** — appears in the sidebar only for admin users. Navigate to it from the sidebar to view the dashboard.
- **15 tracked events**: `article_opened`, `ai_summary_triggered`, `article_highlighted`, `highlights_exported`, `article_saved_for_later`, `feed_added`, `feed_deleted`, `opml_imported`, `smart_feed_created`, `folder_created`, `search_performed`, `page_navigated`, `upgrade_initiated` (with surface tag: settings / stats / limit_gate), `plan_limit_hit`.

### Security
- **Removed `VITE_ANTHROPIC_API_KEY` from bundle** — `getAnthropicKey()` no longer falls back to a Vite env var, which was baking the key into the compiled JS at build time. The key is now only read from `localStorage` (user-provided via Settings). Pro users are served by the Cloudflare Worker and Supabase Edge Function, both holding the key server-side.

### Setup required
Run `supabase/migrations/analytics_events.sql` in your Supabase SQL editor, then set `is_admin: true` on your account:
```sql
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"is_admin":true}'
WHERE email = 'your@email.com';
```

---

## [1.21.0] — 2026-03-19

### Fixed
- **PlanGate upgrade** — replaced `mailto:` link with real Stripe checkout call. Every in-app limit prompt now routes directly to the payment flow.
- **StatsPage upgrade link** — same fix; the "Upgrade to Pro →" text in the Reading Stats plan badge now triggers Stripe checkout instead of opening an email client.
- **Free plan feed count** — landing page said "20 feeds" but `plan.js` caps at 10. Corrected to match.
- **Free trial duration** — landing page said "14-day free trial"; Stripe is configured for 7 days. Updated to "7-day free trial" throughout.
- **Copyright year** — updated from 2025 to 2026.

### Improved
- **Landing page — full rewrite** — new hero copy, "How it works" 3-step section, reader panel added to the app mockup, star ratings on testimonials, trial sub-note under Pro pricing card, OG/Twitter meta tags, improved footer with How it works link, and cleaner visual hierarchy throughout.
- **Landing page — mobile nav** — nav links were hidden on mobile with no fallback. Added hamburger button and a slide-down mobile menu with outside-click-to-dismiss.
- **Landing page — footer links** — Privacy and Terms now point to `/privacy.html` and `/terms.html`. Placeholder GitHub link removed.

---

## [1.20.0] — 2026-03-19

### Improved
- **Mobile unread toggle** — the "·" label (same dot for both states, completely ambiguous) is replaced with "Unread" / "All" on mobile and "Unread only" / "All articles" on desktop. State is now always readable at a glance.
- **Article error screen** — replaced the single "Open in browser" fallback with a two-button row: "↺ Retry" (re-runs the full fetch pipeline) and "Open in browser ↗". The error message now classifies the failure: proxy blocked, timeout, 404, 403/auth required, or parse error — instead of showing raw exception text.
- **Reader controls always visible** — the Aa font/size panel was rendered with `position: sticky` inside the scroll container, meaning it was only visible if you were near the top of the article. Moved to a pinned row in the fixed layout (between the toolbar and scroll area) so it's always on screen when open, regardless of scroll position. Slides in with a subtle `slideDown` animation.
- **Feed error messages** — the error tooltip in the sources sidebar now classifies failures instead of showing raw exception text: proxy blocked, invalid XML, timeout, 404 not found, 403 forbidden, or empty feed. Each case gets a plain-English one-liner.
- **Pro plan price** — `plan.js` internal price corrected from `$5/mo` to `$9/mo` to match all other surfaces.

---

## [1.19.0] — 2026-03-19

### Performance
- **Animation cap** — list and card view now only animate the first 20 items. Previously every item in a 100+ article list had a CSS animation applied, scheduling up to 100 simultaneous `fadeInUp` animations on every render. Items beyond index 20 render instantly with no animation overhead.
- **Faster proxy fallback** — the own Cloudflare Worker timeout was reduced from 10s to 4s. When the Worker is configured but unreachable, the public-proxy race now starts within 4s instead of waiting the full 10s. If the Worker is healthy, response time is unchanged.
- **Parallel feed auto-discovery** — the common feed path fallback (`/feed`, `/rss`, `/atom.xml`, etc.) previously probed each path sequentially; one slow or unresponsive path could stall discovery for several seconds. All 6 paths now race in parallel via `Promise.any` and the first valid feed wins immediately.

---

## [1.18.0] — 2026-03-19

### Fixed
- **Bug fixes from v1.17.0 audit** — six issues resolved:
  - **Reading progress debounce broken** — `handleScroll._last` was stored on a function object that gets recreated each render, resetting the counter and causing excessive Supabase writes. Replaced with `useRef` (`lastSavedProgressRef`) so the 5% threshold persists correctly across re-renders.
  - **Feed auto-discovery on every keystroke** — `AddModal` triggered `discoverFeed()` network requests without debouncing, firing on each character typed in a valid URL. Added 600ms debounce via `discoverTimerRef`.
  - **Fuse.js index rebuilt per keystroke** — `SearchBar` created a new `Fuse` instance inside the search effect, rebuilding the index on every keystroke. Moved to `useMemo` keyed on `allItems` — index now builds once per item list change.
  - **Toast overlaps BottomNav on mobile** — fixed `bottom: 80` hardcoded offset. Now `bottom: isMobile ? 72 : 24` so the toast clears the navigation bar on all screen sizes.
  - **Onboarding flash on new device** — returning users signing in on a fresh browser saw a brief flash of the onboarding overlay before their feeds loaded. Added `feedsLoaded` flag to `App.jsx`; onboarding now only renders after `getFeeds()` confirms feeds are truly empty.
  - **Stats 30-day chart always empty** — `getReadingStats` computed `perDay` from only the last 7 days of data, so the 30-day bar chart showed zeros for all older days. `perDay` now covers the full 30-day window.

### Improved
- **AI summaries** — new prompt instructs Claude to write in plain text only (no asterisks, no markdown bold). `SummaryBlock` in `ContentViewer` now parses bullet points and renders each as a styled list item with a teal `•` accent. Handles raw `**bold**` markers and `**Label**: text` patterns from older cached summaries gracefully. All three summary backends updated (Cloudflare Worker, Supabase Edge Function, direct browser fallback).
- **Reading Stats page** — added error state with a helpful migration hint when the `read_at` column is missing from `read_items`. `getReadingStats` no longer throws on schema errors — gracefully returns zeros and catches all Supabase failures.

### Changed
- **Pro subscription price** — updated from $5/month to **$9/month** across the Settings upgrade button and Edge Function setup comment. Landing page was already correct at $9.

---

## [1.17.0] — 2026-03-19

### Added
- **PWA icons** — generated 192×192, 512×512, and 180×180 (apple-touch-icon) PNGs from the existing favicon SVG. Manifest now includes a maskable icon variant for Android adaptive icons. Icons are cached by the service worker.
- **React Error Boundary** — `ErrorBoundary.jsx` wraps the entire app in `main.jsx`. Render crashes now show a styled recovery card ("Something went wrong" + Reload button + expandable error details) instead of a white screen. Uses hardcoded dark-theme styles so it works even if CSS fails to load.
- **Server-side AI summarization** — Cloudflare Worker now has a `POST /summarize` endpoint that calls Claude Haiku with the API key stored as a Worker secret (never exposed to the browser). Added matching Supabase Edge Function (`supabase/functions/summarize/index.ts`) as authenticated fallback. The front-end (`fetchers.js`) tries: Worker → Edge Function → direct browser call (dev only). This closes the security gap where the Anthropic API key was previously visible in client-side code.
- **Stripe Customer Portal** — new Supabase Edge Function (`create-portal-session/index.ts`) creates a Stripe Billing Portal session so Pro users can manage subscriptions, update payment methods, and cancel. PlanCard now has a "Manage billing & subscription" button that calls this function instead of linking to a hardcoded placeholder URL.

### Changed
- **Service Worker cache version** bumped from `feedbox-v1.15` to `feedbox-v1.17`. Icon files added to the app shell cache list.
- **Worker CORS headers** now allow `POST` method (needed for `/summarize`).
- **SETUP.md** rewritten with instructions for the new `/summarize` endpoint and `ANTHROPIC_API_KEY` secret setup.

### Security
- Anthropic API key is no longer required in browser-side Settings once the Cloudflare Worker is deployed with the `ANTHROPIC_API_KEY` secret. The `anthropic-dangerous-direct-browser-access` header is only used as a last-resort fallback for local development.

---

## [1.16.0] — 2026-03-19

### Added
- **Cloudflare Worker CORS proxy** — `cloudflare-worker/worker.js` is your own free proxy that replaces the dependency on `corsproxy.io`, `allorigins.win`, and `codetabs.com`. Includes SSRF protection (blocks private IPs), browser-like User-Agent header so feeds don't block it, 5-minute edge caching, and proper CORS headers locked to your domain. Free tier: 100,000 req/day — enough for ~5,000 daily active users. Set `VITE_PROXY_URL` in GitHub secrets and `.env.local` after deploying. Full setup guide in `cloudflare-worker/SETUP.md`. Public proxies remain as automatic fallback if the env var is not set.
- **Stripe billing** — two Supabase Edge Functions handle the full payment flow: `create-checkout` generates a Stripe Checkout session (called when user clicks Upgrade), `stripe-webhook` listens for `checkout.session.completed`, `customer.subscription.deleted`, and `customer.subscription.updated` and automatically sets `user.user_metadata.plan` to `"pro"` or `"free"`. Includes 7-day free trial, Stripe Customer Portal link for self-service cancellation, and a `subscription_events` audit log. Setup instructions in each function file.
- **PlanCard in Settings** — replaces the plain plan badge with a full card: current plan display, feature comparison table (feeds, smart feeds, folders, AI summaries, full-text fetch, stats, support), Stripe Checkout redirect button, 7-day trial callout, and success/cancelled banners on return from Stripe.
- **Service Worker** (`public/sw.js`) — enables PWA installability. Caches app shell for offline support, handles navigation fallback to `index.html`, and includes push notification scaffolding for future use. Registered in `main.jsx` on `load`.
- **PWA Install Banner** (`PWAInstallBanner.jsx`) — appears on mobile after 3 seconds (once, dismissible). On Android/Chrome uses the native `beforeinstallprompt` event for one-tap install. On iOS Safari shows manual Share → Add to Home Screen instructions. Skips if already installed as PWA. Stores dismissal in `localStorage`.
- **Terms of Service** (`public/terms.html`) — full terms covering acceptance, acceptable use, Pro billing (7-day trial, monthly $5, Stripe, refund policy within 7 days), user content ownership, third-party content, IP, disclaimers, liability cap, termination, and governing law (South Carolina). Linked from login footer and Settings.
- **Terms links** — Login page footer now shows Terms · Privacy. DataPrivacyCard in Settings links both.

### Changed
- **Proxy priority** — `fetchers.js` now tries `VITE_PROXY_URL` (your Cloudflare Worker) first. If it fails or is not configured, falls through to the public proxy race as before. Zero behaviour change until you set the env var.
- **GitHub Actions** — `deploy.yml` now passes `VITE_PROXY_URL` and `VITE_STRIPE_PUBLISHABLE_KEY` from repo secrets at build time.
- **`.env.example`** — documents `VITE_PROXY_URL` and `VITE_STRIPE_PUBLISHABLE_KEY` with setup notes.

### Infrastructure added
- `cloudflare-worker/worker.js` — deploy to Cloudflare Workers (free)
- `cloudflare-worker/wrangler.toml` — Wrangler config
- `cloudflare-worker/SETUP.md` — 5-minute deploy guide (Dashboard or CLI)
- `supabase/functions/create-checkout/index.ts` — Edge Function: creates Stripe Checkout session
- `supabase/functions/stripe-webhook/index.ts` — Edge Function: handles Stripe events
- `public/sw.js` — Service Worker
- `public/terms.html` — Terms of Service

---

## [1.15.0] — 2026-03-19

### Fixed
- **Folders not persisting feeds** — root cause was a schema ordering bug: `ALTER TABLE feeds ADD COLUMN folder_id UUID REFERENCES feed_folders(id)` ran before `feed_folders` was created, so the FK silently failed and the column was never added. Fixed in `supabase-schema.sql` — `feed_folders` table is now created first, then the `ALTER TABLE feeds` runs. Additionally, InboxPage's local `feeds` state has been lifted to App.jsx (`propFeeds` pattern) so folder assignments are never lost across page navigations — there is now a single source of truth.
- **Sidebar Stats icon parse error** — botched icon injection left a duplicate `Stats` key and a malformed `ReadLater:2` entry, causing a build-time esbuild error. Cleaned up Icons object.

### Added
- **Reading Stats page** — full standalone page (Sidebar + BottomNav "Stats" tab). Shows: 3-stat summary row (this week / all time / day streak), daily average, 30-day bar chart with today highlighted in teal, streak motivation card. Accessible from sidebar nav and mobile bottom nav.
- **Free / Pro tier system** — `src/lib/plan.js` defines `PLANS.free` (10 feeds, 3 smart feeds, 2 folders, 25 read-later, 5 AI summaries/day) and `PLANS.pro` (all unlimited). Plan is read from `user.user_metadata.plan` (set via Supabase dashboard). `PlanGate` component renders an upgrade prompt instead of the gated action. Feed add, smart feed create, and folder create are all gated. Settings shows a plan badge with feed usage count.
- **Article URLs → Read Later automatically** — pasting any article URL into Add modal now fetches the page metadata (title, source, description, image) and saves directly to Read Later instead of opening the reader. YouTube links still open inline. Toast confirms save.
- **Data export** — Settings → Data & Privacy → "Download all data" exports a JSON file containing history, saved, highlights, tags, and feeds. Works client-side, no server round-trip.
- **Account deletion** — Settings → Data & Privacy → type "delete my account" → confirms and permanently deletes all rows across all tables, then signs out. Irreversible.
- **Privacy Policy** — `public/privacy.html` — full policy covering data collected, third-party services (Supabase, Anthropic, CORS proxies, Google Favicons), retention, user rights (access, erasure, portability), cookies/localStorage, security, children, and contact. Linked from Settings and Login page footer.
- **Onboarding flow** — first-run overlay shown to new users with zero feeds. 16 curated feed suggestions across Tech, Science, News, Business, Design, Reads, Sports. Category filter pills, checkbox selection, "Subscribe to N feeds" bulk-adds. Dismissed permanently via localStorage `fb-onboarded`. Skippable.
- **Stats in Sidebar nav** — bar-chart SVG icon added to sidebar navigation between Notes and the bottom section.
- **Read Later in BottomNav** — mobile bottom nav now shows Inbox / Unread / Later / Stats / Settings. History moved to sidebar-only on mobile.
- **Mobile ContentViewer improvements** — ‹ › prev/next article buttons appear in the top bar on mobile (previously swipe-only). Back button enlarged to 38px touch target. Article body padding tightened for phone screens.
- **Upgrade CTA** — plan badge in Settings shows feed usage (`N/10 feeds used`) with mailto upgrade link. `PlanGate` inline upgrade prompt appears when limits are hit.
- **Schema: subscriptions audit table** — `subscription_events` table added to `supabase-schema.sql` for tracking plan changes.

### Changed
- **Article routing** — non-RSS, non-YouTube URLs added via AddModal now go to Read Later instead of opening the reader. This makes the Add flow more intentional: RSS = subscribe, article = save, YouTube = watch now.
- **Version text** — 9px / 0.45 opacity (carried from v1.14.0).

---

## [1.14.0] — 2026-03-19

### Added
- **Save article URLs for Read Later** — two entry points: (1) `AddModal` now shows a "⏱ Save for Later" button alongside "Open" when an article URL is detected; fetches title/meta before saving so the queue shows real titles. (2) `ReadLaterPage` has a persistent "+ Save an article URL for later…" bar at the top — paste any URL, hit Save or Enter. Both paths call `fetchArticleContent` for metadata then upsert to Supabase `saved`.
- **Read time on cards** — card view now shows estimated reading time (e.g. "3 min read") below the description. Podcast cards show duration instead. Uses the existing `readingTime()` helper.
- **Fuse.js fuzzy search** — `SearchBar` now runs an instant client-side fuzzy search over all in-memory feed articles (title × 0.6, description × 0.25, source × 0.1, author × 0.05, threshold 0.35) as you type. Results appear immediately with no network round-trip. Supabase history/saved results are still fetched in parallel and merged in, deduped by URL, capped at 20 total.
- **`F` keyboard shortcut** — press `F` from anywhere in the inbox to focus and select-all the search bar. Uses `forwardRef` + `useImperativeHandle` on `SearchBar` to expose `focusInput()`. Added to shortcuts popover.
- **Unread count persistence** — read URLs are now cached to `localStorage` under `fb-readurls-{userId}` and seeded immediately on mount so the unread badge survives a hard reload. Supabase is still the truth — its response merges in and overwrites the cache. `handleMarkRead` / `handleMarkUnread` keep the cache in sync on every toggle.
- **Feed Health dashboard upgrade** — `FeedHealthCard` in Settings now shows a 5-stat summary row (Total feeds, Fresh, Stale, Uncached, Articles), per-feed cache age ("2m ago", "Just now", "Not loaded"), item count from cache, and a ↺ per-feed force-refresh button that invalidates cache and re-fetches.

### Fixed
- **Duplicate style keys** — `NotesPage.jsx` had `borderRadius` and `borderLeft` declared twice in one object literal; `HighlightsDrawer.jsx` had `background` declared twice. Both cleaned up — last value was winning silently, now the intended value is kept.

### Changed
- **Version text** — sidebar version stamp reduced from 11px / 0.7 opacity to 9px / 0.45 opacity. More subtle, less visual noise.

---

## [1.13.3] — 2026-03-19

### Fixed
- **Card view items not showing** — hero image container used `aspectRatio` CSS which collapses to 0px height inside a flex/grid container when no image is present or the image hasn't loaded yet, causing cards to render with no visible height. Replaced with the reliable `position: relative` + `padding-bottom` percentage trick (56.25% for 16/9, 43.75% for 16/7, 75% for 16/12) with the `<img>` absolutely positioned inside. Cards now always have correct height regardless of image state.
- **Pull-to-refresh crash (mobile)** — `handlePTREnd` called `fetchAll(true)` but `fetchAll` is defined inside the `useEffect` closure, making it out of scope at the component level — a `ReferenceError` on every mobile pull-to-refresh. Added `fetchAllRef = useRef(null)` and assigned `fetchAllRef.current = fetchAll` inside the effect. PTR now calls `fetchAllRef.current?.(true)` safely.
- **Initial skeleton never shows** — `loadingItems` was initialised to `false`, so on first render before the fetch effect ran, the skeleton was hidden and the "Fetching articles…" empty state flashed immediately. Changed initial state to `true` so the skeleton shows from the very first render, disappearing only once real items arrive.

---

## [1.13.3] — 2026-03-19

### Fixed
- **Card view blank / items not rendering (critical)** — `SwipeRow` uses a render-prop pattern: `children` is a function that receives `{ swiped, close }`. On desktop (`isMobile=false`) it was returning `<>{children}</>` — passing the function as JSX rather than calling it, so both `CardItem` and `ListItem` rendered `undefined` on desktop. Fixed: desktop path now calls `children({ swiped: false, close: () => {} })` just like the mobile path does.
- **Card skeleton shows list rows during load** — when `viewMode` is `"card"`, the loading state was always rendering `SkeletonRow` (list-style rows). Now correctly renders `SkeletonList` with `viewMode="card"` so the card grid skeleton appears while feeds load.

---

## [1.13.2] — 2026-03-19

### Fixed
- **Left panel feed click doing nothing** — `SourceItem` had `draggable={!!feedId}` on the entire row div. On most browsers, making an element draggable suppresses click events since the browser assumes you might be starting a drag. Fixed by removing `draggable` from the row div entirely and replacing it with a dedicated drag handle (⠿ grip icon) that appears on hover, keeping click and drag completely separate.
- **Sidebar drag-drop missing** — folder rows in the sidebar nav were not wired as drag targets, and feed names inside expanded folders were not draggable. Both now support drag-to-folder: feed names get a drag handle on hover, and folder header rows highlight when a feed is dragged over them.
- **Podcast feeds excluded from feed list** — feeds saved with `type: "podcast"` were filtered out by `feeds.filter(f => f.type === "rss")`. Fixed to include both `"rss"` and `"podcast"` types.

### Added
- **Podcast URL detection** — new `isPodcastUrl()` in fetchers detects podcast-specific domains (Buzzsprout, Transistor, Anchor, Libsyn, Megaphone, Art19, Apple Podcasts, etc). `detectInputType()` now returns `"podcast"` for these URLs.
- **Podcast type in Add modal** — URLs detected as podcasts show a 🎙️ "Podcast Feed" type pill with "Episodes will appear in your inbox with a play button" description. Saved as `type: "rss"` internally since podcast feeds are RSS with audio enclosures. Nickname field shown for podcast URLs same as RSS.

---


## [1.13.1] — 2026-03-19

### Fixed
- **Feeds not showing on desktop (v1.12.0 regression)** — `pullRef` (used by pull-to-refresh) was declared but never attached to a DOM element, so `pullRef.current` was always `null`. `handlePTRStart` called `el.scrollTop` on null, throwing a TypeError that crashed the article list render on desktop. Fixed by attaching both `listRef` and `pullRef` to the article list scroll container via a combined callback ref, and guarding `scrollTop` with `|| 0`.
- **Mobile toolbar buttons squishing feed title** — the title area had `flexShrink:0` which prevented it from yielding space to the action buttons. Changed to `flexShrink:1` with `minWidth:0` and `overflow:hidden` so the title truncates gracefully instead of pushing buttons off-screen.

### Changed
- **Feed item title** — list view title increased from 13px to 15px, weight 500→600 for unread. More legible at a glance, makes unread items stand out clearly.
- **Sidebar width** — expanded state reduced from 220px to 200px. Slightly more compact, gives the article list more room.
- **Smart feed text indent** — feed names in the Smart Feeds section now have 4px left padding, creating a subtle visual indent relative to the "Smart Feeds" section heading above.

---


## [1.13.0] — 2026-03-19

### Fixed
- **Feeds not showing (v1.12.0 regression)** — two causes: (1) `normaliseUrl` was overwriting `item.url` with the normalised version, breaking `readUrls` Set matching since it stores original URLs. Fixed to use normalised URL only as the dedup Map key, keeping the original on the item. (2) Podcast `onClick` handler checked `item.isPodcast` without also checking `item.audioUrl`, so non-podcast articles that had a truthy `isPodcast` from a parse edge case wouldn't open the reader. Fixed to require both `isPodcast && item.audioUrl`.

### Added
- **Sidebar Smart Feeds revamp** — text left, colour dot right, pencil ✎ edit icon appears on hover. Cleaner and more consistent with macOS/iOS sidebar conventions.
- **Sidebar Folders revamp** — same layout: folder name + count left, colour square right, pencil ✎ edit icon on hover. Chevron ▶ for expand/collapse stays at far left. Feed names shown indented when folder is open.
- **Extra spacing** between the logo/toggle row and the main nav items. Breathing room makes the sidebar feel less dense.
- **Edit icon** added to `Icons` object in Sidebar (SVG pencil, 11px).

### Changed
- Smart feed and folder items no longer rely on invisible `···` overflow menus — the edit icon is always reachable on hover, more discoverable.

---


## [1.12.0] — 2026-03-19

### Added
- **Podcast mini-player** — sticky audio bar at the bottom of the screen. Podcast episodes detected via RSS `<enclosure>` audio tags get a ▶ play button in the feed list. Player has play/pause, -15s / +30s skip, playback speed (1×/1.25×/1.5×/2×), scrubbing progress bar, episode art, title, source, and elapsed/total time. Player persists across page navigation. Clicking a podcast item in the list opens the player instead of the article reader.
- **Duration badge** — podcast episodes show their duration (e.g. ▶ 45:32) in the article list row instead of reading time.
- **Client-side live search across unread** — typing in the search bar now instantly filters the in-memory article list (title, description, source, author) as you type, with no DB round-trip. Works across all filterModes including unread and today. Results update in real time.
- **Podcast fields in parser** — `audioUrl`, `audioDuration`, `isPodcast` now populated on all RSS items with audio enclosures (from v1.11.4, now surfaced in UI).

### Changed
- **Sidebar nav icons** — increased from 15px to 17px. More legible at all sizes.
- **Folder/Smart Feed rows left-aligned** — previously centred the dot icon in the 56px collapsed rail, making it visually disconnected from the nav icons above. Now left-aligned with consistent padding, matching the main nav visual rhythm.
- **Settings page centered** — content is now centred in the right pane (max-width 520px, margin auto). Previously left-aligned which looked unbalanced on wide screens.

---


## [1.11.4] — 2026-03-19

### Added
- **Global ErrorBoundary** — wraps all page content in `App.jsx`. Any uncaught render error now shows a recovery screen ("Something went wrong / Reload app") instead of a blank white page. Individual card failures in Settings are also guarded independently.
- **Database migrations helper** — new card in Settings → Database Migrations. Lists every required `ALTER TABLE` / `CREATE TABLE` statement with a one-click Copy button. Solves the problem of features silently not working because an older schema is missing a column.
- **OPML import progress** — bulk feed import now shows an animated toast at the bottom of the screen: spinner + "Importing feeds… X of Y done" + a progress bar. Dismissed automatically when complete.
- **Podcast fields in RSS parser** — `parseRSSItem` now detects audio enclosures and populates `audioUrl`, `audioDuration`, and `isPodcast: true` on each item. No UI yet (v1.12.0), but the data is ready.

### Fixed
- **Settings page redundant fetches** — `ManageFeedsCard` and `FeedHealthCard` were independently fetching `feeds` and `folders` from Supabase every time Settings was opened, even though App.jsx already has them in state. Both components now accept `feeds`/`folders` as props from `SettingsPage`, which receives them from `App.jsx`. Zero extra network requests on Settings open.
- **`onFeedUpdate` propagation** — renaming a feed or toggling "Always fetch full content" in Manage Feeds now propagates the change back up to `App.feeds` state via `onFeedUpdate` callback, so the sources panel and sidebar update immediately without a reload.

### Changed
- OPML import handler now accepts both a single feed object and an array (for bulk imports from OPMLImport component).

---


## [1.11.3] — 2026-03-19

### Fixed
- **Sidebar collapse toggle** — was positioned `right:-10` on an `overflow:hidden` container, causing it to be clipped mid-render. Moved into the logo row as an inline 22×22 button. No longer floats outside the sidebar bounds.
- **Settings / all secondary tabs blank** — `getReadingStats` crashed when the `read_items` table had no `read_at` column (older schema), which propagated and blanked the entire SettingsPage. Added per-card error guards (`failed` state) so one card failure never crashes the rest. `getReadingStats` now falls back gracefully when `read_at` is missing.
- **Nav completely dead (v1.11.1 regression)** — `import pkg from "../../package.json"` failed in production Vite builds; fixed in v1.11.2. Now uses hardcoded `APP_VERSION` constant.
- **Settings blank (v1.11.1/v1.11.2 regression)** — missing supabase imports (`getFeeds`, `getFolders`, `getReadingStats`, etc.) in SecondaryPages.jsx caused ReferenceError on mount; all imports now present.

### Changed
- **Shortcuts button** — moved back next to the user/settings avatar as a compact `⌘` symbol button (26×26px). Removed the full-width "⌘ Shortcuts" text button.
- **Version number** — increased from 10px/0.5 opacity to 11px/0.7 opacity. More legible.
- **Theme toggle buttons** — reduced height from 30px to 24px. Less visually heavy in the bottom bar.

---


## [1.8.0] — 2025-03-17

### Added
- **Progress bar** — always-visible 3px track at top of ContentViewer. Filled portion uses brand teal gradient. Track is always shown (empty = translucent surface); disappears only when progress is 0.
- **Scroll-to-top FAB** — circular ↑ button appears bottom-left of the article once you've scrolled past 8%. Uses `position: sticky` inside the scroll container so it stays in the viewport corner. Smooth scroll on click. Hover turns it teal.
- **Share fix** — `scrollContainerRef` is now correctly attached to the actual scrollable div (the inner flex container), so `handleScroll` fires on every scroll event. Previously the ref was attached to a non-scrolling wrapper.
- **Floating Aa panel** — font controls moved from a sticky sub-header into a floating card that uses `position: sticky; top: 12px` inside the scroll container. It scrolls with the page initially, then pins to the top of the viewport as you scroll past it. Has a × close button.
- **Folder / group feeds** — new `feed_folders` Supabase table. Sidebar shows a collapsible Folders section between Smart Feeds and the flex spacer. Each folder shows feed count and an expand/collapse chevron. "···" opens FolderModal to rename, recolor, or delete. Ungrouped feeds show directly without a folder.
- **FolderModal** — new component for create/rename/delete with 7 color swatches and keyboard support (Enter to save, Esc to close).
- **Smart feeds feed scoping** — SmartFeedModal now has a "Search scope" row: "All feeds" (default) or "Pick feeds" which opens a checkbox list of your subscribed feeds. Scoped smart feeds only match articles from the selected feeds. Stored as `feed_ids TEXT[]` on the `smart_feeds` table.

### Changed
- `matchesSmartFeed(item, def)` now accepts the full smart feed definition object and checks `feed_ids` before keyword matching
- `addSmartFeed` and `updateSmartFeed` now accept and persist `feed_ids`
- App.jsx loads `folders` and `feeds` from Supabase and passes them to Sidebar and SmartFeedModal
- Run updated `supabase-schema.sql` to add `feed_folders` table and `feed_ids` column to `smart_feeds`

---


## [1.7.0] — 2025-03-17

### Added
- **Auto-refresh feeds** — feeds silently re-fetch every 30 minutes via `setInterval` in InboxPage. A teal banner slides in at the top of the article list showing "↑ N new articles — tap to scroll up". Banner dismisses on tap or via the × button. New article detection uses a `prevItemUrlsRef` Set to diff against previously known URLs. Interval is cleared on component unmount.
- **Reading progress bar** — a 2px teal bar at the top of ContentViewer tracks scroll position (0–100%). Progress is persisted to a new Supabase `reading_progress` table (upsert on `user_id + article_url`) debounced to every 5% change. On re-opening an article, scroll position is restored after content loads.
- **Share button** — "Share" button in ContentViewer toolbar. On mobile uses the native Web Share API sheet (title + URL). On desktop falls back to clipboard copy with "✓ Link copied" feedback. Single handler, 20 lines.
- **RSS auto-discovery** — pasting any website URL into AddModal now silently fetches the page and scans for `<link rel="alternate" type="application/rss+xml">` tags. Shows a spinner while scanning, then a "📡 RSS feed found!" banner with the discovered URL. On submit, uses the discovered feed URL automatically. Falls back to trying common paths (`/feed`, `/rss`, `/atom.xml`) if no `<link>` tag exists.

### Changed
- New Supabase table: `reading_progress` — run the updated `supabase-schema.sql` to add it
- `fetchers.js` exports new `discoverFeed(pageUrl)` function

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
