# Agent Iteration Log

Each row is one `/iterate` run. Token costs are for the full Claude Code session — run `/cost` at the end of a session to get the number, then note it in the Session Cost column.

| Date | Version | Area | Change | Files | Session Cost |
| 2026-04-04 | v1.46.112 | Nav | Restore Today+Saved on mobile via compact pill buttons in Feeds bottom sheet | `MobileFeedDrawer.jsx:232-252` | — |
| 2026-04-04 | v1.46.111 | Polish | Card items: 1px border + 14px radius + hover shadow — clear definition on all themes | `FeedItem.jsx:447-450` | — |
| 2026-04-04 | v1.46.110 | Fix | Auto-mark-read on scroll: observer recreated on every read due to readUrls dep; fixed with readUrlsRef | `InboxPage.jsx:44-46,579,584` | — |
| 2026-04-04 | v1.46.109 | Polish | AddModal polished: RSS icon header + divider, larger input with glow focus, accent badge for detected type | `AddModal.jsx:115-260` | — |
| 2026-04-04 | v1.46.108 | Polish | AddModal redesigned: X replaces Cancel, no header block, input as hero, slim type label | `AddModal.jsx:1-200` | — |
| 2026-04-04 | v1.46.106 | Nav | Remove Add slot from pill nav (4 items); strip redundant nav rows from Feeds bottom sheet | `BottomNav.jsx:12-18` `MobileFeedDrawer.jsx:111-273` | — |
| 2026-04-04 | v1.46.105 | Polish | Pill nav closer to bottom (16→8px) and larger tap targets (padding 10→12px) | `BottomNav.jsx:26,68,105` | — |
| 2026-04-03 | v1.46.104 | Nav | Pill nav always visible; mobile toolbar 48→62px; feed content fills to screen bottom | `BottomNav.jsx:21-32` `InboxPage.jsx:623,909` `App.jsx:257` | — |
| 2026-04-03 | v1.46.103 | Nav | BottomNav converted to floating pill — centered, lifted off bottom, pill border-radius + shadow | `BottomNav.jsx:34-54` | — |
| 2026-04-03 | v1.46.102 | Nav | BottomNav rewritten with lucide-react icons — declarative NAV_ITEMS array, strokeWidth for active state | `BottomNav.jsx:1-157` | — |
| 2026-04-03 | v1.46.96 | Polish | Remove decorative border from inactive source filter pill — reduces toolbar noise | `InboxPage.jsx:691` | — |
|------|---------|------|--------|-------|-------------|
| 2026-04-03 | v1.46.101 | Nav | BottomNav reappears after closing mobile reader — dispatch fb-nav-dir "up" on ContentViewer onClose | `InboxPage.jsx:1037` | — |
| 2026-04-03 | v1.47.00 | Polish | Review page highlight strips now use HIGHLIGHT_COLORS from SelectionToolbar — matches Cards page colors | `ReviewPage.jsx:6,45,159` | — |
| 2026-04-03 | v1.46.99 | Perf | Lazy-load fuse.js on first search keystroke — defers 6.6 kB gz from InboxPage initial fetch | `SearchBar.jsx:2,46` | — |
| 2026-04-03 | v1.46.98 | Polish | SearchBar match highlight: hardcoded teal → T.accent at 33% opacity, matches all three themes | `SearchBar.jsx:211` | — |
| 2026-04-03 | v1.46.96 | Polish | Today hero card: remove 65% opacity on read state; title dims to T.textTertiary, image stays crisp | `TodayPage.jsx:397,441` | — |
| 2026-04-03 | v1.46.95 | Polish | Today page read items: whole-row opacity→title-only T.textTertiary; images keep full presence | `TodayPage.jsx:519,529,541` | — |
| 2026-04-03 | v1.46.94 | Polish | Card view source labels T.accent→T.textSecondary, weight 600→500 — matches list view v1.46.90 fix | `FeedItem.jsx:494` | — |
| 2026-04-03 | v1.46.93 | Fix | Card view podcast items no longer show misleading "X min read" alongside audio duration | `FeedItem.jsx:526,531` | — |
| 2026-04-03 | v1.46.92 | Polish | Remove redundant borderTop hairline from BottomNav — backdrop-filter glass provides separation | `BottomNav.jsx:59` | — |
| 2026-04-02 | v1.46.91 | Feature | Podcast panel player — episodes open in right panel with inline audio controls, no modal | `ContentViewer.jsx:1273` `InboxPage.jsx:963,978` | — |
| 2026-04-02 | v1.46.90 | Polish | Mute mobile source label T.accent→T.textSecondary, weight 600→500 for calmer hierarchy | `FeedItem.jsx:300` | — |
| 2026-04-01 | v1.46.89 | Polish | Remove redundant borderTop from CardItem hover action bar | `FeedItem.jsx:541` | — |
| 2026-04-01 | v1.46.88 | Polish | Increase mobile list item padding 11px→14px for more generous whitespace between Inbox rows | `FeedItem.jsx:287` | — |
| 2026-03-31 | v1.46.87 | Polish | Replace hardcoded rgba sage-green in reading-progress bars with T.accent token | `FeedItem.jsx:242,483` | — |
| 2026-03-31 | v1.46.86 | Fix | RSS content fallback + Cloudflare block detection + SlickDeals/AlternativeTo selectors | `fetchers.js:351,430` `ContentViewer.jsx:100,630` | — |
| 2026-03-31 | v1.46.85 | Feature | Spotify/Apple Podcast link support — oEmbed→iTunes search resolution, "Spotify Podcast" chip | `fetchers.js:565,660` `AddModal.jsx:4,8` | — |
| 2026-03-31 | v1.46.84 | Feature | Redesign PodcastPlayer — centered modal on desktop, full-screen sheet on mobile with blurred art bg | `PodcastPlayer.jsx:1-280` | — |
| 2026-03-31 | v1.46.83 | Polish | Standardise BottomNav active label fontWeight 700→600 — consistent with Feeds tab, less jarring jump | `BottomNav.jsx:171` | — |
| 2026-03-31 | v1.46.82 | Polish | Add OG/Twitter Card meta tags — improves share previews and SEO score | `index.html:22` | — |
| 2026-03-31 | v1.46.81 | Polish | Remove decorative boxShadow divider from Inbox toolbar — no decorative chrome principle | `InboxPage.jsx:623` | — |
| 2026-03-30 | v1.46.80 | Feature | Persist AI summaries in localStorage — summaries survive reader close/reopen | `ContentViewer.jsx:35,65,258` | — |
| 2026-03-30 | v1.46.68 | Polish | Remove borderBottom divider from mobile list-view items — whitespace separates rows | `FeedItem.jsx:290` | — |
| 2026-03-27 | v1.46.13 | Nav | Renamed sidebar label "All Items" → "Inbox" to match mobile nav | `Sidebar.jsx:329` | — |
| 2026-03-27 | v1.46.14 | Nav | Added `onTouchCancel` to all 3 BottomNav button types — fixes buttons stuck dimmed after scroll gesture | `BottomNav.jsx:66,103,131` | — |
| 2026-03-27 | v1.46.15 | Polish | Fixed hardcoded `color:"#fff"` on Add button and unread badge — use `T.accentText` token for correct contrast on all themes | `BottomNav.jsx:72,139` | — |
| 2026-03-27 | v1.46.16 | Nav | Fixed "All Items" label in MobileFeedDrawer — now reads "Inbox" matching Sidebar and BottomNav | `MobileFeedDrawer.jsx:258` | — |
| 2026-03-27 | v1.46.17 | Polish | Replaced clock icon with bookmark for "Saved" in Sidebar — matches BottomNav icon and label | `Sidebar.jsx:12` | — |
| 2026-03-27 | v1.46.18 | Nav | Added "Home" as first Sidebar nav item — dashboard had no return path after navigating away | `Sidebar.jsx:13,330` | — |
| 2026-03-27 | v1.46.19 | Nav | Added "History" to Sidebar nav — page existed in router but was unreachable from any nav surface | `Sidebar.jsx:14,334` | — |
| 2026-03-27 | v1.46.20 | Polish | Fixed `color:"#fff"` on MobileFeedDrawer Add Source button — use `T.accentText` for correct Nocturne contrast | `MobileFeedDrawer.jsx:246` | — |
| 2026-03-27 | v1.46.21 | Polish | Fixed hardcoded Nocturne #accfae in NotesPage TagCard — tag pills and divider now use T.accent tokens across all themes | `NotesPage.jsx:284-290` | — |
| 2026-03-27 | v1.46.22 | Polish | Replaced ⚙ emoji with SVG Analytics icon on Sidebar admin button — crisp retina rendering, consistent with icon system | `Sidebar.jsx:14,536` | — |
| 2026-03-27 | v1.46.23 | Polish | Fixed hardcoded `#03210b` in NotesPage and ArticleNotesPanel — use T.accentText for correct contrast on all themes | `NotesPage.jsx:675, ArticleNotesPanel.jsx:146` | — |
| 2026-03-27 | v1.46.24 | Polish | Fixed hardcoded `#e53e3e` on feed error badge in InboxPage — now uses T.danger token | `InboxPage.jsx:641` | — |
| 2026-03-27 | v1.46.25 | UX | Added aria-label + aria-current to all BottomNav buttons — Add button was invisible to screen readers | `BottomNav.jsx:55,92,120` | — |
| 2026-03-27 | v1.46.26 | UX | Added aria-label + aria-current to Sidebar NavItem and collapse/expand toggle buttons | `Sidebar.jsx:51-52,368,375` | — |
| 2026-03-27 | v1.46.27 | UX | Moved Admin button directly below Sources in Sidebar — groups management tools together | `Sidebar.jsx:484` | — |
| 2026-03-27 | v1.46.28 | UX | Improved TodayPage empty state — differentiates no-feeds (setup prompt) from quiet-feeds (reassurance) | `TodayPage.jsx:166` | — |
| 2026-03-27 | v1.46.29 | Polish | Fixed hardcoded `color:"#fff"` on 5 accent buttons in SecondaryPages — Add feed, PRO badge, Enable notifications, Export OPML, Export All now use T.accentText | `SecondaryPages.jsx:119,450,614,827,1688` | — |
| 2026-03-27 | v1.46.30 | Polish | Fixed hardcoded `color:"#fff"` on 3 accent buttons in InboxPage — New articles banner, Add Feed CTA, and Retry button now use T.accentText | `InboxPage.jsx:903,1090,1307` | — |
| 2026-03-27 | v1.46.31 | Feature | AI-suggested tags on article open — Haiku suggests 3–5 tags as one-tap pills in the tags bar for Pro users | `fetchers.js:832, ContentViewer.jsx:50,113,468` | — |
| 2026-03-27 | v1.46.32 | Feature | Spaced repetition Daily Review — SM-2 scheduling in localStorage, Review page with Again/Good/Easy buttons, added to Sidebar nav | `ReviewPage.jsx:1-175, App.jsx:21,222, Sidebar.jsx:17,341` | — |
| 2026-03-28 | v1.46.33 | Polish | Fixed last 5 hardcoded `color:"#fff"` on T.accent elements — AnalyticsPage ACTIVE badge + Save button, TodayPage read badge, NotesPage Save button, Onboarding checkmark | `AnalyticsPage.jsx:259,316, TodayPage.jsx:419, NotesPage.jsx:221, Onboarding.jsx:109` | — |
| 2026-03-28 | v1.46.34 | Nav+Feature | Removed Home/History from Sidebar; revamped Today — single-line stat header, source-grouped article sections | `Sidebar.jsx:334, TodayPage.jsx:94-230,265-330` | — |
| 2026-03-28 | v1.46.35 | UX | Added "Start Reading"/"Continue Reading" CTA to Today header — opens first unread article and guides user through the queue | `TodayPage.jsx:113,130,293,320` | — |
| 2026-03-28 | v1.46.36 | Polish | Added `dangerText` token to all 3 themes — Distilled danger (#ffb4ab) made white text unreadable; UI.jsx, InboxPage, SecondaryPages now use T.dangerText | `tokens.js:51,76, UI.jsx:32, InboxPage.jsx:641, SecondaryPages.jsx:1706` | — |
| 2026-03-29 | v1.46.37 | Polish | Fixed 4 hardcoded `color:"#fff"` on T.accent elements in SecondaryPages — PRO badges (×2), Export button, Save button now use T.accentText | `SecondaryPages.jsx:301,485,690,1758` | — |
| 2026-03-29 | v1.46.38 | Feature | Notecard theme tagging on highlights — "+ theme" pills in HighlightsDrawer, tags[] column in DB schema, updateHighlightTags helper | `HighlightsDrawer.jsx:1-20,70-95, ContentViewer.jsx:12,152, supabase.js:167, supabase-schema.sql:48` | — |
| 2026-03-29 | v1.46.39 | Feature | Cards page — theme-first notecard browser; bucket grid + drill-in card list; Cards icon + nav item in Sidebar | `CardsPage.jsx:1-145, App.jsx:23,225, Sidebar.jsx:18,340` | — |
| 2026-03-29 | v1.46.40 | Polish | Fixed 8 hardcoded `color:"#fff"` on T.accent elements across modals/components — PlanGate, FolderModal, SmartFeedModal, AddModal, DigestModal, PWAInstallBanner, Onboarding | `PlanGate.jsx:53,63, FolderModal.jsx:105, SmartFeedModal.jsx:114, AddModal.jsx:158, DigestModal.jsx:104, PWAInstallBanner.jsx:99, Onboarding.jsx:126` | — |
| 2026-03-29 | v1.46.41 | UX | Added Review and Cards to MobileFeedDrawer — both pages were unreachable on mobile; completes notecard system mobile parity | `MobileFeedDrawer.jsx:270-275` | — |
| 2026-03-29 | v1.46.42 | Polish | Fixed hardcoded `#22C55E` on Today progress bar — 100% state now uses T.success for correct color on all themes | `TodayPage.jsx:360` | — |
| 2026-03-29 | v1.46.43 | Perf | Lazy-load ContentViewer in InboxPage — defers 14 kB gz reader chunk until first article open instead of loading with InboxPage | `InboxPage.jsx:10,988-1024` | — |
| 2026-03-30 | v1.46.44 | Perf | Non-blocking Google Fonts — preload+onload swap pattern eliminates ~773ms render-blocking penalty on initial paint | `index.html:10` | — |
| 2026-03-30 | v1.46.45 | Feature | "Ask about this article" Q&A in AI Summary card — input + answer display below format switcher, calls askQuestion() in fetchers.js | `fetchers.js:832, ContentViewer.jsx:625,845,884` | — |
| 2026-03-30 | v1.46.46 | Security | Removed all client-side AI API keys — all AI calls now route through Cloudflare Worker only; deleted localStorage key storage, VITE env paths, and direct browser API calls | `fetchers.js:700-894, apiKeys.js, SecondaryPages.jsx:742-764, cloudflare-worker/worker.js` | — |
| 2026-03-30 | v1.46.47 | Feature | Removed Notes — annotation pivots to highlight-first; NotesPage + ArticleNotesPanel removed; nav updated across Sidebar/BottomNav/MobileFeedDrawer; legacy notes route → Cards | `App.jsx:20,223, Sidebar.jsx:339, MobileFeedDrawer.jsx:267, ContentViewer.jsx:17,45-47,425-437,692-701` | — |
| 2026-03-30 | v1.46.48 | Feature | Highlight creates a card in one action — NotePanel opens immediately after highlight; NotePanel gains inline theme-tag input (passage + note + tag in one step) | `ContentViewer.jsx:138, NotePanel.jsx:1-95` | — |
| 2026-03-30 | v1.46.49 | Nav | Replaced "Saved" with "Cards" in BottomNav — completes the mobile reading loop (Inbox → highlight → Cards) | `BottomNav.jsx:15,23,31` | — |
| 2026-03-30 | v1.46.51 | Fix | Highlight toolbar position — changed to `position: fixed` so it always appears above selected text regardless of reader scroll position | `SelectionToolbar.jsx:31,62` | — |
| 2026-03-30 | v1.46.52 | Feature | Readwise-style review — fixed passage field bug, 5-card daily limit, swipe gestures, tags + annotation on card, natural button labels | `ReviewPage.jsx:1-230` | — |
| 2026-03-30 | v1.46.53 | Polish | Fixed 7 hardcoded colors from /polish audit — FolderModal, Sidebar, DigestModal, SecondaryPages, AnalyticsPage now use T.danger/T.accentText | `FolderModal.jsx:97, Sidebar.jsx:488,532, DigestModal.jsx:71, SecondaryPages.jsx:599,1296,1404, AnalyticsPage.jsx:316` | — |
| 2026-03-30 | v1.46.54 | Feature | Added "Untagged" bucket to CardsPage — highlights without theme tags were invisible; now browsable in a dedicated bucket | `CardsPage.jsx:38,50,61,115-160` | — |
| 2026-03-30 | v1.46.55 | Polish | Fixed ErrorBoundary crash screen hardcoded to Nocturne — reads localStorage theme at render time; Light + Distilled users now see correct colors | `UI.jsx:113-138` | — |
| 2026-03-30 | v1.46.56 | Nav | Removed "Add Source" pill from sidebar bottom; moved theme toggles inline with user/shortcuts row — cleaner footer, + icon in Feeds header is sufficient | `Sidebar.jsx:518-578` | — |
| 2026-03-30 | v1.46.57 | Nav | Floating FAB (Things 3-style), smart feeds above feed list, starred articles show yellow filled star, CLAUDE.md token efficiency mandate | `App.jsx:266, Sidebar.jsx:399-466, FeedItem.jsx:52-70,416,545, InboxPage.jsx:6,44,128,476` | — |
| 2026-03-30 | v1.46.58 | UX | Added global :focus-visible keyboard focus rings — overrides inline outline:none with !important so keyboard users always have a visible indicator | `index.css:171` | — |
| 2026-03-30 | v1.46.59 | Fix | Desktop now opens to Inbox — Home had no sidebar nav entry; users were stranded on a page with no return path | `App.jsx:57` | — |
| 2026-03-30 | v1.46.60 | Fix | Added missing UPDATE RLS policy on feeds table — folder assignment/renaming/settings all silently blocked | `supabase-schema.sql:79` | — |
| 2026-03-30 | v1.46.61 | Perf | Removed HomePage from bundle — 32KB dead chunk; unreachable since v1.46.34; default route → InboxPage | `App.jsx:18,217,229` | — |
| 2026-03-30 | v1.46.62 | Polish | Added aria-label to ActionBtn — icon-only article action buttons now have proper accessible names | `FeedItem.jsx:66` | — |
| 2026-03-30 | v1.46.63 | Feature | Cards inline editing — click annotation to edit in place, × to remove tags, inline input to add tags | `CardsPage.jsx:17-41,99-179` | — |
| 2026-03-30 | v1.46.64 | Fix | isRSSUrl matches query-param feed URLs (?rss=1, ?format=rss, ?type=rss) — Slickdeals-style feeds no longer misdetected as articles | `fetchers.js:561` | — |
| 2026-03-30 | v1.46.65 | Feature | Articles-per-feed limit defaults to 20 (was 80), configurable 10/20/50 in Settings → Reading | `fetchers.js:190-193,156,202, SecondaryPages.jsx:728` | — |
| 2026-03-30 | v1.46.66 | Fix | RSS image/description extraction — nodeName iteration replaces unreliable CSS namespace selectors; description falls back to content:encoded | `fetchers.js:268,281-329` | — |
| 2026-03-30 | v1.46.67 | Nav | Added Review to mobile BottomNav (replacing Today) — Review was inaccessible on mobile despite being a primary screen | `BottomNav.jsx:17-28` | — |
| 2026-03-30 | v1.46.68 | Perf | Lazy-load LoginPage — removed from eager main bundle; authenticated users never load this chunk | `App.jsx:7,17,186` | — |
| 2026-03-30 | v1.46.70 | Perf | Add canonical link to index.html — fixes Lighthouse SEO score 0.91 → 1.0 | `index.html:23` | — |
| 2026-03-30 | v1.46.71 | Perf | Lazy-load PWAInstallBanner — removed from eager main bundle; only loads on beforeinstallprompt | `App.jsx:7,32,326` | — |
| 2026-03-30 | v1.46.72 | UX | Remove borderBottom from skeleton rows — skeleton now matches real feed items (no dividers), eliminates border flash on load | `InboxPage.jsx:1160,1195` | — |
| 2026-03-30 | v1.46.73 | Nav | BottomNav hides on scroll-down, reappears on scroll-up — 54px more content visible while reading; resets on navigation | `BottomNav.jsx:40-52`, `InboxPage.jsx:897` | — |
| 2026-03-30 | v1.46.74 | Polish | Fade-in on page navigation — key={page} remounts page wrapper, triggering 150ms fadeIn from index.css | `App.jsx:257` | — |
| 2026-03-30 | v1.46.75 | Fix | Image extraction: filter data: URI placeholders, check data-src/data-lazy-src, scan all imgs not just first — fixes SlickDeals thumbnails | `fetchers.js:310-323` | — |
| 2026-03-30 | v1.46.76 | Polish | Remove decorative 1px divider in Sidebar between nav and feed tree — whitespace separates sections sufficiently | `Sidebar.jsx:394` | — |
| 2026-03-30 | v1.46.77 | Polish | Reduce mobile list-item padding 13px→10px — matches skeleton, eliminates height-shift on load, shows ~1 extra item per screen | `FeedItem.jsx:287` | — |
| 2026-03-31 | v1.46.78 | Polish | Remove "Smart"/"Feeds" 9px uppercase section labels from Sidebar — chrome reduction, add-buttons retained with tooltips | `Sidebar.jsx:401,418` | — |
| 2026-03-31 | v1.46.79 | Polish | Scale list-view items ~10% larger — thumbnail, title font, and row padding increased on both mobile and desktop | `FeedItem.jsx:212,231,236,260,287,315,344,373` | — |

---

## How to use this log

**During a session:** The `/iterate` skill appends a row here automatically after each deploy.

**End of session:** Run `/cost` in the Claude Code chat. It shows total tokens used this session. Note the dollar amount in the "Session Cost" column for the iterations you just ran. Then stop — all changes are committed and deployed.

**Resuming later:** Just open Claude Code and type `/iterate`. It reads git history, CLAUDE.md, and memory to understand current state — no need to brief it.

## Session history

| Date | Iterations | Focus | Session Cost |
|------|-----------|-------|-------------|
| 2026-03-27 | 2 | Nav: label consistency, touch cancel fix | — |
