# Agent Iteration Log

Each row is one `/iterate` run. Token costs are for the full Claude Code session — run `/cost` at the end of a session to get the number, then note it in the Session Cost column.

| Date | Version | Area | Change | Files | Session Cost |
| 2026-06-10 | v1.46.401 | UX | SmartFeedModal + FolderModal: htmlFor/id connecting labels to Name + Keywords inputs | `SmartFeedModal.jsx:77,91`, `FolderModal.jsx:55` | — |
| 2026-06-10 | v1.46.400 | UX | AddModal: aria-label on URL input, podcast search, feed nickname | `AddModal.jsx:262,348,387` | — |
| 2026-06-10 | v1.46.399 | UX | NotePanel: htmlFor/id connecting "Your note" + "Theme" labels to fields | `NotePanel.jsx:53,67` | — |
| 2026-06-10 | v1.46.398 | UX | SearchBar: aria-label + aria-haspopup + aria-expanded + aria-controls linking input to results listbox | `SearchBar.jsx:94` | — |
| 2026-06-10 | v1.46.397 | UX | TagsInput: aria-label + aria-autocomplete + aria-expanded on input — screen reader users can use tag autocomplete | `TagsInput.jsx:60` | — |
| 2026-06-10 | v1.46.396 | UX | Spinner: role=status + aria-label=Loading — screen readers announce loading states app-wide | `UI.jsx:71` | — |
| 2026-06-10 | v1.46.395 | Polish | index.css: global font-family:inherit for form elements — CSS baseline reset for buttons/inputs/selects | `index.css:104` | — |
| 2026-06-10 | v1.46.394 | Polish | useTheme: set --accent CSS variable — article body links/blockquotes/selection now use active theme color instead of blue | `useTheme.jsx:50` | — |
| 2026-06-10 | v1.46.393 | Perf | PodcastPlayer SeekBar: fill RAF loop converted from style.width to scaleX() — GPU-composited seek bar updates | `PodcastPlayer.jsx:43,73,82,132` | — |
| 2026-06-10 | v1.46.392 | Perf | PodcastPlayer: RAF loop changed from style.width to style.transform scaleX() — no layout recalculation every 500ms | `PodcastPlayer.jsx:333,529,650` | — |
| 2026-06-10 | v1.46.391 | Perf | OPMLImport + ContentViewer TTS: progress bars converted to transform:scaleX() — GPU-composited, no layout reflow | `OPMLImport.jsx:173, ContentViewer.jsx:1493` | — |
| 2026-06-10 | v1.46.390 | UX | AddModal + SmartFeedModal: aria-expanded on "Browse popular feeds" and "Pick feeds" disclosure buttons | `AddModal.jsx:434, SmartFeedModal.jsx:154` | — |
| 2026-06-10 | v1.46.389 | UX | ContentViewer overflow menu: aria-label+aria-expanded+aria-haspopup on trigger; role=menu/menuitem on items | `ContentViewer.jsx:1083,1095` | — |
| 2026-06-10 | v1.46.388 | UX | InboxPage source filter dropdown: aria-expanded + aria-haspopup on trigger; role=listbox + aria-selected on options | `InboxPage.jsx:924` | — |
| 2026-06-10 | v1.46.387 | UX | InboxPage mobile toolbar: aria-label on Search/Unread/Display icon buttons; aria-pressed on Unread toggle | `InboxPage.jsx:1111` | — |
| 2026-06-10 | v1.46.386 | UX | MobileFeedDrawer: aria-current on quick-nav buttons (History/Stats/Settings) — completes mobile nav accessibility | `MobileFeedDrawer.jsx:300` | — |
| 2026-06-10 | v1.46.385 | UX | InboxPage: aria-pressed on Unread/All filter segmented control — screen readers announce selected state | `InboxPage.jsx:972` | — |
| 2026-06-10 | v1.46.384 | Perf | index.html: preconnect to Google Fonts origins — speeds up editorial theme font loading | `index.html` | — |
| 2026-06-10 | v1.46.383 | UX | MobileFeedDrawer: aria-label+aria-current on FeedRow+FolderSection; aria-expanded on folder toggle | `MobileFeedDrawer.jsx:20,72,92` | — |
| 2026-06-10 | v1.46.382 | UX | Sidebar: aria-label on Edit Folder button | `Sidebar.jsx:310` | — |
| 2026-06-10 | v1.46.381 | UX | Sidebar: aria-label+aria-current on FeedRow and FolderSection nav buttons — complete screen reader coverage | `Sidebar.jsx:191,248,284` | — |
| 2026-06-10 | v1.46.380 | UX | BottomNav+Sidebar: aria-current on Feeds button and smart feed rows; aria-label on catch-up+smart feed buttons | `BottomNav.jsx:143`, `Sidebar.jsx:511,349` | — |
| 2026-06-10 | v1.46.379 | Nav | MobileFeedDrawer: add built-in Catch Up to smart feeds section — closes desktop/mobile nav parity gap | `MobileFeedDrawer.jsx:336` | — |
| 2026-06-10 | v1.46.378 | Nav | Sidebar: Stats link for all users, not just admins — closes mobile/desktop parity gap | `Sidebar.jsx:591` | — |
| 2026-06-10 | v1.46.377 | Nav | Sidebar: add History to desktop library nav — closes mobile/desktop navigation parity gap | `Sidebar.jsx:435` | — |
| 2026-06-10 | v1.46.376 | Perf | index.html: preconnect to Supabase origin — removes TCP/TLS latency on auth check fired every page load | `index.html` | — |
| 2026-06-10 | v1.46.375 | Perf | ContentViewer: lazy+async on all article body images via HTML post-processing; remaining favicon/artwork fixes | `ContentViewer.jsx:92`, `FeedItem.jsx:220`, `AddModal.jsx:298` | — |
| 2026-06-10 | v1.46.374 | Perf | FeedItem progress bars: transform:scaleX() replaces width animation — GPU-composited, no layout reflow | `FeedItem.jsx:231,273,537` | — |
| 2026-06-10 | v1.46.373 | Perf | Add loading=lazy decoding=async to all 17 favicon/thumbnail images across list contexts | `FeedItem.jsx:267,548`, `Sidebar.jsx:206`, `InboxPage.jsx:1733`, `MobileFeedDrawer.jsx:39`, `+9 more` | — |
| 2026-06-10 | v1.46.372 | UX | Sidebar+MobileFeedDrawer+InboxPage+SecondaryPages: aria-label on icon-only title-only buttons | `Sidebar.jsx:378`, `MobileFeedDrawer.jsx:111`, `InboxPage.jsx:1031`, `SecondaryPages.jsx:1107` | — |
| 2026-06-10 | v1.46.371 | UX | PodcastPlayer sleep timer buttons: aria-label on both mini+expanded variants | `PodcastPlayer.jsx:497,624` | — |
| 2026-06-10 | v1.46.370 | UX | PodcastPlayer SeekBar: update aria-valuenow in RAF loop — live playback position for screen readers | `PodcastPlayer.jsx:44` | — |
| 2026-06-10 | v1.46.369 | UX | InboxPage SourceItem: role=button+tabIndex+onKeyDown+aria-label+aria-pressed — desktop source list keyboard nav | `InboxPage.jsx:1703` | — |
| 2026-06-10 | v1.46.368 | UX | NotesPage tag spans: role=button+tabIndex+onKeyDown+aria-label — keyboard tag filter | `NotesPage.jsx:294` | — |
| 2026-06-10 | v1.46.367 | UX | MobileSearchOverlay result rows: role=button+tabIndex+onKeyDown+aria-label — keyboard search result selection | `MobileSearchOverlay.jsx:223` | — |
| 2026-06-10 | v1.46.366 | UX | PodcastPlayer SeekBar: role=slider+tabIndex+onKeyDown(±5s, Home/End) — keyboard podcast seeking | `PodcastPlayer.jsx:112` | — |
| 2026-06-10 | v1.46.365 | UX | CardsPage annotation editor: role=button+tabIndex+onKeyDown(Enter/F2) — keyboard annotation editing | `CardsPage.jsx:733` | — |
| 2026-06-10 | v1.46.364 | Perf | Remove redundant dynamic supabase.js imports in App.jsx + SecondaryPages.jsx — eliminates Vite mixed-import warning | `App.jsx:168`, `SecondaryPages.jsx:50` | — |
| 2026-06-10 | v1.46.363 | UX | ReviewPage passage card: role=button+tabIndex+onKeyDown — keyboard users can reveal note with Enter/Space | `ReviewPage.jsx:384` | — |
| 2026-06-10 | v1.46.362 | UX | ContentViewer highlight marks: role=button+tabIndex+onKeyDown+aria-label — keyboard users can interact with highlights | `ContentViewer.jsx:885` | — |
| 2026-06-10 | v1.46.361 | UX | FeedItem ListItem+CardItem: role=button+tabIndex+onKeyDown+aria-label — every inbox article keyboard-navigable | `FeedItem.jsx:302,378,491` | — |
| 2026-06-10 | v1.46.360 | UX | SecondaryPages EditableName: tabIndex+role=button+onKeyDown(Enter/F2) — keyboard rename for feeds | `SecondaryPages.jsx:822` | — |
| 2026-06-10 | v1.46.359 | UX | HomePage: keyboard access for BriefingRow, ArticleRow, featured article cards (tabIndex+onKeyDown+aria-label) | `HomePage.jsx:291,332,354,447,473` | — |
| 2026-06-10 | v1.46.358 | UX | ReadLaterPage Card+ListRow: role=button, tabIndex, onKeyDown, aria-label — keyboard accessibility for saved articles | `ReadLaterPage.jsx:305,414` | — |
| 2026-06-10 | v1.46.357 | UX | AnalyticsPage: role=tablist+tab+aria-selected on tab bar; aria-pressed on provider cards | `AnalyticsPage.jsx:478,248` | — |
| 2026-06-10 | v1.46.356 | UX | HighlightsDrawer export buttons: aria-label; ContentViewer Share aria-label reflects feedback | `HighlightsDrawer.jsx:53`, `ContentViewer.jsx:538` | — |
| 2026-06-10 | v1.46.355 | UX | Sidebar footer: Settings aria-label+aria-current; theme toggles aria-pressed; shortcuts aria-expanded | `Sidebar.jsx:632,655,660` | — |
| 2026-06-10 | v1.46.354 | UX | MobileFeedDrawer: role=dialog + aria-modal on bottom sheet — mobile nav drawer screen reader semantics | `MobileFeedDrawer.jsx:178` | — |
| 2026-06-10 | v1.46.353 | UX | OPMLImport modal: role=dialog + aria-modal + aria-label — screen reader modal semantics | `OPMLImport.jsx:127` | — |
| 2026-06-10 | v1.46.352 | UX | CardsPage "New card" modal: role=dialog + aria-modal — screen reader modal semantics | `CardsPage.jsx:379` | — |
| 2026-06-10 | v1.46.351 | UX | InboxPage: display sheet role=dialog+aria-modal; toast+OPML progress role=status+aria-live | `InboxPage.jsx:1322,1423,1513` | — |
| 2026-06-10 | v1.46.350 | UX | NotePanel + ArticleNotesPanel: role=dialog + aria-modal on bottom-sheets — screen reader modal semantics | `NotePanel.jsx:40`, `ArticleNotesPanel.jsx:47` | — |
| 2026-06-10 | v1.46.349 | UX | SelectionToolbar: role=toolbar + aria-label on highlight color buttons — screen reader accessible | `SelectionToolbar.jsx:102` | — |
| 2026-06-10 | v1.46.348 | Polish | OPMLImport checkbox: checkmark color="#fff" → T.accentText — readable in all themes | `OPMLImport.jsx:296` | — |
| 2026-06-10 | v1.46.347 | UX | NotesPage NoteCard: note-display div → role=button+keyboard — keyboard users can edit notes | `NotesPage.jsx:231` | — |
| 2026-06-10 | v1.46.346 | Polish | BottomNav CountBadge: color="#fff" → T.accentText — readable in all themes | `BottomNav.jsx:62` | — |
| 2026-06-10 | v1.46.345 | UX | PodcastPlayer VolumeSlider: role=slider + aria-valuemin/max/now + keyboard arrow keys | `PodcastPlayer.jsx:207` | — |
| 2026-06-10 | v1.46.344 | UX | InboxPage folder picker: div+onClick → button+role=menuitem, container role=menu — keyboard accessible | `InboxPage.jsx:1769` | — |
| 2026-06-10 | v1.46.343 | UX | Sidebar FeedContextMenu: role=menu + role=menuitem + aria-label — screen readers identify feed action menu | `Sidebar.jsx:129` | — |
| 2026-06-10 | v1.46.342 | UX | SearchBar: results → button + role=listbox + role=search — full keyboard-accessible search flow | `SearchBar.jsx:80,128,153` | — |
| 2026-06-10 | v1.46.341 | UX | PodcastPlayer: mini-player title area → button with aria-expanded — keyboard accessible expand | `PodcastPlayer.jsx:630` | — |
| 2026-06-10 | v1.46.340 | UX | NotesPage: NoteCard→role=button+keyboard, NoteListRow→button, article link→button — full keyboard nav | `NotesPage.jsx:72,144,121` | — |
| 2026-06-10 | v1.46.339 | UX | TagsInput: suggestion items → button with role=option in listbox — suggestions keyboard-selectable | `TagsInput.jsx:81` | — |
| 2026-06-10 | v1.46.338 | UX | Onboarding: feed selection cards → button + aria-pressed — keyboard accessible first-run flow | `Onboarding.jsx:91` | — |
| 2026-06-10 | v1.46.337 | UX | SecondaryPages Toggle: role=switch + aria-checked + keyboard support — screen readers announce switches correctly | `SecondaryPages.jsx:785` | — |
| 2026-06-10 | v1.46.336 | UX | HighlightsDrawer: highlight rows get role=button + tabIndex + onKeyDown — keyboard accessible | `HighlightsDrawer.jsx:74` | — |
| 2026-06-10 | v1.46.335 | UX | TodayPage: Feed Pulse + Reading Log rows converted from div+onClick to button — keyboard accessible | `TodayPage.jsx:208,268` | — |
| 2026-06-10 | v1.46.334 | Polish | LoginPage: replace isDark?#0e1117:#fff with T.accentText on logo + submit buttons — correct contrast all 6 themes | `LoginPage.jsx:89,134,165` | — |
| 2026-06-10 | v1.46.333 | Polish | SecondaryPages: "New Collection" hover uses T.accentText not #fff — fixes contrast on teal/blue/amber themes | `SecondaryPages.jsx:1318` | — |
| 2026-06-10 | v1.46.332 | Nav | MobileFeedDrawer: replace redundant Today/Saved pills with History/Stats — surfaces pages with no bottom-nav entry | `MobileFeedDrawer.jsx:284` | — |
| 2026-06-10 | v1.46.331 | Perf | MobileFeedDrawer: drag handle gets touch-action:pan-x for smooth compositor-threaded dismiss gesture | `MobileFeedDrawer.jsx:199` | — |
| 2026-06-10 | v1.46.330 | Perf | FeedItem SwipeRow: touch-action:pan-y removes iOS swipe jank by handing scroll to browser compositor | `FeedItem.jsx:163` | — |
| 2026-06-10 | v1.46.329 | Polish | SecondaryPages: folder move/color/delete/collapse buttons get aria-label + aria-expanded | `SecondaryPages.jsx:1012,1075,1080,1089,1114` | — |
| 2026-06-10 | v1.46.328 | Polish | ContentViewer: font-size range input gets aria-label + aria-valuetext | `ContentViewer.jsx:491` | — |
| 2026-06-10 | v1.46.327 | Polish | ContentViewer: reader prefs width/font buttons get aria-label + aria-pressed | `ContentViewer.jsx:500,508` | — |
| 2026-06-10 | v1.46.325 | Perf | Sidebar: feedsByFolder Map replaces per-folder feeds.filter() — O(feeds) not O(folders×feeds) | `Sidebar.jsx:422` | — |
| 2026-06-10 | v1.46.324 | Polish | HighlightsDrawer: role="dialog" + aria-modal + aria-labelledby + Close aria-label | `HighlightsDrawer.jsx:41` | — |
| 2026-06-09 | v1.46.323 | Polish | AddModal: role="dialog" + aria-labelledby; MobileSearchOverlay: role="search" on search bar | `AddModal.jsx:184` `MobileSearchOverlay.jsx:127` | — |
| 2026-06-09 | v1.46.322 | Polish | FolderModal + SmartFeedModal: role="dialog" + aria-modal + aria-labelledby + Close aria-labels | `FolderModal.jsx:43` `SmartFeedModal.jsx:52` | — |
| 2026-06-09 | v1.46.321 | Polish | ReviewPage: role="progressbar" + aria-valuenow for screen reader progress announcements | `ReviewPage.jsx:335` | — |
| 2026-06-09 | v1.46.320 | Polish | FeedItem: star color via T.amber.text token instead of hardcoded #F59E0B | `FeedItem.jsx:456,590` | — |
| 2026-06-09 | v1.46.319 | Perf | useBreakpoint: track category string not raw width — eliminates resize re-renders in 10+ components | `useBreakpoint.js:1` | — |
| 2026-06-09 | v1.46.318 | Polish | App: <main> landmark + aria-label on Sidebar and BottomNav <nav> elements | `App.jsx:301,331` `Sidebar.jsx:475` `BottomNav.jsx:133` | — |
| 2026-06-09 | v1.46.317 | Perf | MobileFeedDrawer: memo(FeedRow) with smart comparator — prevents re-renders during navigation | `MobileFeedDrawer.jsx:15` | — |
| 2026-06-09 | v1.46.316 | Polish | ReadLaterPage + InboxPage: aria-labels on save-URL toggle and mark-above-read button | `ReadLaterPage.jsx:130` `InboxPage.jsx:866` | — |
| 2026-06-09 | v1.46.315 | Polish | CardsPage: aria-label on export, sort toggle (aria-pressed), delete card buttons | `CardsPage.jsx:315,538,697` | — |
| 2026-06-09 | v1.46.314 | Perf | MobileFeedDrawer: memoize uncategorized feeds and totalUnread (prevent recompute during drag gestures) | `MobileFeedDrawer.jsx:157-158` | — |
| 2026-06-09 | v1.46.313 | Polish | Sidebar: aria-label+aria-pressed on theme toggles; aria-label on smart feed edit button | `Sidebar.jsx:359,614` | — |
| 2026-06-09 | v1.46.312 | Perf | ManageFeedsPage: memoize feed stats and filtered lists (stops repeated localStorage reads per render) | `SecondaryPages.jsx:1181-1194` | — |
| 2026-06-09 | v1.46.311 | Polish | ArticleNotesPanel: T.danger token for delete hover; aria-label on delete button | `ArticleNotesPanel.jsx:190` | — |
| 2026-06-09 | v1.46.310 | Polish | NotesPage: T.danger token for delete hover; bionic toggle role=switch/aria-checked; NoteEditor aria-label | `NotesPage.jsx:251,393` `ContentViewer.jsx:514` | — |
| 2026-06-09 | v1.46.309 | Polish | InboxPage: aria-label on mark-all-read, search, view-options buttons | `InboxPage.jsx:985,1010,1046` | — |
| 2026-06-09 | v1.46.308 | Polish | ContentViewer: aria-label on 5 icon-only buttons (prev/next, expand, reading prefs, open original, back to top) | `ContentViewer.jsx:419,443,452,474,549,759` | — |
| 2026-06-09 | v1.46.307 | Perf | HomePage: memoize dateLabel, topSources, totalUnread, folderUnreadMap | `HomePage.jsx:82-107` | — |
| 2026-06-09 | v1.46.306 | UX | Remove window.confirm from mark-all-read — reversible action, toast is sufficient feedback | `InboxPage.jsx:603` | — |
| 2026-06-09 | v1.46.305 | Polish | ContentViewer article date: relative format for recent (<7d) — consistent with FeedItem list display | `ContentViewer.jsx:23,709` | — |
| 2026-06-09 | v1.46.304 | UX | ContentViewer close button: aria-label="Close article" — screen reader + keyboard nav accessibility | `ContentViewer.jsx:397` | — |
| 2026-06-09 | v1.46.303 | Fix | Toast timer cleared on rapid successive calls — no early dismiss when save+bookmark fire together | `InboxPage.jsx:671` | — |
| 2026-06-09 | v1.46.302 | Polish | NotesPage article-link row: rgba(0,0,0,.06) → T.surface — invisible background on dark themes | `NotesPage.jsx:122` | — |
| 2026-06-09 | v1.46.301 | Polish | Settings theme selector border: rgba(0,0,0,0.12) → T.border — invisible on dark themes before | `SecondaryPages.jsx:566` | — |
| 2026-06-09 | v1.46.300 | Polish | CardsPage delete button: hardcoded #fee2e2/#ef4444 → T.danger tokens — correct across all 6 themes | `CardsPage.jsx:697` | — |
| 2026-06-09 | v1.46.299 | Perf | Lazy-load Readability inside fetchArticleContent — fetchers chunk 55KB→22KB; 34KB saved on initial inbox load | `fetchers.js:5,434` | — |
| 2026-06-09 | v1.46.298 | Nav | Reordered mobile bottom nav: Inbox→Today→Saved→Review→Cards — matches desktop sidebar order | `BottomNav.jsx:45` | — |
| 2026-06-09 | v1.46.297 | Perf | Memoized filtered list and time-bucket groups in ReadLaterPage — no re-filtering on every render | `ReadLaterPage.jsx:92` | — |
| 2026-06-09 | v1.46.296 | Perf | Memoized feedPulse, dateLabel, oldestSaved in TodayPage — feed list sort+map skips on re-renders | `TodayPage.jsx:110` | — |
| 2026-06-09 | v1.46.295 | Perf | Memoized HighlightedText token/segment computation — bionic split and highlight interval matching skip on re-renders | `ContentViewer.jsx:140` | — |
| 2026-06-09 | v1.46.294 | Perf | Memoized injectHtmlHighlights — no full-article regex on every scroll; only reruns when HTML/highlights change | `ContentViewer.jsx:85` | — |
| 2026-06-09 | v1.46.293 | Perf | Memoized AI summary bullet parsing in SummaryBlock — skips regex chain on re-renders; only recomputes on summary change | `ContentViewer.jsx:901` | — |
| 2026-06-09 | v1.46.292 | Perf | Memoized reading-time calc + favicon URL in ContentViewer — no article text split on scroll/highlight re-renders | `ContentViewer.jsx:73` | — |
| 2026-06-09 | v1.46.291 | Perf | Memoized uncategorized/PRIMARY_NAV/LIBRARY_NAV in Sidebar — no recreation on shortcuts/ctx-menu interactions | `Sidebar.jsx:422` | — |
| 2026-06-09 | v1.46.290 | Perf | dateBucket accepts pre-computed todayTs — eliminates 2 Date constructions per list item | `InboxPage.jsx:21,1269` | — |
| 2026-06-09 | v1.46.289 | Perf | Memoized unreadCount in InboxPage — skips O(n) filter on cursor/modal re-renders | `InboxPage.jsx:720` | — |
| 2026-06-09 | v1.46.288 | Perf | Memoized FeedRow in Sidebar with smart comparator — skips re-renders on shortcuts/context-menu interactions | `Sidebar.jsx:178` | — |
| 2026-06-09 | v1.46.287 | Perf | Memoized parseYouTubeUrl in ContentViewer — avoids URL parse on every scroll/highlight/TTS re-render | `ContentViewer.jsx:72` | — |
| 2026-06-09 | v1.46.286 | Nav | Sidebar Review badge shows due count — matches BottomNav parity; desktop users see pending reviews | `Sidebar.jsx:421`, `App.jsx:281` | — |
| 2026-06-09 | v1.46.285 | Perf | Memoized filteredItems + feedColorMap with useMemo — skips expensive array ops on UI-only re-renders | `InboxPage.jsx:290` | — |
| 2026-06-09 | v1.46.284 | Perf | Removed unused `lucide-react` dep — never imported, 2.1MB node_modules savings | `package.json`, `package-lock.json` | — |
| 2026-06-09 | v1.46.283 | Perf | Removed dead CSS — 5 unused @keyframes + 3 unused CSS classes from index.css | `index.css` | — |
| 2026-06-09 | v1.46.282 | Perf | Fixed 14 missed `transition:"all"` (no-space) — 0 remaining app-wide in any format | `Sidebar.jsx`, `CardsPage.jsx`, `LoginPage.jsx`, `InboxPage.jsx`, `SecondaryPages.jsx` | — |
| 2026-06-09 | v1.46.281 | Perf | Final 11 `transition: all` → targeted; zero remaining app-wide | `Onboarding.jsx`, `FolderModal.jsx`, `SmartFeedModal.jsx`, `HighlightsDrawer.jsx`, `OPMLImport.jsx`, `ArticleNotesPanel.jsx`, `NotesPage.jsx` | — |
| 2026-06-09 | v1.46.280 | Perf | Moved inline @keyframes to index.css; reused global spin in LoginPage | `ReviewPage.jsx:332`, `MobileSearchOverlay.jsx:126`, `LoginPage.jsx:81`, `index.css` | — |
| 2026-06-09 | v1.46.279 | Perf | FeedItem card icon + AnalyticsPage: last 3 `transition: all` in primary-screen components | `FeedItem.jsx:395`, `AnalyticsPage.jsx:252,489` | — |
| 2026-06-09 | v1.46.278 | Perf | SecondaryPages: 7× `transition: all` → targeted property lists | `SecondaryPages.jsx:562,1206,1218,1266,1273,1314,1502` | — |
| 2026-06-09 | v1.46.277 | Perf | CardsPage: 4× `transition: all` → targeted property lists | `CardsPage.jsx:446,468,542,700` | — |
| 2026-06-09 | v1.46.276 | Perf | InboxPage toolbar: 8× `transition: all` → targeted property lists | `InboxPage.jsx:932,978,991,1016,1033,1053,1083,1097` | — |
| 2026-06-09 | v1.46.263 | Perf | Session-level article content cache — re-opens instant, no proxy re-fetch; LRU cap 50 entries | `fetchers.js:20,395,458,562` | — |
| 2026-06-09 | v1.46.264 | Perf | preconnect hints for all 4 RSS proxy services in index.html — first feed fetch ~100–300ms faster | `index.html:30-35` | — |
| 2026-06-09 | v1.46.265 | UX | BottomNav dot badge → count badge (99+ cap) on Inbox and Review — unread count visible without opening page | `BottomNav.jsx:54-73,161-166` | — |
| 2026-06-09 | v1.46.266 | Fix | Progress bar on list items updates immediately on article close — was using stale module-level cache | `FeedItem.jsx:48-50`, `InboxPage.jsx:1437,1489` | — |
| 2026-06-09 | v1.46.267 | Nav | BottomNav auto-hides on scroll in Today + Saved pages — was missing navDirScroll handler | `TodayPage.jsx:10-20,135`, `ReadLaterPage.jsx:11-21,191` | — |
| 2026-06-09 | v1.46.268 | Perf | Moved fb-article-body CSS to index.css — ContentViewer chunk -2.7 kB, no per-open style injection | `ContentViewer.jsx:711-739`, `index.css:194-215` | — |
| 2026-06-09 | v1.46.269 | Polish | Page transitions: fadeInScale adds scale(0.97→1) — native-feel "settle" motion on every page switch | `index.css:51-54`, `App.jsx:310` | — |
| 2026-06-09 | v1.46.270 | Fix | FeedItem.jsx missing useRef import — crashed any page rendering feed items | `FeedItem.jsx:0` | — |
| 2026-06-09 | v1.46.271 | Polish | Swipe hint colors: 20%-opacity wash + action-matched text; amber hint was invisible in light mode | `FeedItem.jsx:135-139` | — |
| 2026-06-09 | v1.46.272 | Nav | BottomNav re-appears on article close in Today, Saved (ReadLater), History — missing fb-nav-dir dispatch | `TodayPage.jsx:308`, `ReadLaterPage.jsx:259`, `SecondaryPages.jsx:64` | — |
| 2026-06-09 | v1.46.273 | Fix | slideInUp moved to index.css — was only defined inside MobileFeedDrawer inline style, missing for InboxPage display sheet | `index.css:60-63`, `MobileFeedDrawer.jsx:361-370` | — |
| 2026-06-09 | v1.46.274 | Nav | Escape restores cursor to closed article; Sidebar shortcut labels corrected (L=Read later, S=Save) | `InboxPage.jsx:445`, `Sidebar.jsx:33` | — |
| 2026-06-09 | v1.46.275 | Perf | ContentViewer: 11× transition:all → targeted bg/color/border-color — stops browser watching all CSS props on reader hover | `ContentViewer.jsx:397,421,436,452,502,513,527,745,956,1054` | — |
| 2026-06-01 | v1.46.229 | Perf | Cap unbounded DB queries: getSaved(200), getAllHighlights(500), getHighlightReviews(200 ordered by next_review) | `supabase.js:125,532,549` | — |
| 2026-06-01 | v1.46.230 | Perf | Lazy-load AddModal + OPMLImport in InboxPage; InboxPage chunk 21→16 kB gz | `InboxPage.jsx:10-19,1449,1481` | — |
| 2026-06-01 | v1.46.231 | Fix | Worker proxy response now validated with looksLikeBlockPage; bot-challenge pages no longer silently pass through | `fetchers.js:59` | — |
| 2026-06-01 | v1.46.232 | Fix/Perf | getReadingStats date filter (366d) replaces limit(500); lazy-load MobileSearchOverlay; delete dead getAllHighlightsWithNotes | `supabase.js:491,540`, `InboxPage.jsx:18,1456` | — |
| 2026-06-08 | v1.46.248 | Fix | Podcast expanded panel on mobile: bottom 144px (above mini-bar), full viewport width | `PodcastPlayer.jsx:554` | — |
| 2026-06-08 | v1.46.249 | Nav | Reading Log rows in Today page now open articles in ContentViewer on click | `TodayPage.jsx:1,65,249` | — |
| 2026-06-09 | v1.46.250 | UX | Mobile default image size 72→96px; slider max 96→120px for larger phones | `InboxPage.jsx:67,1338` | — |
| 2026-06-09 | v1.46.251 | Perf | decoding="async" on ListThumb + MobileThumb — off-thread image decoding reduces scroll jank | `FeedItem.jsx:143,184` | — |
| 2026-06-09 | v1.46.252 | Perf | willChange: transform on BottomNav pill — GPU compositing for scroll-hide/show animation | `BottomNav.jsx:82` | — |
| 2026-06-09 | v1.46.253 | UX | Haptic feedback on feed item action buttons via navigator.vibrate(8) | `FeedItem.jsx:6,82` | — |
| 2026-06-09 | v1.46.254 | Polish | Active tab dot indicator on BottomNav — 4px accent dot below active icon | `BottomNav.jsx:143` | — |
| 2026-06-09 | v1.46.255 | UX | Mobile toolbar icon buttons 36→44px — meets iOS 44pt minimum touch target | `InboxPage.jsx:1095,1101,1114` | — |
| 2026-06-09 | v1.46.256 | UX | prefers-reduced-motion media query — collapses all CSS animations for accessibility | `index.css:193` | — |
| 2026-06-09 | v1.46.257 | UX | Scroll position saved per feed view via sessionStorage — restores on back-navigation | `InboxPage.jsx:132,140,1158` | — |
| 2026-06-09 | v1.46.258 | Polish | BottomNav labels — 9px text below each icon, bold when active | `BottomNav.jsx:95,126,144` | — |
| 2026-06-09 | v1.46.259 | Polish | Read-progress bar added to MobileThumb — partial-read indicator matches desktop | `FeedItem.jsx:170` | — |
| 2026-06-09 | v1.46.260 | UX | Swipe-to-act on list rows: right = mark read, left = save for later | `FeedItem.jsx:99` | — |
| 2026-06-09 | v1.46.261 | Polish | MobileThumb skeleton shimmer while image loads — replaces blank solid color | `FeedItem.jsx:240` | — |
| 2026-06-09 | v1.46.262 | Perf | Articles show RSS content instantly; Readability static import; removed auto-retry | `ContentViewer.jsx:104`, `fetchers.js:1,425` | — |
| 2026-06-08 | v1.46.247 | Fix | Podcast mini-bar bottom raised to 80px on mobile so it clears BottomNav pill; width fills viewport on mobile | `PodcastPlayer.jsx:609` | — |
| 2026-06-08 | v1.46.246 | Perf | Removed duplicate shimmer/@keyframes shimmer + --sk-base/--sk-shine from index.css — 22 lines of dead CSS | `index.css:77` | — |
| 2026-06-08 | v1.46.245 | Perf | Removed dead @keyframes pulse (scale variant) from index.css — overridden by opacity-only definition below it | `index.css:37` | — |
| 2026-06-08 | v1.46.244 | Fix | Saved page: onUnsave callback no longer calls removeReadLater (double-DELETE) — ContentViewer already handles the DB delete | `ReadLaterPage.jsx:248` | — |
| 2026-06-08 | v1.46.243 | Polish | Feed Pulse rows in Today: hover background added for visual consistency with QueueRow | `TodayPage.jsx:190` | — |
| 2026-06-08 | v1.46.242 | Perf | Saved page article images: loading="lazy" decoding="async" on Card+ListRow | `ReadLaterPage.jsx:304,403` | — |
| 2026-06-08 | v1.46.241 | Polish | Saved page cards show 2-line description snippet below title when available | `ReadLaterPage.jsx:347` | — |
| 2026-06-08 | v1.46.240 | Nav | Feed Pulse bars in Today now navigate to the specific feed (was `"inbox"`); feedId kept in chart data | `TodayPage.jsx:106,192` | — |
| 2026-06-08 | v1.46.239 | Feature | Rebuilt Saved page — source filter pills, time-bucketed groups, 3-col card grid with large images (desktop), compact list (mobile) | `ReadLaterPage.jsx`, `App.jsx:26`, `SecondaryPages.jsx` | — |
| 2026-06-01 | v1.46.233 | Nav | Due-cards dot badge on Review BottomNav icon via onDueCount callback | `ReviewPage.jsx:90,164`, `App.jsx:60,240,317`, `BottomNav.jsx:58,150` | — |
| 2026-06-01 | v1.46.227 | UX/Feature | Review summary badges; Cards color stripes; mobile tap-to-select sentence; Catch up smart feed | `ReviewPage.jsx`, `CardsPage.jsx`, `SelectionToolbar.jsx`, `Sidebar.jsx`, `InboxPage.jsx`, `App.jsx` | — |
| 2026-05-31 | v1.46.221 | UX | Tags bar: remove borderBottom divider + "TAGS" uppercase label — less chrome, content feels closer | `ContentViewer.jsx:568,570` | — |
| 2026-05-31 | v1.46.222 | UX/Polish | Review page: remove divider, inline Add annotation, swipe hint, BookOpen empty state icon | `ReviewPage.jsx` | — |
| 2026-05-31 | v1.46.223 | Nav | BottomNav: remove RevealLabel entirely; inbox count badge → 6px dot | `BottomNav.jsx` | — |
| 2026-05-31 | v1.46.224 | UX | Mobile search: Spotlight overlay (blur backdrop, 18% from top) replaces toolbar inline; iOS zoom fix | `InboxPage.jsx`, `SearchBar.jsx` | — |
| 2026-05-31 | v1.46.225 | UX | Mobile search rebuilt as MobileSearchOverlay — full-screen, search bar pinned top, results scroll inline | `MobileSearchOverlay.jsx`, `InboxPage.jsx` | — |
| 2026-05-31 | v1.46.226 | Fix/Nav | Bookmark rebuild: onSave/onUnsave sync savedItems; saved filter refreshes on activate; Saved tab in BottomNav | `InboxPage.jsx`, `BottomNav.jsx`, `SecondaryPages.jsx` | — |
| 2026-05-26 | v1.46.201 | Feature/UX/Fix | Podcast search tab in AddModal (Apple Podcasts); mobile folders collapsed by default; Settings chip added to mobile drawer | `AddModal.jsx`, `MobileFeedDrawer.jsx` | — |
| 2026-05-24 | v1.46.199 | Fix/Polish/Perf | Highlight picker: HIGHLIGHT_COLORS fixes pink/purple mismatch; save hover uses T.danger; hero image decoding="async" | `ContentViewer.jsx:1285,500,646,1453` | — |
| 2026-05-23 | v1.46.198 | Feature | Cards first-class: TagsInput with autocomplete, color stripe, hover-delete, search, accent tiles; TagsInput accent pill borders + click-to-filter | `CardsPage.jsx`, `TagsInput.jsx` | — |
| 2026-05-23 | v1.46.197 | Fix | Saving broken: saveItem lacked is_read_later=true; reader save button now toggles; isSaved wired to list view; reader font 20px, wider column, better CSS | `supabase.js`, `ContentViewer.jsx`, `InboxPage.jsx`, `readerPrefs.js` | — |
| 2026-05-23 | v1.46.196 | Nav | Mobile: Settings button in top toolbar; toolbar height 72px; 40px tap targets; larger title + icons; filled unread badge | `InboxPage.jsx`, `App.jsx` | — |
| 2026-05-23 | v1.46.195 | UX | List items larger: mobile rows 14px pad/20px title/104px thumb; desktop vPad+fontSize up at all tiers; default cardSize→lg; BottomNav strokeWidth thinner | `FeedItem.jsx`, `BottomNav.jsx`, `InboxPage.jsx` | — |
| 2026-05-23 | v1.46.194 | Nav | Sidebar nav grouped into two clusters (Inbox/Today vs Saved/Review/Cards) with hairline divider; "Smart" and "Feeds" section labels added to feed tree | `Sidebar.jsx` | — |
| 2026-05-23 | v1.46.193 | Feature | Appearance section in Settings: 6-theme swatch picker; sidebar Light/Dark toggle simplified (active for theme family) | `SecondaryPages.jsx`, `Sidebar.jsx` | — |
| 2026-05-22 | v1.46.192 | Feature | 3 new themes: Cream, Ink, Sepia (editorial palette from design handoff); swatch picker; on-demand Cormorant loading | `tokens.js`, `useTheme.jsx`, `SecondaryPages.jsx`, `Sidebar.jsx` | — |
| 2026-05-22 | v1.46.191 | Fix | Auto-mark-read cascade: fixed fontWeight to 500 (no layout shift), debounce observer 200ms, rootMargin:-20px buffer | `FeedItem.jsx:318,377,510`, `InboxPage.jsx:590-610` | — |
| 2026-05-22 | v1.46.190 | Polish | Row separators, read-item fade 50%, toolbar hairline, card≠bg, BottomNav shadow theme-aware | `FeedItem.jsx`, `InboxPage.jsx`, `tokens.js`, `BottomNav.jsx` | — |
| 2026-05-22 | v1.46.189 | Perf | Drop all Google Fonts; switch to system font stack + ui-serif reader font; Light theme to crisp white/iOS-grey | 8 files | — |
| 2026-05-22 | v1.46.188 | Polish | List view: remove fadeInUp animation, default cardSize lg→md, tighten row padding — less visual bulk | `InboxPage.jsx:42,992,1007`, `FeedItem.jsx:288,345` | — |
| 2026-05-22 | v1.46.187 | Fix | New-articles banner count: track new URLs in ref, only decrement for new items, reset on source/folder/filter change | `InboxPage.jsx:55-56,163,275,453,938` | — |
| 2026-05-22 | v1.46.186 | Polish | Sidebar header: corrected "Feed Box" → "Feedbox" — consistent brand name | `Sidebar.jsx:352` | — |
| 2026-05-15 | v1.46.170 | Nav | Today page added to mobile BottomNav; fixed feeds isActive bug that lit up Feeds when on Today | `BottomNav.jsx:25-31` | — |
| 2026-05-15 | v1.46.171 | UX | Today page mobile: 2-col card grid → full-width list rows with 14px font and large tap targets | `TodayPage.jsx:467-544` | — |
| 2026-05-15 | v1.46.172 | Feature | StatPills interactive: "cards due" → Review, "saved" → Read Later; onNavigate wired to TodayPage | `TodayPage.jsx:363-408`, `App.jsx:217` | — |
| 2026-05-15 | v1.46.173 | Fix | Vitest restored: node env + removed jest-dom setup; 17 tests pass in 13s (was 60s timeout) | `vitest.config.js`, `src/test/setup.js` | — |
| 2026-05-19 | v1.46.180 | Polish | Today desktop MagazineTile: hero+medium overlay+text conditional on hasImage — fix Light theme | `TodayPage.jsx:457-512` | — |
| 2026-05-19 | v1.46.179 | Perf | BottomNav: drop lucide-react, replace List/Inbox with inline SVGs matching Sidebar style | `BottomNav.jsx:1-35` | — |
| 2026-05-16 | v1.46.178 | Polish | Today SnapCard: no-image cards use theme-native colors (T.text, T.border) — fix white text on light bg | `TodayPage.jsx:268-320` | — |
| 2026-05-15 | v1.46.177 | Feature | Today mobile: replace custom swipe engine with CSS scroll-snap; one card per swipe; remove Prev/Next strip | `TodayPage.jsx:232-430` | — |
| 2026-05-15 | v1.46.176 | Fix | Today mobile: two-phase slide transition, navigating lock, BottomNav clearance, flick thresholds | `TodayPage.jsx:232-370` | — |
| 2026-05-15 | v1.46.175 | Fix | Today mobile swipe: imperative ref transforms, passive:false touchmove, velocity flick detection | `TodayPage.jsx:232-330` | — |
| 2026-05-15 | v1.46.174 | Feature | Today page Flipboard redesign: mobile swipeable card deck + desktop magazine tile grid | `TodayPage.jsx` (full rewrite) | — |
| 2026-05-08 | v1.46.166 | Feature | New card button + modal on Cards page — create cards without highlighting in an article | `CardsPage.jsx` | — |
| 2026-05-08 | v1.46.164 | Nav | BottomNav scroll-hide extended to TodayPage and CardsPage — consistent chrome-recede on all primary screens | `TodayPage.jsx:134, CardsPage.jsx:83,198` | — |
| 2026-05-07 | v1.46.163 | UX | Reader top bar auto-hides on scroll-down, reappears on scroll-up — chrome recedes while reading | `ContentViewer.jsx:64,234,360` | — |
| 2026-05-07 | v1.46.162 | UX | Review rating buttons: add touch feedback (opacity+scale) — buttons feel responsive on mobile | `ReviewPage.jsx:269` | — |
| 2026-04-17 | v1.46.161 | Feature | Mobile image size toggle in list view: cycle hidden/small/large thumbnails | `InboxPage.jsx:777` | — |
| 2026-04-17 | v1.46.160 | Feature | Today page revamp: magazine grid layout, HeroCard, StatPills, ArticleGrid | `TodayPage.jsx` | — |
| 2026-04-17 | v1.46.159 | Nav | Sidebar folders default collapsed; expand state persisted to localStorage | `Sidebar.jsx:295` | — |
| 2026-04-17 | v1.46.158 | Feature | Podcast player revamp: mini-bar + full-screen mobile, draggable seek, volume, resume position | `PodcastPlayer.jsx` | — |
| 2026-04-17 | v1.46.157 | UX | Reader toolbar Save+Share → icon-only buttons; Save fills solid when saved | `ContentViewer.jsx:474` | — |
| 2026-04-17 | v1.46.156 | UX | Today source group headers: remove borderBottom + article count — chrome recedes | `TodayPage.jsx:259` | — |
| 2026-04-17 | v1.46.155 | Polish | Sidebar Analytics active bg T.surface → T.accentSurface — matches all other nav items | `Sidebar.jsx:487` | — |
| 2026-04-17 | v1.46.154 | UX | Reader toolbar: external-link icon button to open original article | `ContentViewer.jsx:488` | — |
| 2026-04-17 | v1.46.153 | Polish | BottomNav Inbox badge → dot — matches sidebar dots, consistent mobile/desktop | `BottomNav.jsx:140` | — |
| 2026-04-17 | v1.46.152 | UX | Reader title → clickable link to original article, opens in new tab | `ContentViewer.jsx:629` | — |
| 2026-04-17 | v1.46.151 | Polish | Sidebar unread counts → dot indicators — removes number anxiety, consistent with collapsed nav dots | `Sidebar.jsx:80,132,198` | — |
| 2026-04-17 | v1.46.150 | Feature | Today page: AI morning brief → 3-widget dashboard (Streak, Review Due, Saved) | `TodayPage.jsx` | — |
| 2026-04-12 | v1.46.149 | Polish | Remove duplicate borderLeft from ContentViewer — split-view divider was 2px instead of intended 1px; screen-edge border in full-screen mode eliminated | `ContentViewer.jsx:341` | — |
| 2026-04-12 | v1.46.148 | Polish | Card hover border → background elevation (T.surface2) — eliminates border-flash, calmer hover feedback | `FeedItem.jsx:448` | — |
| 2026-04-11 | v1.46.147 | UX | BottomNav auto-hides on scroll-down, reappears on scroll-up — content-first; consumes existing fb-nav-dir event | `BottomNav.jsx:25` | — |
| 2026-04-11 | v1.46.146 | Polish | Mobile source label fontWeight 500→400 — fixes hierarchy inversion on read items where source outweighed title | `FeedItem.jsx:301` | — |
| 2026-04-10 | v1.46.145 | Polish | Desktop list action button panel: T.bg → T.surface/accentSurface — eliminates visible backdrop mismatch on row hover | `FeedItem.jsx:411` | — |
| 2026-04-10 | v1.46.144 | Polish | Desktop list md row padding 13px → 11px — natural follow-up to description removal; ~1 more article above the fold | `FeedItem.jsx:345` | — |
| 2026-04-09 | v1.46.143 | Polish | Remove description excerpt from default (md) desktop list view — title is now dominant, faster headline scanning | `FeedItem.jsx:386` | — |
| 2026-04-09 | v1.46.142 | Nav | Collapsed sidebar active folder: T.surface → T.accentSurface — active was indistinguishable from hover | `Sidebar.jsx:160` | — |
| 2026-04-09 | v1.46.140 | UX | Reduce mobile feed row padding 14→11px — shows ~1 more item above the fold | `FeedItem.jsx:288` | — |
| 2026-04-09 | v1.46.139 | Polish | Mobile list title clamp 3 → 2 lines — row height ~144px → ~120px, one extra article visible above the fold | `FeedItem.jsx:321` | — |
| 2026-04-08 | v1.46.137 | Feature | Today AI morning brief — daily headline summary, cached by date, ~$0.0013/call | `TodayPage.jsx:28`, `summarize/index.ts:26` | — |
| 2026-04-08 | v1.46.136 | Polish | Skeleton card border removed — loading state now matches borderless FeedItem card appearance | `InboxPage.jsx:1192` | — |
| 2026-04-08 | v1.46.135 | Fix | Optimistic mark-read — sidebar counts update instantly, Supabase write moves to background | `InboxPage.jsx:438` | — |
| 2026-04-08 | v1.46.133 | Fix | getReadUrls scoped to 90 days — fixes 1000-row Supabase cap causing old read items to reappear as unread | `supabase.js:288` | — |
| 2026-04-08 | v1.46.132 | Polish | Swipe action buttons: replace 5 hardcoded iOS hex values with T.accent/T.success/T.warning/T.surface2/T.accentText | `FeedItem.jsx:144,148,157,162,167` | — |
| 2026-04-07 | v1.46.131 | Polish | Sidebar footer icon buttons: inactive border transparent — eliminates T.border noise; accent border kept for active state | `Sidebar.jsx:515,548,553` | — |
| 2026-04-06 | v1.46.129 | Fix | AI settings now work: summarize routes through Supabase Edge Fn (reads app_secrets/app_config); ai_usage tracking added | `fetchers.js:802`, `summarize/index.ts:81` | — |
| 2026-04-06 | v1.46.128 | Polish | Inbox toolbar title 14px → 17px — creates dominant heading, serves Typography-as-design hierarchy principle | `InboxPage.jsx:630` | — |
| 2026-04-06 | v1.46.127 | Fix | YouTube thumbnails + Slickdeals images: media:thumbnail before media:content, yt:videoId fallback, DOMParser extraction | `fetchers.js:281,158,180` | — |
| 2026-04-06 | v1.46.126 | UX | Remove borderBottom from reader top bar — blur+bg already separates header; border competed with article first line | `ContentViewer.jsx:362` | — |
| 2026-04-06 | v1.46.124 | Nav | Sidebar active item uses T.accentSurface — previously T.surface was identical to hover, active page indistinguishable | `Sidebar.jsx:62` | — |
| 2026-04-06 | v1.46.123 | Polish | Replace card-view hover drop shadow with T.border — removes decorative chrome, matches flat hover pattern in list view | `FeedItem.jsx:451` | — |
| 2026-04-05 | v1.46.122 | Polish | Remove decorative boxShadow from list-item hover action tray — no chrome, T.bg contrast sufficient | `FeedItem.jsx:411` | — |
| 2026-04-05 | v1.46.121 | Polish | Read titles on mobile use T.textTertiary (not textSecondary) — matches desktop, sharpens unread/read hierarchy | `FeedItem.jsx:318` | — |
| 2026-04-04 | v1.46.120 | Polish | Remove decorative border from unselected card items — gap+radius define shape | `FeedItem.jsx:450` | — |
| 2026-04-04 | v1.46.119 | Polish | Remove boxShadow from active Unread/All toggle pill — T.bg+weight already signal selection | `InboxPage.jsx:744` | — |
| 2026-04-04 | v1.46.118 | Polish | BottomNav pill bigger: padding 11px, icons 24px, Add 42px, labels 11px | `BottomNav.jsx:37,68,87,99,115,128,141` | — |
| 2026-04-04 | v1.46.117 | Nav | Feeds pill active on Today+Saved pages — pill always shows a selected item | `BottomNav.jsx:76` | — |
| 2026-04-04 | v1.46.116 | Polish | Page transitions: fadeIn → fadeInScale for spatial depth on every navigation | `App.jsx:257` | — |
| 2026-04-04 | v1.46.115 | UX | SwipeRow: add onTouchCancel to reset stuck swipe state on OS interruptions | `FeedItem.jsx:177` | — |
| 2026-04-04 | v1.46.114 | UX | Remove reading time footer from sm cards — eliminates dead space on mobile grid | `FeedItem.jsx:526-537` | — |
| 2026-04-04 | v1.46.113 | Polish | Active BottomNav tab gets accentSurface background pill — clear active state beyond color alone | `BottomNav.jsx:83-120` | — |
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
| 2026-05-14 | v1.46.169 | Polish | BottomNav Cards/Review icons replaced with custom SVGs matching Sidebar — CreditCard and RefreshCw were semantically wrong | `BottomNav.jsx:2-14,22` | — |
| 2026-05-22 | v1.46.181-182 | Fix | ReviewPage rating buttons bottom padding increased to clear fixed BottomNav pill on mobile | `ReviewPage.jsx:251` | — |
| 2026-05-22 | v1.46.183 | Feature | Desktop Bazqux-style compact list + infinite scroll — 60 items initial, +40 on scroll near bottom; J/K expands; default view changed to list | `FeedItem.jsx:344-424`, `InboxPage.jsx:42,69,274,290,929,985` | — |
| 2026-05-22 | v1.46.184 | Perf | PodcastPlayer: RAF loops throttled 60fps→2fps, preload=auto, auto-play on episode set | `PodcastPlayer.jsx:31,292,308,368,545` | — |
| 2026-05-22 | v1.46.185 | Fix | Restore desktop list thumbnails (lg default), newArticleCount decrements on scroll-read, remove DigestModal | `FeedItem.jsx:344`, `InboxPage.jsx:43,447`, `DigestModal.jsx` deleted | — |
| 2026-06-08 | v1.46.234 | Perf | Lazy-load @mozilla/readability — removes 34 kB (11 kB gz) from InboxPage initial load | `fetchers.js:2,425` | — |
| 2026-06-08 | v1.46.235 | Polish | Page transition: scale+opacity → pure opacity fade, 180ms→100ms — snappier nav, removes GPU composite layer | `index.css:55-58`, `App.jsx:310` | — |
| 2026-06-08 | v1.46.236 | Polish | FeedItem read-state opacity fade 250–300ms→150ms — mark-read feels 2× faster in all views | `FeedItem.jsx:229,307,361,409` | — |
| 2026-06-08 | v1.46.237 | Feature | Today page redesigned: Queue + Feed Pulse + Reading Log — replaces magazine grid; 20kB→9kB | `TodayPage.jsx`, `App.jsx:236` | — |
| 2026-06-08 | v1.46.238 | Feature | Persistent podcast mini-player — desktop modal → floating mini-bar bottom-right; navigate freely while listening | `PodcastPlayer.jsx:296,547-639` | — |

---

## How to use this log

**During a session:** The `/iterate` skill appends a row here automatically after each deploy.

**End of session:** Run `/cost` in the Claude Code chat. It shows total tokens used this session. Note the dollar amount in the "Session Cost" column for the iterations you just ran. Then stop — all changes are committed and deployed.

**Resuming later:** Just open Claude Code and type `/iterate`. It reads git history, CLAUDE.md, and memory to understand current state — no need to brief it.

## Session history

| Date | Iterations | Focus | Session Cost |
|------|-----------|-------|-------------|
| 2026-05-26 | 1 | Feature: Anki-style Review + Supabase SR persistence + Cards due status + scroll fix + FeedItem perf + Reeder-style mobile density | — |
| 2026-03-27 | 2 | Nav: label consistency, touch cancel fix | — |
