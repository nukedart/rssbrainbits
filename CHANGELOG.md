# Feedbox Changelog

All notable changes documented here.
Format: `## [version] — YYYY-MM-DD`

## [1.46.133] — 2026-04-08

- [Fix] getReadUrls now scoped to last 90 days — previously hit Supabase's default 1000-row cap, causing items read >1000 articles ago to reappear as unread; 90-day window covers all realistic RSS item ages and keeps the query fast

## [1.46.132] — 2026-04-08

- [Polish] Replace 5 hardcoded iOS hex colors in swipe action buttons with theme tokens (T.accent, T.success, T.warning, T.surface2, T.accentText) — swipe actions now adapt to all three themes; eliminates jarring iOS blue/orange/green in Light (parchment) and Nocturne (sage) themes

## [1.46.131] — 2026-04-07

- [Polish] Remove decorative borders from inactive sidebar footer icon buttons (theme toggles, keyboard shortcut) — transparent border in rest state reduces visual noise; active accent border retained for state clarity

## [1.46.130] — 2026-04-06

### Changes since v1.46.127
- v1.46.128
- v1.46.128

---

## [1.46.128] — 2026-04-06

- [Polish] Inbox toolbar title: 14px → 17px with tighter letter-spacing — establishes one dominant heading per screen
- [Fix] AI summarization now routes through Supabase Edge Function (reads provider + API keys from admin panel app_config/app_secrets) — admin panel AI Settings now actually work; Cloudflare Worker is kept as fallback
- [Fix] Supabase summarize edge function now tracks usage in ai_usage table after each successful call — AI usage metrics in admin panel now populate correctly

## [1.46.127] — 2026-04-06

- [Fix] YouTube thumbnails: check media:thumbnail before media:content (YouTube's media:content is a Flash embed URL, not an image); add yt:videoId fallback to construct i.ytimg.com/vi/ID/hqdefault.jpg directly
- [Fix] Feed image extraction: DOMParser replaces regex-only approach in rss2json path — handles lazy-load src variants; also checks item.enclosures array for image types (fixes Slickdeals and similar)
- [Fix] Image parser: content:encoded checked before description for HTML image extraction — full post HTML has better images than excerpts

## [1.46.126] — 2026-04-06

- [UX] Remove borderBottom from reader top bar — blur+background already separates header from content; border was decorative chrome anchoring the eye away from the article


## [1.46.125] — 2026-04-06

### Changes since v1.46.118
- v1.46.121
- v1.46.123
- v1.46.122
- v1.46.121
- v1.46.119
- v1.46.120
- v1.46.119

---

## [1.46.124] — 2026-04-06

- [Nav] Sidebar active nav item now uses T.accentSurface background (matching mobile BottomNav) — previously used T.surface which was identical to hover, making active page indistinguishable at a glance

## [1.46.123] — 2026-04-06

- [Polish] Replace card-view hover drop shadow with a subtle border token — removes decorative chrome, aligns with the flat background-color hover pattern already used in list view

## [1.46.122] — 2026-04-05

- [Polish] Remove decorative boxShadow from list-item hover action tray — T.bg background already contrasts with the hovered row; shadow was decorative chrome adding visual weight to every article hover

## [1.46.121] — 2026-04-05

- [Polish] Read article titles on mobile now use T.textTertiary instead of T.textSecondary — matches desktop, strengthens unread/read hierarchy so unread items pop instantly when scanning the inbox

## [1.46.120] — 2026-04-04

- [Polish] Remove decorative border from unselected card-view items — card gap + borderRadius already define shape; only selected cards keep the accent border as functional selection indicator

## [1.46.119] — 2026-04-04

- [Polish] Remove decorative boxShadow from active Unread/All toggle pill — active state is already communicated by T.bg background and font-weight 600; toolbar reads calmer without the depth layer
- [Fix] Read-on-scroll: pass `root: listRef.current` to IntersectionObserver so it tracks the scroll container boundary, not the viewport; items now correctly mark read when scrolled past the top
- [Fix] Inbox sort: guaranteed newest-first across all filter modes with safe date handling for items missing dates

## [1.46.118] — 2026-04-04

- [Polish] BottomNav pill larger: button padding 8→11px, icons 21→24px, Add circle 36→42px, labels 10→11px

## [1.46.117] — 2026-04-04

- [Nav] Feeds pill button now stays active on Today and Saved pages — previously the pill showed no active item when navigating to those pages via the Feeds drawer

## [1.46.116] — 2026-04-04

- [Polish] Page transitions upgraded from plain fadeIn to fadeInScale (0.96→1 scale + fade) — every navigation feels spatial and intentional instead of just appearing

## [1.46.115] — 2026-04-04

- [UX] SwipeRow now handles onTouchCancel — interrupted swipes (OS gesture, call, notification) snap back instead of staying stuck mid-swipe

## [1.46.114] — 2026-04-04

- [UX] Remove reading time footer row from sm card size — dead space on mobile 2-column grid where description is already hidden; md/lg cards keep it

## [1.46.113] — 2026-04-04

- [Polish] Active BottomNav tab now shows a subtle accentSurface background pill — makes current page unambiguous vs color-only differentiation

## [1.46.112] — 2026-04-04

- [Nav] Restore Today and Saved access on mobile — added compact pill buttons in Feeds bottom sheet after removing the full nav row list in v1.46.106

## [1.46.111] — 2026-04-04

- [Polish] Card items now have a 1px border + 14px radius + subtle hover shadow — defines cards clearly across all themes, especially Light/Distilled where card-bg contrast is low

## [1.46.110] — 2026-04-04

- [Fix] Auto-mark-read on scroll was broken — IntersectionObserver was being recreated on every read (because readUrls was a dependency), which disconnected all observations; fixed by keeping readUrls in a ref so the observer stays stable

## [1.46.109] — 2026-04-04

- [Polish] AddModal polished: header with RSS icon + title separated by a divider, larger input with focus ring glow, detected type shown as a small uppercase accent badge, deeper shadow and tighter border radius

## [1.46.108] — 2026-04-04

- [Nav] Add button restored to pill nav (5 items)
- [Polish] AddModal redesigned — no heavy header, X button replaces Cancel, input is the hero, detected type shown as a slim accent label, single full-width action button

## [1.46.107] — 2026-04-04

### Changes since v1.46.106

---

## [1.46.106] — 2026-04-04

- [Nav] Removed Add button from pill nav — 4-item pill (Feeds, Inbox, Cards, Review) is cleaner and more balanced
- [Nav] Feeds bottom sheet now focused purely on feed browsing — removed duplicate nav rows (Inbox, Today, Cards, Review, Settings) that were redundant with the pill

## [1.46.105] — 2026-04-04

- [Polish] Floating pill nav sits closer to screen edge (16→8px) and button items are slightly larger (10→12px vertical padding)

## [1.46.104] — 2026-04-03

- [Nav] Floating pill nav is always visible (removed scroll-hide); mobile toolbar taller (62px); feed scroll area extends to screen bottom with just enough padding to clear the pill

## [1.46.103] — 2026-04-03

- [Nav] BottomNav is now a floating pill — centered, lifted off the bottom edge with rounded corners and a deep shadow instead of a full-width bar

## [1.46.102] — 2026-04-03

- [Nav] Replaced hand-rolled SVG icon components in BottomNav with lucide-react icons (List, Inbox, CreditCard, RefreshCw, Plus) — declarative NAV_ITEMS array, active state via strokeWidth, all existing behavior preserved

## [1.46.101] — 2026-04-03

- [Nav] BottomNav now always reappears after closing an article on mobile — dispatches "up" event on ContentViewer close so a hidden nav never stays hidden after returning to the list

## [1.46.100] — 2026-04-03

- [Polish] Review page now uses the same highlight color definitions as Cards page — yellow/green/blue/purple strips match between the two views for visual consistency

## [1.46.99] — 2026-04-03

- [Perf] Lazy-load fuse.js (6.6 kB gz) on first search keystroke instead of statically with InboxPage — browser no longer fetches the fuzzy-search library until the user actually searches

## [1.46.98] — 2026-04-03

- [Polish] Search match highlight now uses the theme accent color (`T.accent` at 33% opacity) instead of a hardcoded teal — matches correctly in all three themes (sage in Nocturne, periwinkle in Distilled, forest green in Light)

## [1.46.97] — 2026-04-03

- [Polish] Today hero card no longer fades to 65% opacity when read — the "✓ Read" badge on the image already signals read state; now only the title dims to T.textTertiary, keeping the hero image crisp

## [1.46.96] — 2026-04-03

- [Polish] Remove decorative border from inactive source filter button — button reads clearly through its surface background; accent border preserved only when a filter is active (functional signal). Principle: no decorative chrome.

## [1.46.95] — 2026-04-03

- [Polish] Today page read items no longer fade the whole row at 50% opacity — images keep full presence, only the title dims to T.textTertiary; matches InboxPage's color-based read state pattern

## [1.46.94] — 2026-04-03

- [Polish] Card view source labels muted from T.accent to T.textSecondary (weight 600→500) — matches the list view fix from v1.46.90, giving card view the same calm hierarchy where titles are the focal point

## [1.46.93] — 2026-04-03

- [Fix] Podcast episodes in card view no longer show a misleading "X min read" estimate alongside the real audio duration — mirrors the existing guard already in list view

## [1.46.92] — 2026-04-03

- [Polish] Remove borderTop hairline from BottomNav — backdrop-filter blur already separates the nav from content; removing the hard edge makes the nav feel like a floating glass surface (Reeder/iOS style) rather than a boxed element. Serves "No decorative chrome" principle.
## [1.46.91] — 2026-04-02

- [Feature] Podcast episodes now open in the right panel (desktop) / full-screen (mobile) like articles — centered album art, inline play/pause/skip/seek controls, playback rate, sleep timer, and AI summary embedded directly in ContentViewer; clicking a podcast item no longer opens a separate modal

## [1.46.90] — 2026-04-02

- [Polish] Mute mobile list item source labels from T.accent to T.textSecondary (weight 600→500) — serves "Calm hierarchy" principle; titles become the clear focal point, the accent unread dot gains meaning as the sole accent signal, and the list reads quieter matching Reeder's visual style

## [1.46.89] — 2026-04-01

- [Polish] Remove decorative borderTop from CardItem hover action bar — T.surface background already creates contrast against T.card; eliminating the border makes the hover state softer per "No decorative chrome" principle

## [1.46.88] — 2026-04-01

- [Polish] Increase mobile list item vertical padding from 11px to 14px — serves "Generous whitespace" principle; every Inbox row gains 6px of breathing room between entries, making the list feel calmer and more deliberate

## [1.46.87] — 2026-03-31

- [Polish] Replace hardcoded sage-green rgba in reading-progress bars with T.accent token — bars in both list-view thumbnails and card-view now match the theme accent (periwinkle in Distilled, forest green in Light) instead of always showing Nocturne's sage green

## [1.46.86] — 2026-03-31

- [Fix] RSS content fallback in reader — when article fetch is blocked (Cloudflare, CORS, paywalls) or returns thin content (<200 chars), reader now shows the RSS feed's own content:encoded/description with a "📡 RSS preview" banner and "read full article ↗" link — same pattern used by Reeder/NetNewsWire
- [Fix] Detect Cloudflare challenge pages in fetchArticleContent and throw immediately instead of parsing garbage HTML
- [Fix] Add site-specific DOM selectors for slickdeals.net (deal body) and alternativeto.net (app description)

## [1.46.85] — 2026-03-31

- [Feature] Add Spotify & Apple Podcast link support — paste any open.spotify.com/show or open.spotify.com/episode URL; app fetches show title via Spotify oEmbed then searches iTunes for the RSS feed automatically. Also adds Overcast, Pocket Casts, and Castro URL detection. Shows "Spotify Podcast" chip in AddModal while resolving.

## [1.46.84] — 2026-03-31

- [Feature] Redesign PodcastPlayer — desktop: centered glassmorphic modal (440px, album art header, fade-to-card gradient); mobile: full-screen sheet with blurred artwork background, large controls, "Now Playing" label

## [1.46.83] — 2026-03-31

- [Polish] Standardise BottomNav active label fontWeight to 600 across all tabs — was 700 for standard tabs vs 600 for Feeds tab; reduces visual jump and unifies active state

## [1.46.82] — 2026-03-31

- [Polish] Add Open Graph and Twitter Card meta tags to index.html — improves share link previews and SEO score

## [1.46.81] — 2026-03-31

- [Polish] Remove decorative 1px boxShadow divider from Inbox toolbar — serves no functional purpose (whitespace already separates toolbar from list); reduces visual chrome on the most-used screen per the "no decorative chrome" principle

## [1.46.80] — 2026-03-31

- [Feature] Persist AI summaries in localStorage keyed by article URL — summaries now survive reader close/reopen and load instantly without re-generating

## [1.46.79] — 2026-03-31

- [Polish] Scale list-view feed items ~10% larger — mobile thumbnail 84→92px, mobile title 16→18px, desktop thumbnail 72×54→80×60px, desktop title md 15→17px / lg 17→19px, row padding increased proportionally

## [1.46.78] — 2026-03-31

- [Polish] Remove "Smart" and "Feeds" 9px uppercase section labels from Sidebar — add-buttons remain with tooltips; visual distinction between smart/regular rows is sufficient

## [1.46.77] — 2026-03-30

- [Polish] Reduce mobile list-item vertical padding 13px → 10px — matches skeleton loader padding (eliminating height-shift on load) and shows ~1 extra item above the fold

## [1.46.76] — 2026-03-30

- [Polish] Remove decorative divider between Sidebar nav and feed tree — whitespace already creates visual separation; reduces chrome per no-decoration principle

## [1.46.75] — 2026-03-30

- [Fix] RSS image extraction: skip data: URI placeholders from lazy-load libraries; check data-src/data-lazy-src/data-original fallback attributes; scan all imgs in description (not just first); fixes blank thumbnails on SlickDeals and other sites using lazy-loading in RSS descriptions

## [1.46.74] — 2026-03-30

- [Polish] Fade-in animation on page navigation — adding `key={page}` to the page wrapper remounts it on navigation, triggering a 150ms opacity fadeIn; pages feel spatial rather than instant

## [1.46.73] — 2026-03-30

- [Nav] BottomNav hides on scroll-down and reappears on scroll-up — gives back 54px of content while reading the feed list; resets on page navigation

## [1.46.72] — 2026-03-30

- [UX] Remove borderBottom from skeleton loading rows — skeletons now match the no-divider treatment of real feed items, eliminating the border flash on content load

## [1.46.71] — 2026-03-30

- [Perf] Lazy-load PWAInstallBanner — removes it from the eager main bundle; it fires only on `beforeinstallprompt`, so most users never trigger it

## [1.46.70] — 2026-03-30

- [Perf] Add canonical link to index.html — missing `<link rel="canonical">` was causing Lighthouse SEO score of 0.91; should bring it to 1.0

## [1.46.69] — 2026-03-30

- [Perf] Lazy-load LoginPage — removes it from the eager main bundle; authenticated returning users never load this chunk, trimming ~3–5 kB gz from TTI

## [1.46.68] — 2026-03-30

- [Polish] Remove borderBottom divider from mobile list-view items — whitespace alone separates rows (matches desktop); reduces visual noise on the most-used screen per "no decorative chrome" principle

## [1.46.67] — 2026-03-30

- [Nav] Add Review to mobile BottomNav (replacing Today) — Review is a primary screen per product vision but was inaccessible on mobile; reorders nav to match Inbox → Cards → Review priority

## [1.46.66] — 2026-03-30

- [Fix] RSS image and description extraction — replaced unreliable CSS-escaped namespace selectors (media\\:content) with nodeName/localName iteration; description now falls back to content:encoded when description element is missing; fixes blank cards on BBC, WordPress, Substack, and most major feeds

## [1.46.65] — 2026-03-30

- [Feature] Articles-per-feed limit — default reduced to 20 (was 80), user-configurable to 10/20/50 in Settings → Reading; faster feeds, less noise

## [1.46.64] — 2026-03-30

- [Fix] isRSSUrl now matches query-param feed URLs like `?rss=1`, `?format=rss`, `?type=rss` — fixes Slickdeals and similar feeds being misdetected as articles

## [1.46.63] — 2026-03-30

- [Feature] Cards inline editing — click any annotation to edit it in place; tags get × remove buttons and an inline "+ tag" input; all changes saved optimistically to Supabase

## [1.46.62] — 2026-03-30

- [Polish] Added aria-label to ActionBtn in FeedItem — icon-only article action buttons (star, clock, read, external) now have proper accessible names for screen readers

## [1.46.61] — 2026-03-30

- [Perf] Removed HomePage from bundle — 32KB dead chunk eliminated; page had no nav entry since v1.46.34 and is unreachable; default route now falls to InboxPage

## [1.46.60] — 2026-03-30

- [Fix] Added missing UPDATE RLS policy on feeds table — folder assignment, feed renaming, and feed settings were all silently blocked by Supabase (requires running migration SQL in Supabase dashboard)

## [1.46.59] — 2026-03-30

- [Fix] Desktop now opens to Inbox instead of Home — Home has no sidebar nav entry so users were stranded on a page with no return path; Inbox is the correct primary destination on all screen sizes

## [1.46.58] — 2026-03-30

- [UX] Added global :focus-visible keyboard focus rings — every button and link now shows a 2px outline when navigated by keyboard; inline outline:none styles no longer suppress focus for keyboard users

## [1.46.57] — 2026-03-30

- [Nav] Floating FAB replaces sidebar Add Source button — Things 3-style fixed "+" on desktop bottom-right; smart feeds moved above feed list in sidebar; star icon turns yellow (filled) when an article is starred

## [1.46.56] — 2026-03-30

- [Nav] Removed "Add Source" pill button from sidebar bottom — + icon in Feeds header already handles this; moved theme toggles (Sun/Moon) inline with user row next to shortcuts button for a less cluttered footer

## [1.46.55] — 2026-03-30

- [Polish] Fixed ErrorBoundary crash screen hardcoded to Nocturne colors — reads theme from localStorage at render time so Light and Distilled users see correct background, text, and accent colors on error

## [1.46.54] — 2026-03-30

- [Feature] Added "Untagged" bucket to CardsPage — highlights saved without a theme tag were invisible; now appear as a dedicated bucket so no highlight is ever lost

## [1.46.53] — 2026-03-30

- [Polish] Fixed 7 hardcoded colors from /polish audit — FolderModal delete button, Sidebar error badge + hover, DigestModal error bg, SecondaryPages notification status + 2 hover buttons, AnalyticsPage save button now all use T.danger/T.accentText tokens across all three themes

## [1.46.52] — 2026-03-30

- [Feature] Readwise-style daily review — fixed critical bug (passage field was "text", showed undefined); 5-card daily sessions; swipe right = Got it / left = Forgot; tags + annotation shown on card; "Forgot / Got it / Easy" labels; serif passage typography; animated swipe feedback

## [1.46.51] — 2026-03-30

- [Fix] Highlight toolbar now uses `position: fixed` — was `absolute` which caused it to appear far below the selected text after scrolling, since the reader has its own scroll container (window.scrollY is always 0)

## [1.46.50] — 2026-03-30

### Changes since v1.46.49

---

## [1.46.49] — 2026-03-30

- [Nav] Replaced "Saved" with "Cards" in mobile BottomNav — Cards is now the primary output surface (notecard library); Saved is still reachable from the drawer

## [1.46.48] — 2026-03-30

- [Feature] Highlight → card in one action: selecting text and picking a color now immediately opens the card panel (passage + annotation + theme tag) instead of silently saving; NotePanel gains inline tag input so a complete notecard is created without leaving the reader

## [1.46.47] — 2026-03-30

- [Feature] Removed Notes — annotation is now highlight-first; per-highlight notes (NotePanel) remain as the "notecard back"; NotesPage and ArticleNotesPanel deleted from all nav surfaces and reader toolbar; legacy /notes route redirects to Cards

## [1.46.46] — 2026-03-30

- [Security] Removed all client-side AI API keys — deleted localStorage key storage, VITE env var paths, and direct browser calls to Anthropic/OpenAI; all AI features now route exclusively through the Cloudflare Worker (server-side secret); added /ask and /tags endpoints to the Worker

## [1.46.45] — 2026-03-30

- [Feature] "Ask about this article" Q&A in the AI Summary card — after summarizing, users can type any question and get a concise AI answer without leaving the reader

## [1.46.44] — 2026-03-29

- [Perf] Non-blocking Google Fonts load — changed from render-blocking `<link rel="stylesheet">` to `rel="preload"` + onload swap; eliminates the ~773ms render-blocking penalty Lighthouse flagged, improving FCP and LCP

## [1.46.43] — 2026-03-29

- [Perf] Lazy-load ContentViewer within InboxPage — static import was causing the 14 kB gz article reader chunk to download immediately on InboxPage load; now deferred until user first opens an article, reducing initial parse/exec work on the critical path

## [1.46.42] — 2026-03-29

- [Polish] Fixed hardcoded `#22C55E` on Today progress bar — 100% completion state now uses T.success token so it renders correctly on Distilled and Light themes

## [1.46.41] — 2026-03-29

- [UX] Added Review and Cards to MobileFeedDrawer nav — both pages were unreachable on mobile after being added to the Sidebar in v1.46.39; mobile users can now access the full notecard system (highlight → tag → review → browse cards)

## [1.46.40] — 2026-03-29

- [Polish] Fixed 8 remaining hardcoded `color:"#fff"` on T.accent elements — PRO badge, Upgrade button (PlanGate), Save folder button (FolderModal), Add keyword (SmartFeedModal), Add source icon (AddModal), Generate digest (DigestModal), Install app (PWAInstallBanner), Subscribe button (Onboarding) now all use T.accentText

## [1.46.39] — 2026-03-29

- [Feature] Cards page — theme-first browser for tagged highlights (Ryan Holiday notecard system); bucket view groups captures by theme with count, drill-in shows full card list with passage, note, source, and cross-theme tag links; accessible from Sidebar nav

## [1.46.38] — 2026-03-29

- [Feature] Notecard theme tagging on highlights — each highlight in the drawer now shows tag pills and a "+ theme" button to categorize captures by idea (e.g. "stoicism", "leadership") independent of the source article; the schema adds a `tags text[]` column to highlights (migration: `ALTER TABLE highlights ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'`)

## [1.46.37] — 2026-03-29

- [Polish] Fixed 4 remaining hardcoded `color:"#fff"` on T.accent-background elements in SecondaryPages — PRO plan badges (×2), the OPML Export button, and the Save article button now use T.accentText for correct contrast on all themes

## [1.46.36] — 2026-03-29

- [Polish] Added `dangerText` token to all three themes — Distilled's danger color (#ffb4ab, light pink) made white text unreadable; UI.jsx Button danger variant, InboxPage error badge, and SecondaryPages delete account button now use T.dangerText for correct contrast on every theme

## [1.46.35] — 2026-03-28

- [UX] Added "Start Reading" / "Continue Reading" CTA to Today header — launches a guided reading session from the first unread article using the existing next/prev queue; turns Today from a passive list into an actionable reading session

## [1.46.34] — 2026-03-28

- [Nav] Removed Home and History from Sidebar nav — cleaner 5-item list focused on daily workflow
- [Feature] Revamped Today view — replaced 3-column stat grid + source chips with a clean single-line stat; articles now grouped by source with section headers, giving a newspaper front-page feel

## [1.46.33] — 2026-03-28

- [Polish] Fixed hardcoded `color:"#fff"` on 5 remaining T.accent elements — ACTIVE badge and Save button in AnalyticsPage, Read badge in TodayPage, Save note button in NotesPage, and onboarding checkmark now all use T.accentText

## [1.46.32] — 2026-03-27

- [Feature] Spaced repetition Daily Review — new Review page surfaces highlights due for re-reading using SM-2 scheduling stored in localStorage; Again/Good/Easy buttons advance the schedule; accessible from Sidebar nav

## [1.46.31] — 2026-03-27

- [Feature] AI-suggested tags on article open — when content loads for a Pro user, Haiku suggests 3–5 tags shown as one-tap pills in the tags bar; clicking a pill instantly applies the tag

## [1.46.30] — 2026-03-27

- [Polish] Fixed hardcoded `color:"#fff"` on 3 accent buttons in InboxPage — "New articles" banner, Add Feed CTA, and Retry button now use T.accentText for correct contrast on all themes

## [1.46.29] — 2026-03-27

- [Polish] Fixed hardcoded `color:"#fff"` on 5 accent buttons in SecondaryPages — Add feed, PRO badge, Enable notifications, Export OPML, and Export All now use T.accentText for correct contrast on all themes

## [1.46.28] — 2026-03-27

- [UX] Improved TodayPage empty state — new users (no feeds) now see a setup prompt instead of confusing "no new articles" message; existing users with a quiet day see "Quiet day" with context

## [1.46.27] — 2026-03-27

- [UX] Moved Admin button directly below Sources in Sidebar — groups management tools together, separates admin actions from theme/settings controls

## [1.46.26] — 2026-03-27

- [UX] Added aria-label and aria-current to Sidebar nav items and collapse/expand toggle — collapsed sidebar was inaccessible to screen readers; title attribute alone is not announced by assistive tech

## [1.46.25] — 2026-03-27

- [UX] Added aria-label and aria-current to all BottomNav buttons — Add button was completely invisible to screen readers; nav tabs now correctly announce active page

## [1.46.24] — 2026-03-27

- [Polish] Fixed hardcoded `#e53e3e` on feed error badge in InboxPage — now uses T.danger token so it renders as theme-appropriate red/peach across all three themes

## [1.46.23] — 2026-03-27

- [Polish] Fixed hardcoded `#03210b` (Nocturne accentText) in NotesPage and ArticleNotesPanel — New Note and Save buttons now use T.accentText, correct on all three themes

## [1.46.22] — 2026-03-27

- [Polish] Replaced ⚙ emoji with SVG bar-chart icon on Sidebar admin analytics button — crisp on retina, consistent with the rest of the icon system

## [1.46.21] — 2026-03-27

- [Polish] Fixed hardcoded Nocturne accent color (#accfae) in NotesPage TagCard tag pills and divider — now uses T.accent/T.accentSurface/T.accentText tokens so tags render correctly on all three themes

## [1.46.20] — 2026-03-27

- [Polish] Fixed hardcoded `color:"#fff"` on MobileFeedDrawer Add Source button — use `T.accentText` token for correct contrast on Nocturne theme (sage accent needs dark text)

## [1.46.19] — 2026-03-27

- [Nav] Added "History" to Sidebar nav — page existed in router but was unreachable from any nav surface

## [1.46.18] — 2026-03-27

- [Nav] Added "Home" as first Sidebar nav item — dashboard page was the default desktop landing but had no return path once navigated away

## [1.46.17] — 2026-03-27

- [Polish] Replaced clock icon with bookmark icon for "Saved" in Sidebar — matches BottomNav's bookmark and the "Saved" label, consistent visual metaphor across desktop and mobile

## [1.46.16] — 2026-03-27

- [Nav] Fixed "All Items" label in MobileFeedDrawer — now reads "Inbox" to match Sidebar and BottomNav labels

## [1.46.15] — 2026-03-27

- [Polish] Fixed hardcoded `color: "#fff"` on BottomNav Add button and unread badge — now uses `T.accentText` token for correct contrast across all three themes (Nocturne accent is light sage, white text had ~1.5:1 contrast ratio)

## [1.46.14] — 2026-03-27

- [Nav] Added `onTouchCancel` to all BottomNav button types — fixes buttons getting stuck in a dimmed state when a scroll gesture cancels a tap

---

## [1.46.13] — 2026-03-27

- [Nav] Renamed sidebar label "All Items" → "Inbox" to match mobile nav label — consistent language across all screen sizes

---

## [1.46.12] — 2026-03-27

### Changes since v1.46.11

---

## [1.46.11] — 2026-03-27

### Changes since v1.46.10

---

## [1.46.10] — 2026-03-27

### Changes since v1.46.9

---

## [1.46.9] — 2026-03-27

### Changes since v1.46.8
- Restore and enhance standalone admin panel at public/admin/

---

## [1.46.8] — 2026-03-27

### Changes since v1.46.5
- v1.46.11 — /admin is a real URL via Vite multi-page build
- v1.46.10 — Admin panel direct URL + sidebar shortcut
- v1.46.9 — Admin panel API key inputs + secure server-side key storage
- v1.46.8 — Admin panel: dual AI provider (Claude Haiku / GPT-4o-mini), secure key management
- Add SWIFT_REBUILD.md — iOS/macOS universal app rebuild guide
- Add LAUNCH.md — Stripe config, production checklist, user acquisition playbook
- v1.46.7 — AI usage enforcement + landing page
- v1.46.6 — Readability, mobile swipe fix, hover action overlays

---

## [1.46.11] — 2026-03-27

### Changes since v1.46.10
- **`rss.brainbits.us/admin` is now a real URL** — Vite multi-page build generates `dist/admin/index.html` that loads the full React app pre-navigated to the admin panel
- Removed old standalone static admin page (`public/admin/index.html`) — replaced by the React-based admin panel
- Removed `/#admin` hash routing in favour of the dedicated page entry point
- `admin/index.html` sets `window.__FB_INITIAL_PAGE__ = "analytics"` before React mounts; App.jsx reads it to set the initial page

---

## [1.46.10] — 2026-03-27

### Changes since v1.46.9
- **`rss.brainbits.us/#admin` URL** — direct link to the admin panel now works; hash is set/cleared automatically when navigating in/out
- **Admin link in Sidebar** — admin users see an "Admin" shortcut at the bottom of the sidebar (above Settings); no longer need to dig through Settings to find it

---

## [1.46.9] — 2026-03-27

### Changes since v1.46.8
- **Admin AI Settings** — API key input fields added directly in the panel; keys stored in new `app_secrets` Supabase table (admin-only RLS, no browser/localStorage exposure)
- **Model picker** — shows KEY SET / NO KEY badge per provider; saving updates both the active provider and whichever keys were entered
- **`summarize` Edge Function** — rewired to read provider from `app_config` and API key from `app_secrets` (falls back to env secrets); now supports both Claude Haiku and GPT-4o-mini server-side
- **Supabase migration** — `app_secrets` table with admin-only read+write RLS policy
- All three Supabase deployments run: `admin-stats`, `summarize` (both `--no-verify-jwt`), and `app_secrets` migration

---

## [1.46.8] — 2026-03-27

### Changes since v1.46.7
- **Admin panel** — Analytics page now has tabs: Analytics and AI Settings
- **Dual AI provider support** — Admin can switch between Claude Haiku 4.5 (Anthropic) and GPT-4o-mini (OpenAI) from the admin panel; ~4× cheaper with GPT-4o-mini
- **Secure provider storage** — Active AI provider stored in Supabase `app_config` table (admin-only write, applies to all users); API keys remain exclusively in Cloudflare Worker / Supabase Edge Function secrets — never in DB or browser
- **AI usage tracking** — Admin AI Settings tab shows summaries today / 7d / 30d, unique users, and estimated cost at active model rates
- **admin-stats edge function** — Fixed 401 Invalid JWT by deploying with `--no-verify-jwt`; now returns AI usage totals alongside user/analytics data
- **Cloudflare Worker** — Extended to support OpenAI (`OPENAI_API_KEY` secret) alongside Anthropic; provider routed via request payload
- **Supabase migration** — `app_config` table + admin read policy for `ai_usage` (admins see all users' rows)
- **User settings** — Added OpenAI personal fallback key input alongside existing Anthropic key
- Admin panel label updated: "Analytics Dashboard" → "Admin Panel" with subtitle listing all sections

---

## [1.46.7] — 2026-03-25

### Changes since v1.46.6
- AI summary daily limit enforced for free users (5/day via `ai_usage` Supabase table + atomic RPC)
- Landing page added at `/landing.html` — hero, features grid, pricing comparison, footer
- Supabase migration: `ai_usage` table + `increment_ai_usage` RPC function

---

## [1.46.6] — 2026-03-25

### Changes since v1.46.5
- Readability integration, mobile swipe fix, and hover action overlay improvements (see v1.46.5)

---

## [1.46.5] — 2026-03-25

### Changes since v1.46.4
- Integrated `@mozilla/readability` into `fetchArticleContent` as the primary extraction path, with the existing manual DOM parser as fallback
- Fixed mobile feed list: first item no longer shows action buttons without swiping (cursor-based selection was incorrectly applied on mobile)
- Feed item hover actions no longer shift layout — action buttons now appear as absolute overlays (list: right-aligned pill, card: bottom bar) so text and formatting are unchanged
- Desktop action buttons use consistent icon set (Read/Unread, Save for later, Star, Open original) matching mobile swipe actions; card Play button now correctly calls `onPlayPodcast`

---

## [1.46.4] — 2026-03-25

### Changes since v1.46.3

---

## [1.46.3] — 2026-03-25

### Changes since v1.46.2

---

## [1.46.2] — 2026-03-25

### Changes since v1.46.1

---

## [1.46.1] — 2026-03-25

### Changes since v1.44.3
- v1.46.0 — mobile Reeder overhaul + Today dashboard + UX fixes
- v1.45.0 — Today page + article-linked notes

---

## [1.46.0] — 2026-03-25

### Mobile — Reeder-style overhaul
- **Feed drawer → bottom sheet** — slides up from the bottom with a drag handle to dismiss; rounded top corners, blur backdrop; Settings moved inside the sheet
- **Bottom nav** — replaced Settings tab with Today; new tab order: Feeds · Inbox · + · Today · Saved. Filled/outlined icon pair for active state (matches iOS SF Symbol convention)
- **Inbox toolbar** — on mobile shows only: title/badge, Unread/All toggle, Search, Add. AI digest, refresh (use pull-to-refresh), view picker, and source filter are hidden
- **Default view mode on mobile** — changed from cards to list (more readable, larger tap targets)
- **Add button** on mobile toolbar is slightly taller (34px) for easier tap

### Feed filter UX
- **3 tabs → 2 tabs** — removed "Read" tab, kept "Unread" (default) and "All". Read history lives in the History page
- **Default filter changed to "Unread"** — you see new articles immediately on open, not everything

### Today page — daily brief dashboard
- **Stats header** — 3 cards: total articles, unread count, estimated reading time remaining
- **Progress bar** — shows % read with "All done ✓" completion state in green
- **Source chips** — at-a-glance breakdown of which sources published today and how many
- **Hero article** — first unread article (preferring one with an image) featured prominently above the list
- **Article list** — compact items below the fold, unchanged in split-view desktop mode

### Read-on-scroll
- Changed from "mark when 90% visible" to **mark when item passes the top of the viewport** (bottom edge exits above the scroll window) — matches Reeder / Readwise Reader behaviour

### Folder persistence fix
- `setFeedFolder` now uses `.select().single()` so silent RLS failures are detected and thrown rather than silently swallowed
- Rollback on failure restores the original `folder_id` (was incorrectly setting `undefined`)

### Article parsing improvements
- **Site-specific selectors** for makeuseof.com, 9to5mac.com, 9to5google.com, electrek.co, appleinsider.com, macrumors.com, The Verge, Ars Technica, Wired, TechCrunch, Engadget — tried first before generic selectors
- **Noise removal** refactored to a single `querySelectorAll` call (was N×M loop) — measurably faster on long articles
- Added `author-box`, `bio-box`, `newsletter-signup`, `related-posts` selectors for WordPress / MakeUseOf cleanup

---

## [1.45.0] — 2026-03-25

### Added
- **Today page** — dedicated focused daily digest replacing the filtered inbox view. Shows a date header, reading progress bar (X / N read), and a clean editorial article list. Articles fade and show a ✓ when read. Desktop: split-pane list + inline reader. Mobile: full-screen reader on tap.
- **Article-linked notes** — notes can now be attached to the article you're reading. "Note" button in the ContentViewer toolbar opens an article notes panel (side drawer on desktop, bottom sheet on mobile) showing existing notes and a quick-create form. Notes panel auto-opens in create mode when empty.
- **Note count badge** — "Note" button in the article toolbar shows a count badge when notes exist on that article.
- **Article context in Notes library** — NoteCards linked to an article show a "From" chip with the article title and a Re-read ↗ link.
- **Article context in Note editor** — NoteEditor shows the source article title and a Re-read ↗ link at the top when the note is article-linked.
- **Notes table migration** — NotesPage detects if the `article_url`/`article_title` columns are missing and shows a one-click SQL migration prompt. Updated `SETUP_SQL` includes the new columns for fresh installs.

---

## [1.44.3] — 2026-03-24

### Changes since v1.44.2

---

## [1.44.2] — 2026-03-24

### Changes since v1.28.9
- v1.44.1 — fix list view M/L size: both were mapping to lg
- v1.44.0 — YouTube wider + transcript, folder hover actions, home stats, card polish
- v1.43.0 — podcast fix, mobile feed drawer, manage feeds polish
- v1.42.0 — Reeder-style folder sidebar + quick wins batch
- v1.41.0 — S/M/L restored, uniform list cards, favicon image placeholder
- v1.40.0 — fix inbox (getCachedFeed import) + Poppins/Cormorant/Merriweather fonts
- v1.39.0 — YouTube feed fix + instant cache render + drag size slider
- v1.38.0 — Source Dashboard: Collections tab + YouTube tag fix + color badges
- v1.37.0 — centered Add Source button + Latest/Unread/Read filter tabs
- v1.36.0 — YouTube channel support: folder, per-feed routing, proper subscribe
- move version to About section in Settings
- chore: fix .gitignore — remove node_modules, supabase/.temp, .DS_Store from tracking
- v1.36.0 — Source Dashboard, Add Source button, mobile/desktop UX + DB optimizations
- v1.35.0 — Notes Library + Editor + Supabase notes CRUD
- v1.34.0 — Notes page overhaul + mobile UX polish
- v1.33.0 — pill style tabs, folders fix, tags Pro gate
- v1.32.0 — fix Pro plan being wiped by OAuth re-login
- v1.31.0 — editorial reader redesign
- v1.30.0 — stitch view, API key restore, CF Worker style support, UX overhaul

---

## [1.41.0] — 2026-03-24

### Changed
- **S/M/L size buttons restored** — reverted drag slider back to the three-button S / M / L selector in View Options.
- **List view larger by default** — list items now use Merriweather for titles (md/lg sizes), font sizes bumped to 15px (M) / 17px (L). Descriptions shown in M and L list sizes.
- **List cards uniform height** — thumbnail slot always rendered in list view (md/lg), eliminating height variance between items with and without images.
- **Favicon placeholder in image slot** — when no article image is available, the list thumbnail shows the source favicon centered on the source color background. Falls back to the source initial letter if the favicon also fails.

---

## [1.40.0] — 2026-03-24

### Fixed
- **Inbox feeds broken** — `getCachedFeed` was called in the new cache pre-seed code but missing from the `feedCache` import, causing a `ReferenceError` that silently crashed the entire feed fetch loop. Added to import.

### Changed
- **Font system** — full typography overhaul across the app:
  - **Poppins** (geometric sans) replaces Inter for all UI chrome — nav, buttons, labels, badges, metadata
  - **Cormorant Garamond** (display serif) replaces Newsreader for brand name, article headlines in cards, notes titles, and editorial headings
  - **Merriweather** (text serif) replaces Noto Serif for reader body text, reader font preference, and reading view content

---

## [1.39.0] — 2026-03-24

### Fixed
- **YouTube feeds now load in inbox** — `type: "youtube"` was excluded from the feed fetch loop; feeds were added correctly but never appeared in the inbox. Fixed by including youtube alongside rss/podcast in the fetch filter.
- **Instant article rendering** — inbox now synchronously pre-seeds items from localStorage cache before any async work, eliminating the loading spinner for users with cached data. Fresh fetches update items in the background without blocking the UI.

### Changed
- **Size control is now a drag slider** — replaced the S/M/L buttons in the View Options menu with a smooth range slider. Shows the current size label (Small / Medium / Large) as you drag.

---

## [1.38.0] — 2026-03-24

### Added
- **Collections tab in Source Dashboard** — new "Collections" tab alongside the Feeds tab. Lists all folders with feed count, inline rename (click name), color picker (click the dot), delete with confirmation, and up/down reorder buttons. "New Collection" button in the tab header.
- **Folder management from dashboard** — edit folder name, color, and order without leaving the Source Dashboard. Changes propagate instantly to the sidebar.

### Changed
- **YouTube tagging fixed** — `feedType()` now correctly detects YouTube feeds by URL pattern (`youtube.com/feeds/videos.xml`) in addition to the `type` field, so legacy-added YouTube feeds show the correct badge and appear under the YouTube filter.
- **Type filter pills** — filter tabs (All / YouTube / Podcasts / Articles) use the same consistent pill style as the read filter. Empty filter results now show a "no sources found" message instead of empty space.
- **Type badges color-coded** — YouTube badge is red, Podcast badge is purple, RSS badge is neutral gray. Makes source type scannable at a glance.
- **Source Dashboard header** — pill-shaped Add Source button, subtitle now shows both source count and collection count.

---

## [1.37.0] — 2026-03-24

### Changed
- **Add Source button** — pill-shaped, fully centered in the sidebar (both expanded and collapsed states) with a subtle glow on hover. Consistent with modern nav aesthetics.
- **Read filter tabs** — replaced the two-state Latest / Unread toggle with a three-state pill: **Latest** (all articles), **Unread** (hide read), **Read** (only read articles). Lets you browse your reading history inline without leaving the inbox. Empty states updated for each mode.

---

## [1.36.0] — 2026-03-24

### Added
- **Source Dashboard** — completely redesigned Manage Feeds page. Full-width layout with stats bar (Total Subscriptions, Articles Loaded, Sync Health %, Fresh Feeds), stale-feed alert banner, filter pills (All / YouTube / Podcasts / Articles), "Sync All Sources" button, and feeds grouped by type (YouTube Channels, Podcasts, Article Feeds). Each group is collapsible with a subscription count.
- **Feed delete** — each feed row now has a delete button (trash icon) with a confirmation prompt. Removal propagates instantly to the sidebar and app state.
- **Add Source button in left nav** — prominent `+ Add Source` button added at the bottom of the sidebar above the theme toggle, opening the feed discovery modal from anywhere. Collapses to an icon when the sidebar is narrow.
- **Feed health per-row** — each source row shows last-sync time (color-coded: green = fresh, amber = stale, grey = not loaded) and a Full Content toggle.
- **Notes table** — Supabase `notes` table created via migration and is now live. Notes CRUD is fully operational.

### Changed
- **Mobile card view** — cards now render in a 2-column grid (was 1 column) at `"sm"` size on mobile, giving more density and smaller footprint.
- **Desktop list view** — list items automatically use `"lg"` size on desktop (larger thumbnails + font) for a more comfortable reading layout.

### Performance
- Added `feed_folders(user_id)` index — eliminates 1003 sequential scans per session.
- Added `smart_feeds(user_id)` index — eliminates 1159 sequential scans per session.
- Added `history(user_id, read_at DESC)` and `read_items(user_id, read_at DESC)` indexes for stats and streak queries.
- Added GIN index on `notes.tags` for future tag filtering.

---

## [1.35.0] — 2026-03-23

### Added
- **Notes Library** — full rewrite with dedicated notes CRUD (create, edit, delete standalone notes) + `notes` table in Supabase. Library shows both highlights and notes in a unified view.
- **Notes Editor** — focused full-screen note editor with large title, body textarea, tag chips, color picker, word count, and reading time. Accessible from the library or create button.
- **Supabase notes CRUD** — `getNotes`, `createNote`, `updateNote`, `deleteNote` functions added.

---

## [1.34.0] — 2026-03-23

### Added
- **Notes page — Tags tab** (Pro) — a third tab shows all tagged articles grouped by article, with tag chips that filter by tag on click. Tags and highlights share the same search bar.
- **Notes page — delete highlights** — each highlight card has a ✕ delete button (hover-revealed on desktop, always visible on mobile). Deletes immediately, no confirmation.
- **Notes page — inline note editing** — click any note to edit it inline with a textarea; Cmd/Ctrl+Enter saves, Esc cancels. Cards with no note show a "+ Add a note…" dashed button.
- **Notes page — Re-read button** — each article group header shows a "Re-read" button that opens the full ContentViewer over the Notes page, so you can re-read and re-highlight without leaving.
- **Notes page — article link** — ↗ shortcut on each article group opens in browser.
- **Mobile export bar** — on mobile, "Copy all as Markdown" and ↓ download buttons are shown at the bottom of the list instead of the toolbar.

### Changed
- **Bottom nav** — replaced "Home" with "Notes" so highlights are one tap away on mobile. Home is still reachable on desktop via the sidebar.
- **Mobile initial page** — app opens on Inbox (not Home) on mobile-width screens.

---

## [1.33.0] — 2026-03-23

### Changed
- **AI summary style tabs — pill design** — "Key Points / Brief / Detailed" tabs now match the "Summarize with AI" pill style: outlined pill shape (`border-radius: 100`), transparent background, accent color border + text when selected. Applied to both the pre-summary selector and the inline regenerate tabs inside the summary card.

### Fixed
- **Folders — inline creation** — ManageFeedsPage now shows a "+ Create folder" button when no folders exist, opening the folder editor directly (no longer sends users to the sidebar `+` button). Folder state sync fragility fixed — ManageFeedsCard now always mirrors the parent state regardless of count.
- **Article tags — Pro gate** — Article tags are now gated behind the Pro plan. Free users see an upgrade prompt instead of the tags input when they open the Tags panel.

---

## [1.32.0] — 2026-03-23

### Fixed
- **Pro plan persisting through OAuth logins** — plan was stored in `user_metadata`, which GitHub/Google OAuth overwrites on every login, silently reverting Pro users to Free. Plan is now stored in `app_metadata` (admin-only, never touched by OAuth providers). `getPlan` reads `app_metadata` first with `user_metadata` as fallback for any existing upgrades.
- **Stripe webhook updated** — `stripe-webhook` edge function now writes `plan` and `stripe_customer_id` to `app_metadata` instead of `user_metadata`.

> **To fix your account now:** run this in the Supabase SQL editor, then click "↺ Refresh account" in Settings:
> ```sql
> UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"plan":"pro"}'
> WHERE email = 'your@email.com';
> ```

---

## [1.31.0] — 2026-03-23

### Changed
- **Article reader — editorial redesign** — full-bleed hero image (or atmospheric radial gradient when no image) with source label + title overlaid in white at the bottom of the hero. The image bleeds seamlessly into the page background via a linear gradient overlay.
- **"Summarize with AI" pill button** — pre-summary state is now a centered pill (`✦ SUMMARIZE WITH AI`) with style tabs (Key Points / Brief / Detailed) above it. Border and text shift to accent color on hover. Post-summary shows a clean card with inline style tabs for regenerating.
- **Frosted glass top bar** — reader top bar switched from solid background to `backdrop-filter: blur(14px)` with semi-transparent background, so the hero slightly bleeds behind it as you scroll.

---

## [1.30.0] — 2026-03-23

### Added
- **Saved page stitch view** — "Saved" list redesigned from a card grid to a vertical stitch layout: thumbnail on the left (72×54), title + description + source inline. Much easier to scan a long reading list.
- **AI Integration in Settings** — personal Anthropic API key input restored in Settings. Used only as a Tier 3 fallback when the app's built-in Cloudflare Worker and Supabase edge function are both unavailable. Key is stored locally in the browser, never sent to our servers.
- **CF Worker style support** — `/summarize` endpoint now accepts a `style` field (`keypoints` | `brief` | `detailed`) and selects the appropriate prompt and token limit accordingly.

---

## [1.29.0] — 2026-03-23

### Added
- **AI summary style options** — three modes before generating: **Key Points** (3–5 bullets, default), **Brief** (1–2 sentence TL;DR), and **Detailed** (6–8 bullets). A "↺ Regenerate" button appears on existing summaries to re-run with any style.
- **Auto-save on AI summary** — generating a summary automatically saves the article to your Saved list.
- **Sources dropdown in Inbox toolbar** — compact "All sources" pill filter replaces the left-panel feed list. Filters articles by feed without leaving the inbox view. Only appears when you have more than one feed.
- **Sources nav item** — new sidebar nav entry (replaces Stats) linking to Manage Feeds for full source control.
- **Reading Stats in Settings** — "View reading stats →" button added to Settings so stats remain accessible after moving them off the sidebar nav.
- **"↺ Refresh account" in Settings** — refreshes your Supabase session to pick up Pro plan status without needing to sign out and back in.

### Changed
- **"Read Later" renamed to "Saved"** — updated in sidebar nav, bottom nav, page title, toasts, action buttons, and keyboard shortcut labels for consistency.
- **Reader controls condensed** — the Aa reading preferences panel is now a compact floating dropdown attached to the Aa button (top-right) instead of a full-width bar below the header.
- **Add feed modal simplified** — tabs removed. Single clean input auto-detects RSS, YouTube, podcast, article, or X handle. "Browse popular feeds" moved to a collapsible section at the bottom.
- **Card size available in list view** — the S/M/L size selector in the view menu now applies to both card and list layouts (was card-only).
- **Article list panel wider** — desktop 3-pane layout: article list column increased from 380px → 420px when reading panel is open.
- **Mark all as read confirmation** — a confirmation prompt now appears before marking all articles read, showing the count.
- **"Distilled Workspace" label removed** — sub-label under the Feed Box logo in the sidebar is gone.
- **App version moved** — version string removed from the sidebar footer; it remains in Settings → Account.
- **Stats removed from sidebar nav** — Stats is now accessible via Settings only, freeing a nav slot for Sources.

### Fixed
- **AI summary error message** — no longer suggests adding an API key in Settings (the Cloudflare Worker handles authentication automatically).
- **Unused API Keys settings card removed** — the Anthropic API key input in Settings is removed; the backend worker handles all AI calls securely.

## [1.28.9] — 2026-03-22

### Added
- **Expand to full view** — inline reading panel (3-pane) now has an expand button (⤢) in the header. Clicking it opens the article as a full-screen overlay. The ← back button collapses it back to the split view without closing the article.
- **Favicons in list view** — source favicon now appears next to the source name in list view rows, matching card view.

### Changed
- **Collapsed sidebar icon centering** — smart feed and folder icons were left-aligned in collapsed mode; they are now correctly centred like all other nav icons.
- **Card images larger** — hero image height increased across all card sizes (md: 56% → 72% tall, lg: 44% → 63% tall) for a more editorial, image-forward look.
- **List view thumbnails scale with size** — S hides thumbnails, M shows 64×48px, L shows 88×66px. Previously the thumbnail was a fixed 52×40px regardless of size.
- **Feed parser block detection improved** — valid XML feeds (<?xml, <rss, <feed, <rdf:) are now whitelisted and bypass the Cloudflare-challenge detection entirely, preventing false positives on edge-case feeds.

## [1.28.8] — 2026-03-22

### Added
- **Home page 3-pane reading** — clicking any article on the Home page now opens an inline reading panel on desktop (same layout as the Inbox). The bento grid collapses to a slim article list at 380px; the reading panel fills the rest. Prev/next navigation and article position indicator both work. Mobile keeps the full-screen overlay.
- **Smart feeds — Match ANY / Match ALL** — when a smart feed has 2+ positive keywords, a toggle appears to choose whether articles must match ANY keyword (OR — the previous behaviour) or ALL keywords (AND). Existing smart feeds default to "any" with no behaviour change.

### Fixed
- **Smart feed match mode consistency** — the previous code comment said "AND logic" but the implementation was OR (`some()`). Both the comment and the behaviour are now correctly documented and controlled by the match_mode setting.

## [1.28.7] — 2026-03-21

### Performance
- **P8 — Code splitting** — bundle reduced from 628 KB (172 KB gzip) to ~110 KB initial load. Every page and modal is now a separate lazy chunk loaded on demand. Vendor libs (React, Supabase, Fuse.js) split into their own cacheable files.
  - Initial load: App shell + vendors ≈ 110 KB gzip (was 172 KB everything-at-once)
  - InboxPage, HomePage, SecondaryPages, NotesPage, AnalyticsPage each load only when navigated to
  - SmartFeedModal, FolderModal, PodcastPlayer, Onboarding load only when first opened

## [1.28.6] — 2026-03-21

### Fixed
- **Cloudflare-protected feeds now load** — sites like MakeUseOf, 9to5Mac, and XDA block the public CORS proxies via Cloudflare Bot Fight Mode. The fetcher now detects challenge/block pages and falls back to `rss2json`, which has publisher-level whitelisting and bypasses these restrictions.
- **Dead code removed** — `ReaderEmptyState` component cleaned up after the reading panel was made click-to-open.

## [1.28.5] — 2026-03-21

### Fixed
- **Reading panel appears only when an article is open** — the right panel on desktop no longer shows the empty-state placeholder at rest. The article list fills the full width until you click an article, then the 380px list + reading panel layout snaps in.

## [1.28.4] — 2026-03-21

### Added
- **Admin panel — user metrics** — Analytics page now calls the `admin-stats` edge function to show Total Users, Pro subscribers, MRR, new users in the last 30 days, and a recent signups table. Graceful fallback banner if edge function is unavailable.

### Changed
- **P7 — Editorial Nocturne typography** — article titles in the reading panel, feed item cards, and Home page rows now use the theme's serif font (`var(--reader-font-family)`). Distilled theme renders Newsreader; Nocturne renders Noto Serif.
- **Reading panel metadata** — source label is now uppercase with tight tracking; source + date displayed inline with a dot separator.

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

### Added
- **Desktop prev/next navigation** — ‹ and › buttons appear in the reading panel header on desktop (not just mobile), with keyboard shortcut hints (`[` / `]`).
- **Article position indicator** — "3 of 47" shown below the source name in the reading panel so you always know where you are in the list.
- **✦ Discover tab in Add modal** — 18 hand-curated feeds across 6 categories (Tech, AI, Design, News, Science, Business). One click to subscribe with no URL needed.

---

## [1.28.1] — 2026-03-21

### Added
- **Toolbar — Latest / Unread pill tabs** — replaces the old toggle button. Cleaner, more readable.
- **Toolbar — search icon toggle** — search collapses to an icon by default; click to expand the full search input.
- **Toolbar — error badge** — red `!` badge replaces verbose error text for failed feeds. Click for a popover with per-feed retry buttons and a "Retry all" option.
- **Toolbar — SVG refresh icon** — replaces the `↺` text character.
- **Toolbar — icon-only mark-all-read** — double-check SVG button saves toolbar space.

### Fixed
- **Folder persistence** — folder assignments now survive login/refresh. The inbox route in App.jsx was missing `feeds={feeds}`, causing InboxPage to re-fetch and lose optimistic folder updates on every mount.

---

## [1.28.0] — 2026-03-21

### Added
- **3-pane reading layout** — on desktop, clicking any article opens a reading panel inline to the right (Feedly-style). Article list narrows to 380px; reading panel fills remaining space. Mobile keeps the full-screen overlay.
- **Manage Feeds page** — dedicated page (`Settings → Manage Feeds`) for renaming feeds, assigning to collections, and toggling full-content fetch. No longer embedded inside the Settings page.

### Changed
- **Settings — Appearance moved into Account card** — Dark/Light toggle is now two small icon buttons (Moon/Sun) in the top-right of the Account card. Separate "Appearance" card removed.
- **Analytics removed from sidebar** — Admin analytics link moved to the bottom of the Settings page (admin-only). Left nav is now the same for all users.
- **Read Later redesigned** — articles display as a card grid with thumbnails, title, source, and time-saved. Empty state improved. Remove button per card.

### Fixed
- **admin-stats edge function deployed** — resolves HTTP 401 on the Analytics Dashboard. The function was built but had never been deployed to Supabase.

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

### Fixed
- **Feed fetch reliability** — multiple edge-case crashes and timeouts in the parallel feed fetcher stabilised. Proxy fallback path now retries with exponential back-off before surfacing an error badge.
- **Article deduplication** — items with matching URLs across multiple fetches are now deduplicated before being written to the list, preventing ghost duplicates on refresh.

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
