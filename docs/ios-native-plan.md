# Feedbox — iOS Native Plan (Phase 0 audit)

**Status:** Phase 0 — audit and scoping only. No app code shipped to the web build.
**Decision this phase records:** drop the PWA as the primary product; build a native iOS
app instead of the web-expansion plan (podcasts/notes/publishing) that was proposed
alongside this decision. That expansion plan is shelved, not merged into this one — if
notes/publishing are still wanted later, they get re-scoped against the native app, not
retrofitted onto the PWA.

This supersedes `SWIFT_REBUILD.md`'s recommendation to keep both and rebuild only after
~50 paying web users. That tradeoff was made explicitly by the user, not inferred here —
recorded so it isn't re-litigated by accident in a later session.

**Hard constraint on this session:** it runs in a Linux container. No macOS, no Xcode, no
Simulator. Nothing below has been compiled. The scaffolding in `ios/Feedbox/` is a
best-effort first draft to open in Xcode and fix against real compiler errors — treat
every file as a draft, not a deliverable.

---

## 1. What actually exists today (real audit, not the SWIFT_REBUILD.md sketch)

`SWIFT_REBUILD.md` was written before Cards/Zettelkasten, Review (spaced repetition),
Today, Analytics, and the podcast player existed. It's a good architecture-mapping
reference (keep it), but its feature list and schema are stale. This section replaces
that part.

### 1.1 Database — 11 tables, all RLS'd on `auth.uid() = user_id`

| Table | Purpose | Notable columns |
|---|---|---|
| `feeds` | Subscribed feeds | `url`, `type` ('rss'/'podcast'/'youtube'), `name`, `folder_id` |
| `feed_folders` | Feed grouping | `name`, `color`, `position` |
| `history` | Read history | `url`, `title`, `source`, `read_at`, generated `search_vector` (tsvector, full-text) |
| `saved` | Saved/Read Later (shared table) | `is_read_later` bool distinguishes the two, generated `search_vector` |
| `highlights` | Highlight + annotation (the core "card" unit) | `article_url`, `passage`, `note`, `color`, `position`, `tags text[]` |
| `article_tags` | Tags on whole articles (distinct from highlight tags) | `article_url`, `tag` |
| `read_items` | Unread/read tracking | `url`, `feed_id` — absence from this table = unread |
| `smart_feeds` | Keyword-bucket virtual feeds | `keywords text[]`, `feed_ids text[]` (null = all), `match_mode` |
| `reading_progress` | Per-article scroll % | composite PK `(user_id, article_url)`, `progress 0-100` |
| `highlight_reviews` | Spaced repetition state | `ease float`, `interval int`, `next_review date` — SM-2-style, FK to `highlights` |
| `subscription_events` | Billing audit log | `event`, `plan` |

Plan tier (`free`/`pro`) lives in `auth.users.app_metadata.plan` — **not** a table, and
specifically not `user_metadata` (OAuth providers overwrite that on every login). This
matters for the native port: Supabase Swift SDK's session/user object must be read from
`appMetadata`, not `userMetadata`, or Pro users will silently revert to Free after a
GitHub/Google re-login.

### 1.2 Query surface — 55 functions in `src/lib/supabase.js`, bucketed

- **Auth (4):** GitHub OAuth, Google OAuth, sign out, auth-change listener
- **Feeds (4):** get/add/update-settings/delete
- **History (3):** get, add, clear
- **Saved/Read Later (5):** get/save/unsave, get/add/remove read-later
- **Read state (4):** get read URLs, mark read, mark-all-read, mark unread
- **Highlights (5):** get, add, update note, update tags, delete (+ delete-many)
- **Article tags (4):** get, add, delete, get-all-tags
- **Search (1):** `searchItems` — full-text across history + saved
- **Smart feeds (4):** get/add/update/delete, plus pure-function `matchesSmartFeed` (portable as-is, no I/O)
- **Reading stats (1):** `getReadingStats` — aggregation query for AnalyticsPage
- **Spaced repetition (3):** get all highlights, get/upsert review state
- **Reading progress (2):** get/set
- **Folders (4):** get/add/update/delete
- **AI usage metering (2):** get today's count, increment (enforces the Free-tier 5/day cap)
- **Admin config (4):** app_config / app_secret get/set — **admin-only, stays web-only**, do not port

### 1.3 Edge Functions (5) — disposition for native

| Function | Native disposition |
|---|---|
| `summarize` | Keep. Call Anthropic directly from the app (URLSession) *or* keep routing through this Edge Function if the API key should stay server-side rather than in Keychain. **Open decision, see §5.** |
| `create-checkout` | Drop for iOS. Replaced by StoreKit 2 in-app purchase — Apple requires this for digital subscriptions, Stripe checkout is not allowed in-app. |
| `create-portal-session` | Drop for iOS. Subscription management moves to `Transaction.currentEntitlements` / App Store subscription settings. |
| `stripe-webhook` | Keep running (web users still need it if web stays live) but add a sibling `apple-webhook` Edge Function for `SUBSCRIBED`/`DID_RENEW`/`EXPIRED` App Store Server Notifications, writing the same `app_metadata.plan` field. Both webhooks converge on one plan flag — do not create a separate "ios_plan" column. |
| `admin-stats` | Stays web-only (`dist/admin/`). No native equivalent planned. |

### 1.4 Fetch/parse layer (`src/lib/fetchers.js`, ~800 lines)

All of this gets **simpler** natively — no CORS proxy race (`corsproxy.io` /
`allorigins.win` / `codetabs.com`), no `rss2json` fallback, because `URLSession` fetches
any URL directly. Concretely replace:

- RSS 2.0 + Atom parsing (including this session's Atom podcast-audio fix) → `FeedKit`. **Verify FeedKit surfaces `<enclosure>` and the `itunes:*` namespace** (duration, episode/season, image, explicit) before relying on it — if it doesn't, port the existing DOMParser-based extraction logic (`fetchers.js:248-303`) to `SwiftSoup`/`XMLParser` instead of assuming parity.
- `@mozilla/readability` article extraction → `SwiftSoup` port or headless `WKWebView` + the actual `Readability.js` (SWIFT_REBUILD.md's Option B — reuses proven logic, ships faster, costs a hidden webview).
- YouTube transcript fetch (`fetchers.js:106+`, hits `youtube.com/api/timedtext` directly) → ports unchanged, it's already a direct fetch with no proxy dependency.
- Podcast queue/auto-advance logic (just shipped this session in `PodcastPlayer.jsx` — sibling-episode queue built from already-loaded feed items, auto-advance on `ended`) → same shape natively: build the queue from `FeedItem` rows already fetched for that feed, advance via `AVQueuePlayer` or manually on `AVPlayer` finish notification.
- Web Speech API TTS: **CLAUDE.md mentions this but it's not currently in the code** (`grep` for `speechSynthesis` found zero matches; only a stale comment referencing removed "TTS word spans" in `ContentViewer.jsx`). Confirmed absent — not a native regression, nothing to port.

### 1.5 Client-side-only logic (directly portable, no backend involved)

- `src/lib/zettel.js` (40 lines) — the Cards/Zettelkasten connection engine (shared-theme + shared-source weighting). Pure function, zero dependencies, trivial Swift port.
- `src/lib/plan.js` — tier limits table. Port verbatim as `PlanLimits.swift` (see scaffolding) so Free/Pro behavior matches exactly; do not redesign limits during the port.
- `matchesSmartFeed` in `supabase.js:334` — pure keyword-matching predicate, portable as-is.

### 1.6 Dependencies — minimal, good news for the port

Runtime deps are just `@mozilla/readability`, `@supabase/supabase-js`, `fuse.js` (search),
`react`/`react-dom`. No exotic libraries to find Swift equivalents for beyond what
SWIFT_REBUILD.md already lists (`supabase-swift`, `FeedKit`, `SwiftSoup`,
`keychain-swift`). `fuse.js` fuzzy search has no direct Swift equivalent in the existing
plan — see §5.

---

## 2. Schema → Swift models

Straight 1:1 mapping, see `ios/Feedbox/Shared/Models/*.swift` for the actual Codable
structs. No schema changes proposed — the existing Postgres schema is reused as-is via
`supabase-swift`; native does not get its own schema.

## 3. Tier gating → StoreKit 2

`PlanLimits.swift` (scaffolded) mirrors `plan.js` exactly: same numeric limits, same
`Infinity`→`nil` (unlimited) mapping, read from `app_metadata.plan` via the Supabase
session, not from StoreKit entitlements directly — StoreKit confirms *purchase*,
Supabase's `app_metadata.plan` (updated by the `apple-webhook` function) remains the
single source of truth for *access*, exactly as it is today for Stripe. This keeps one
plan-flag path for both billing providers instead of two.

## 4. Ordered build sequence

Reusing SWIFT_REBUILD.md's phase table (still sound) but folding in what's new:

| Phase | Scope | Notes vs. original sketch |
|---|---|---|
| 1 | Project setup, Supabase auth, feed list | unchanged |
| 2 | RSS/Atom parsing (incl. podcast enclosures), inbox, article reader | verify FeedKit enclosure support first (§1.4) |
| 3 | AI summaries, full-text extraction, highlights | decide key-handling (§5) before building |
| 4 | Smart feeds, folders, settings | unchanged |
| 5 | **Cards/Zettelkasten + Review (spaced repetition)** | not in original sketch — port `zettel.js` + `highlight_reviews` SM-2 logic |
| 6 | Podcast player (Media Session equivalent, queue/auto-advance) | native is *easier* than the PWA version — `AVPlayer` + `MPNowPlayingInfoCenter` don't have iOS PWA's background-audio unreliability |
| 7 | StoreKit 2 + paywall + `apple-webhook` Edge Function | unchanged |
| 8 | Background refresh, push notifications, widgets | unchanged |
| 9 | TestFlight beta, bug fixes, App Store submission | unchanged |

Timeline estimate unchanged from SWIFT_REBUILD.md (~15 weeks part-time), plus the added
scope in phase 5 — call it **17-18 weeks**, solo, part-time.

## 5. Open decisions — need your input before Phase 1 starts

1. **Web app fate.** Sunset `rss.brainbits.us` entirely, or keep it live read-only /
   maintenance-mode for existing web users during the native build? Affects whether
   Stripe billing code can be deleted or must keep running alongside StoreKit.
2. **AI summary key handling.** Keep the `summarize` Edge Function (server holds the
   Anthropic key, app just calls Supabase) vs. call Anthropic directly from the app with
   the key in Keychain (matches SWIFT_REBUILD.md's sketch, but means every user needs
   their own key, or the app ships a shared key that's easier to extract from an IPA than
   from a server). Recommend keeping the Edge Function — it's already built and working.
3. **Search.** `fuse.js` fuzzy search has no chosen Swift replacement yet. Options:
   Postgres full-text (`search_vector` columns already exist on `history`/`saved` — extend
   the pattern) vs. a Swift fuzzy-match library vs. `NSPredicate`/Core Data search. Needs a
   decision before Phase 4.
4. **Distribution scope.** Confirmed iOS-only (not macOS/Catalyst) per this session's
   decision — flagging so a future session doesn't silently expand scope back to
   "universal app" from old SWIFT_REBUILD.md defaults.
5. **Apple Developer Program enrollment** — has this been set up? Blocks Phase 7-9
   regardless of code readiness.

## 6. What's explicitly out of scope for this native build

- macOS target (Catalyst or native) — dropped per this session's "focus on iOS" decision.
- The Phase 1-3 web-expansion plan (podcasts-already-shipped/notes/publishing) pasted
  earlier this session — shelved, not merged into this plan. If durable notes + publishing
  are still wanted, they get re-scoped as native iOS features later, with their own
  audit — do not assume the shelved plan's DDL proposal still applies to a Supabase
  backend serving a native client.
- Admin dashboard (`dist/admin/`) — stays web-only, no native equivalent planned.
