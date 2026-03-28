# Agent Iteration Log

Each row is one `/iterate` run. Token costs are for the full Claude Code session — run `/cost` at the end of a session to get the number, then note it in the Session Cost column.

| Date | Version | Area | Change | Files | Session Cost |
|------|---------|------|--------|-------|-------------|
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

---

## How to use this log

**During a session:** The `/iterate` skill appends a row here automatically after each deploy.

**End of session:** Run `/cost` in the Claude Code chat. It shows total tokens used this session. Note the dollar amount in the "Session Cost" column for the iterations you just ran. Then stop — all changes are committed and deployed.

**Resuming later:** Just open Claude Code and type `/iterate`. It reads git history, CLAUDE.md, and memory to understand current state — no need to brief it.

## Session history

| Date | Iterations | Focus | Session Cost |
|------|-----------|-------|-------------|
| 2026-03-27 | 2 | Nav: label consistency, touch cancel fix | — |
