# Feedbox 2.0 — Redesign Developer Handoff

Audience: Claude Code (or a developer) implementing the minimal "Things 3 + Procreate, with Reeder 5 ideas" redesign of the **web app** (`src/`).
Status as of this document: `main` is at v1.46.514. The branch `claude/elegant-planck-1w3lbv` is 2 commits ahead of `main` (reader refinements, not yet released). Read this whole file before writing code.

---

## 1. Goal

Ship **Feedbox 2.0**: a calmer, more minimal interface where the reading experience is the product.

- Look: Things 3 (large calm titles, hairlines, rounded cards, plain text tabs) + Procreate (one dark floating dock, color dots for highlights).
- Reading: Instapaper-style reader, chrome hidden while reading, typography in one sheet.
- Lists: Reeder 5-style dense rows (source above a bold title, short excerpt, rounded thumbnail, date sections).
- Keep the logo and the teal accent exactly as they are.

Out of scope: the native Swift app in `native/` (it has its own pipeline, see §11), any backend/data-layer change, pricing/plan logic, new features beyond the redesign.

---

## 2. Source of truth (read these first)

| Path | What it is |
|---|---|
| `docs/mockups/design/Main.dc.html` | Phone Inbox — Reeder-style dense rows, date sections, segmented filter, dark dock. **Latest.** |
| `docs/mockups/design/Reader.dc.html` | Phone Reader — hero image, bottom toolbar (prev, next, star, highlight, Aa, share). **Latest.** |
| `docs/mockups/design/Cards.dc.html` | Phone Cards — theme cards with dot, count, representative quote. |
| `docs/mockups/design/Review.dc.html` | Phone Review — large flashcard, progress bar, rating pill. **See §8: conflicts with current app logic.** |
| `docs/mockups/design/DesktopFeeds.dc.html` | Desktop: slim 68px rail + centered 720px Feeds list. |
| `docs/mockups/design/DesktopInbox.dc.html` | Desktop: three panes (rail, 400px list, reading pane). **Target for desktop.** |
| `docs/mockups/reader/*.dc.html` | Earlier reader study: Aa sheet (`Controls`), night theme with highlight (`Night`), desktop reader (`Desktop`). Use for the Aa sheet detail. |
| `docs/mockups/spec.txt` | Written spec for the minimal layout tokens and rules. Authoritative for typography, radii, spacing and touch targets. |
| `docs/ios-native-plan.md` | Native app plan. Not in scope here. |

The `.dc.html` files are design-canvas artboards (inline styles, 390×844 phone or 1280×800 desktop). They are visual references, not code to copy. Build with the app's existing components and theme tokens.

---

## 3. Current state (what already exists — do not redo)

Shipped on `main` (v1.46.512–514) or on the branch:

- **Themes:** `PAPER` (light) and `SLATE` (dark) in `src/lib/tokens.js`, registered in `src/hooks/useTheme.jsx`. Paper is the default for new users. A one-time migration (`fb-theme-paper-v1`) moves existing users to Paper or Slate. The older six themes still exist (nocturne, distilled, light, cream, ink, sepia).
- **Mobile dock:** `src/components/BottomNav.jsx` `NAV_ITEMS` = Inbox, Cards, Review, Today, More. Dark charcoal pill in Paper/Slate. Hidden while reading.
- **Desktop sidebar:** `src/components/Sidebar.jsx` starts as a slim icon rail (`App.jsx` `fb-sidebar-open`, default collapsed). `PRIMARY_NAV` = Inbox, Today. `LIBRARY_NAV` = Saved, Cards, Review.
- **Feeds picker:** `src/pages/InboxPage.jsx` `FeedPickerRow` / `FeedPickerList`; centered rounded list on desktop. The Inbox header Feeds button dispatches `fb-open-feeds` (listened in `App.jsx`).
- **Mobile article rows:** `src/components/FeedItem.jsx` `ListItem`, `isMobile` branch: 17px titles (weight 500 unread / 400 read), hairline separators, 13px meta, thumbnail kept, preview hidden when a thumbnail shows. `SwipeRow` handles swipe actions.
- **Cards / Today / Review headers:** large-title pattern (36px / 600), restyled in `CardsPage.jsx`, `TodayPage.jsx`, `ReviewPage.jsx`.
- **Reader:** `src/components/ContentViewer.jsx` — title 28px/40px weight 500, "N min left" label, line-spacing setting (Tight 1.55 / Comfortable 1.7 / Loose 1.9) stored in `src/lib/readerPrefs.js`, plus the refinements from the last two commits (back chevron, meta above title, safe-area insets, 26px gutters, `SelectionToolbar.jsx` restyle).

**Not built yet** (the gaps this handoff is for): see §7.

---

## 4. Design tokens

All colors come from the theme object `T` (from `useTheme()`). **Do not hard-code colors** except the four highlight dots below and the brand mark.

**Brand (fixed, `BRAND` in tokens.js):** mint `#65D5C4`, mintDeep `#47AD9E`, ink `#2F373B`. The logo tile is ink with a mint glyph. Do not change the logo.

**Highlight dots (fixed):** teal `#65D5C4`, amber `#F2C462`, rose `#EE9A8E`, violet `#A99BE0`.

**Paper (light) — key tokens:** bg `#F6F7F8`, card `#FFFFFF`, text `#1C2123`, textSecondary `#4A5358`, textTertiary `#636C71`, border `#E6E8EA`, accent `#17806F`, surface2 `#E3E6E8`.

**Slate (dark) — key tokens:** bg `#15181A`, card `#1E2326`, text `#E3E6E7`, textSecondary `#B4BBBF`, textTertiary `#8B949A`, border `rgba(255,255,255,0.08)`, accent `#65D5C4`.

**Reading font:** `var(--reader-font-family)` (Newsreader for Paper/Slate, Cormorant for the editorial themes). UI text keeps the inherited font (Figtree in mockups; the app uses its system stack — keep the app's font).

**Type scale (from spec.txt):**
- Large title: 36px, weight 600, letter-spacing −0.02em, line-height 1.1.
- Reader title: 28px mobile / 40px desktop, weight 500, letter-spacing −0.012em, line-height 1.15.
- Row title: 17px, weight 500 unread / 400 read, line-height 1.3.
- Meta / source: 13px, `T.textTertiary`.
- Subtitle under a large title: 15px, `T.textTertiary`.
- Body reading text: 20px, line-height 1.7 (user-adjustable via `readerPrefs`).

**Radii:** cards 16–20px; thumbnails 12px (72px) / 10px (60px); flashcard 28px; pills 999px; segmented control 11–12px outer, 8–9px inner.

**Spacing:** page padding 20–24px horizontal; header top padding ~56–60px (iOS safe area); row padding 14px vertical, 20px horizontal; gaps 12–14px.

**Shadows:** card `0 1px 2px rgba(0,0,0,0.05)`; floating dock `0 10px 30px rgba(28,33,35,0.28)` (Paper) — use `SHAPE.shadowFloat` in `tokens.js` where it exists.

**Hairlines:** 1px `T.border`, inset 16–20px from the left.

**Touch targets:** every tappable control ≥44×44px. Icon buttons use 1.6px stroke icons and need an `aria-label`.

**Existing token helper:** `SHAPE` in `tokens.js` (radiusXs/Sm/Md/Card/Pill, rowPadY/X, rowGap, barInset, blur, shadowFloat). Prefer `SHAPE` values over new numbers where they match.

---

## 5. Component map (where each screen lives)

| Screen / element | File | Notes |
|---|---|---|
| Mobile dock | `src/components/BottomNav.jsx` | `NAV_ITEMS`; Paper/Slate override block near the top of the component. |
| Desktop sidebar + rail | `src/components/Sidebar.jsx` | `NavItem`, `FolderSection`, `SmartRow`, `SectionLabel`, `PRIMARY_NAV`/`LIBRARY_NAV`. Collapsed width set in the `W` constant. |
| Sidebar toggle state | `src/App.jsx` | `sidebarOpen` + `fb-sidebar-open`. |
| Inbox header, filters, feeds picker | `src/pages/InboxPage.jsx` | Header near the `showFeedPicker` logic; `FeedPickerRow`/`FeedPickerList` (~line 2100). |
| Article rows (mobile + desktop) | `src/components/FeedItem.jsx` | `ListItem`, `MobileThumb`, `SwipeRow`. |
| Cards | `src/pages/CardsPage.jsx` | Header, theme card list, bucket view. Sort / map / shuffle buttons still old style. |
| Review | `src/pages/ReviewPage.jsx` | `rate(entry, knew)`, `handleRating(knew)`, keyboard + swipe handlers. See §8. |
| Today | `src/pages/TodayPage.jsx` | Header, stat row, cards. |
| Reader | `src/components/ContentViewer.jsx` | Full-screen article reader; settings panel (Aa); highlights; TTS; bionic. |
| Text selection toolbar | `src/components/SelectionToolbar.jsx` | Highlight color palette and note entry. |
| Reader preferences | `src/lib/readerPrefs.js` | localStorage key `fb-reader-prefs`. |
| Theme picker (Settings) | `src/pages/SecondaryPages.jsx` | ~line 640; list of themes incl. Paper and Slate. |
| Feeds drawer (mobile) | `src/components/MobileFeedDrawer.jsx` | Folder/feed drill-down, Saved row. |
| More sheet | `src/components/MoreMenuSheet.jsx` | Reached from the dock "More". |
| Login | `src/pages/LoginPage.jsx` | Not yet restyled. |
| Theme hook | `src/hooks/useTheme.jsx` | Registers themes, fonts, migration. |

Run `grep -n "<name>" <file>` before reading; these files are large (InboxPage ~2,300 lines, ContentViewer ~1,900).

---

## 6. Behaviour that must not break

- **Data layer:** `src/lib/supabase.js`, `src/lib/fetchers.js`, feed caching (`feedCache.js`), and all Supabase queries stay unchanged.
- **Auth:** `src/hooks/useAuth.jsx` unchanged. Login may be restyled, not re-wired.
- **Plan gating:** `src/components/PlanGate.jsx` and `src/lib/plan.js`; Pro features stay gated.
- **Reader features:** highlights, notes, TTS with word sync (`onboundary`), bionic reading, AI tag suggestions (deferred to idle), save/unsave, read-later.
- **Swipe actions** on rows (`SwipeRow`): mark read, read later, save.
- **Review keyboard and swipe:** Space/Enter/→/K = next, ←/J = show again soon; swipe right/left. Guards stop accidental advance while typing a note.
- **Feeds reachable on mobile:** the Feeds button in the Inbox header (`fb-open-feeds`) must work once the dock no longer has a Feeds item.
- **Saved** is reachable from the feeds drawer and the sidebar (`LIBRARY_NAV`).
- **Keyboard:** all actions reachable without a pointer on desktop.
- **localStorage keys in use:** `fb-theme`, `fb-theme-paper-v1`, `fb-sidebar-open`, `fb-sidebar-folders`, `fb-reader-prefs`, `fb-review-count`, `fb-swipe-left`, `fb-swipe-right`, `fb-swipe-hint-done`, `fb-onboarded`, `fb-sort-order`, `fb-group-by`, `fb-feed-limit`, `fb-automark`, `fb-muted-keywords`, `fb-digest-*`. Do not rename or clear them.

---

## 7. Remaining work (what 2.0 needs)

### Phase 1 — Reader and rows (mobile first)
1. **Aa sheet** in `ContentViewer.jsx`: bottom sheet with size slider, typeface (Serif / Sans / Mono), line spacing, theme dots (Paper, Sepia, Slate, Night). Reuse `readerPrefs`. Reference: `docs/mockups/reader/Controls.dc.html`.
2. **Reader bottom toolbar**: previous, next, star, highlight (mint centre button), Aa, share. Dock stays hidden while reading. Reference: `docs/mockups/design/Reader.dc.html`.
3. **Hero image** under the reader title when the article has one (fallback: no block, not a placeholder).
4. **Dense rows** in `FeedItem.jsx` mobile branch: source line with favicon tile + time, 17px bold title, 2-line grey excerpt, 72px rounded thumbnail on the right, unread = small teal dot, read = dimmed. Reference: `docs/mockups/design/Main.dc.html`.
5. **Date sections** ("Today", "Yesterday", then older) in the Inbox list.
6. **Segmented filter** (Unread / Starred / All) — a pill control. Starred needs a real filter (see §8).

### Phase 2 — Remaining screens and Review
7. **Review ratings** — resolve §8 first.
8. **Cards leftovers:** restyle sort, map and shuffle buttons to quiet icon buttons; verify tag rename, merge and delete still work and are reachable.
9. **Saved, Settings, Sources, Stats (`AnalyticsPage.jsx`), History, MoreMenuSheet, login screen, modals (`AddModal`, `FolderModal`, `SmartFeedModal`)**: apply the large-title, hairline and card language. Keep all actions.
10. **Theme picker** in Settings: keep Paper/Slate first; keep the older themes behind a "More themes" row so existing users can still switch back.

### Phase 3 — Desktop and release
11. **Desktop three panes** (`DesktopInbox.dc.html`): rail (already exists) + 400px list + reading pane. Selecting a row opens the article in the right pane instead of full screen. Keep the full-screen reader on mobile.
12. **Desktop Feeds** (`DesktopFeeds.dc.html`) — already close; check it against the current picker.
13. **"What's new in 2.0"** card, shown once (`localStorage` key, e.g. `fb-whats-new-2`), with a link to the theme picker.
14. **QA pass** on every screen at 390px, 768px and 1280px widths, in Paper and Slate (see §10).
15. **Release** (see §11).

---

## 8. Decisions needed before building (do not guess)

1. **Review ratings.** The Review mockup shows four buttons (Again / Hard / Good / Easy) and a tap-to-reveal card. The app today uses a Readwise-style flow: each card shows its passage, note and tags immediately; **Next →** (grows the interval) or **↻ Show again soon** (resets it), plus Mastered (`CHANGELOG.md`, v1.46.496). The scheduling (SM-2) is in `ReviewPage.jsx`, but `rate(entry, knew)` is binary. **Ask the owner which to build:** (a) keep the current Next / Show-again flow and restyle it to match the mockup without the four-way buttons; or (b) add Hard/Good/Easy with distinct intervals (needs a scheduling change and a note on how it maps to SM-2). Default if no answer: option (a).
2. **Starred tab.** The mockup has Unread / Starred / All. At the last check no UI sets `readFilter` to a starred value; re-check `InboxPage.jsx` before building. Decide whether Starred maps to the existing Saved/bookmark data or is dropped from the Inbox tabs. Default: drop it from the Inbox, keep Saved in the sidebar.
3. **Feeds in the dock.** The dock no longer has Feeds. Confirm the Inbox header Feeds button is the only entry point on mobile (the drawer is reached through it).
4. **Native app.** Out of scope for 2.0 web. Confirm nothing in `native/` is changed in this release.

---

## 9. Working rules (from `CLAUDE.md`)

- **Branch:** develop on `claude/elegant-planck-1w3lbv`. Do not push to `main` until the 2.0 gate (§12). Do not open a PR unless asked.
- **Tests:** `npm test` must pass (33 tests at last count). Run it before every commit.
- **Build:** `VITE_SUPABASE_URL=https://x.supabase.co VITE_SUPABASE_ANON_KEY=x npx vite build`, then `git checkout dist` (the build rewrites tracked files in `dist/`).
- **Changelog:** every change adds a `## [Unreleased]` entry at the top of `CHANGELOG.md` with an area tag (`Nav`, `Polish`, `Perf`, `Fix`, `Feature`, `UX`, `Security`). Required before any `npm run deploy`.
- **Agent log:** append one row to `AGENT_LOG.md` per change batch.
- **Commits:** small, one screen or concern per commit. Message describes the change. Do not add model names to commit messages, PR text or code comments.
- **Scope:** change only the files the phase needs. Do not change data or business logic.
- **No raw deploy from a branch:** deploy only from `main` via `npm run deploy` (patch) or `npm run deploy:major` (2.0).

---

## 10. Acceptance criteria and verification

For each screen, before it is marked done:

- [ ] Matches the mockup at 390px width (mobile) and the desktop mockup at 1280px.
- [ ] Works in **Paper** and **Slate**; no hard-coded colors outside the highlight dots.
- [ ] All tap targets ≥44px; icon buttons have `aria-label`.
- [ ] Keyboard reachable on desktop; focus visible.
- [ ] No horizontal scroll at 390px.
- [ ] Every action that existed before still works (see §6).
- [ ] `npm test` passes; `vite build` passes.

**Screenshots.** The app shows only the login screen without a Supabase session. To review real screens, either (a) sign in with a test account and run the Playwright/Chromium browser at `/opt/pw-browsers/chromium`, or (b) add a demo-data mode. Option (b) is recommended: a `?demo=1` query flag that loads fixture feeds and articles (no network), used only for screenshots, never in production. Ask the owner before adding it.

---

## 11. Native app (out of scope, for reference)

`native/` has its own rules in `CLAUDE.md`: use `native/verify.sh`, never raw `xcodebuild` or `swift test`; release with `native/ship.sh`. Do not change native code as part of 2.0 web.

---

## 12. 2.0 release gate

2.0 ships to `main` only when **all** of these are true:

1. Phase 1 and Phase 2 items 7–10 are complete, with §8 decisions answered.
2. Phase 3 items 11–14 are complete, including the QA pass on every screen.
3. The owner has reviewed screenshots of the Inbox, Reader, Cards, Review and Desktop in both Paper and Slate.
4. `npm test` and `vite build` pass on the branch.
5. `CHANGELOG.md` has a full `## [Unreleased]` entry for 2.0.
6. The branch is merged to `main` (fast-forward or merge commit; no rebase of shared history).
7. Then run `npm run deploy:major` from `main`, which bumps 1.x → 2.0.0 and deploys.

Rollback: revert the merge commit on `main` and redeploy with `npm run deploy` (patch) to restore the previous behaviour; the migration key `fb-theme-paper-v1` is harmless if left.

---

## 13. Quick start for Claude Code

```bash
cd /home/user/rssbrainbits
git fetch origin && git checkout claude/elegant-planck-1w3lbv && git pull
npm install
npm test
# then start with Phase 1, item 1 (Aa sheet) — read docs/mockups/reader/Controls.dc.html and src/components/ContentViewer.jsx (settings panel near the readerPrefs controls)
```

Start with §8 questions: ask the owner before building Review ratings or the Starred tab.
