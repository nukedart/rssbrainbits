# Feedbox — Pre-Public Testing Checklist

Run through this end-to-end before any public promotion (Show HN, Product Hunt, social,
paid ads). Check items off as you go — don't skip to "looks fine," actually click through
each flow. Test on a fresh/incognito session where noted so you're not riding on cached
state or an already-authenticated account.

---

## 1. Deploy & infra health (do this first)

- [ ] Latest GitHub Actions run on `main` is green — https://github.com/nukedart/rssbrainbits/actions
- [ ] `npm ci` succeeds from a clean clone (not just `npm install` on your existing machine) — this exact gap silently broke 3 deploys in a row before
- [ ] `npm test` passes
- [ ] `npm run build` produces no warnings in the console output (check for stray esbuild/JSX warnings — they can mean a real rendering bug, not just noise)
- [ ] Site loads at https://rss.brainbits.us in an incognito window (no stale service worker/cache masking a broken deploy)
- [ ] Hard-refresh (Cmd+Shift+R) still loads correctly — checks the PWA service worker isn't serving a stale bundle

## 2. Legal / naming / compliance

- [ ] Checked USPTO TESS (https://tsdr.uspto.gov/) for "Feedbox" trademark conflicts — at minimum, two existing RSS apps already use this name (Apple App Store, Amazon Appstore/Android)
- [ ] Decided how to brand public-facing marketing given the above (pair with "BrainBits," alt name, or accept the risk knowingly)
- [ ] `terms.html` and `privacy.html` are current and linked from the app footer/settings
- [ ] Privacy policy's third-party service list matches what's actually integrated (Supabase, Anthropic, CORS proxies, Google Favicons)
- [ ] `npx license-checker --production --summary` still shows no GPL/AGPL/copyleft dependencies
- [ ] No competitor logos/marks used anywhere in the UI or marketing assets (only plain-text competitor names in OPML import instructions, which is fine)

## 3. Auth & account

- [ ] Sign up with a brand-new email (incognito) → confirmation email arrives within a couple minutes
- [ ] Confirmation link works and lands you signed in
- [ ] Magic link sign-in works end-to-end
- [ ] Password reset email arrives, link works, new password takes effect
- [ ] Sign out → sign back in with same credentials
- [ ] OAuth (GitHub/Google, if enabled) completes and creates a proper account
- [ ] Supabase auth email sender shows "Feedbox," not the default Supabase branding
- [ ] Supabase email rate limit is raised past the free-tier default (3/hour will get you in trouble fast) — see LAUNCH.md §2.3

## 4. Feeds & Inbox (core loop)

- [ ] Add a feed by URL → items load within a reasonable time
- [ ] Add a feed via search/discovery (if supported)
- [ ] All three CORS proxies are actually reachable right now — corsproxy.io, allorigins.win, codetabs.com (these have historically rate-limited/blocked at scale; verify the race/fallback logic actually falls through)
- [ ] OPML import from a real exported file (Feedly, Reeder, Inoreader format) — folders/structure preserved
- [ ] OPML export produces a valid file another reader can import
- [ ] Mark item read/unread
- [ ] Mark all read
- [ ] Delete/unsubscribe a feed
- [ ] Folder creation, rename, delete, and drag-assign a feed into it
- [ ] Smart feed creation with a filter rule, and it actually filters correctly
- [ ] Search (the `/` shortcut) returns relevant results across feeds
- [ ] Pull-to-refresh / manual refresh actually fetches new items

## 5. Reader / annotation (the core differentiator — test this hardest)

- [ ] Open an article → clean Readability extraction (no broken layout, no leftover ads/nav cruft)
- [ ] Highlight a passage → highlight persists after closing and reopening the article
- [ ] Add an annotation/note to a highlight → saves and displays correctly
- [ ] Tag a highlight → tag appears in Cards and in the tag filter
- [ ] Edit/delete an existing highlight and its note
- [ ] TTS: play, pause, word-sync highlighting tracks correctly, works across a full article without stalling
- [ ] AI summary: works for a free-tier user, respects the daily limit, shows a clear upgrade message once hit
- [ ] YouTube video → transcript-based summary works if that's wired up
- [ ] Export a highlight (Markdown / Obsidian format) and confirm the output is well-formed
- [ ] Back button / gesture-back closes the article instead of exiting the app (recently fixed — verify on real hardware, not just devtools device emulation)

## 6. Cards (spaced repetition / knowledge browsing)

- [ ] All highlighted+tagged passages show up as cards
- [ ] Browsing by tag/theme actually groups related cards sensibly
- [ ] No stray rendered characters/artifacts on card items (recently fixed a stray `)` — re-verify visually)
- [ ] Edit annotation directly from a card
- [ ] Delete a card
- [ ] Review page: due cards surface correctly, grading (again/hard/good/easy or equivalent) updates the next-review date
- [ ] Today page reflects actual due/recent activity correctly

## 7. Plan & billing (Stripe)

- [ ] Free tier limits are enforced (feed count, AI summaries/day) and messaging is clear about what's gated
- [ ] Upgrade to Pro → Stripe checkout opens, test card `4242 4242 4242 4242` completes, plan updates to Pro in-app
- [ ] `invoice.payment_failed` test card (`4000 0000 0000 0341`) is handled gracefully, doesn't silently break the account
- [ ] Manage billing → Stripe customer portal opens, cancel works, plan reflects downgrade after webhook fires
- [ ] Annual pricing option (if added) checks out correctly
- [ ] Switched Stripe to live mode, live webhook registered, one real low-amount charge confirmed end-to-end

## 8. Cross-theme / cross-device

- [ ] All three themes (Dark / Light / Distilled) — spot-check Inbox, Reader, Cards, Settings in each for contrast/readability issues
- [ ] Mobile Safari (iOS) — full core loop: add feed, read, highlight, annotate, tag
- [ ] Mobile Chrome (Android) — same core loop
- [ ] Desktop Chrome, Firefox, Safari — same core loop
- [ ] Tablet / iPad — layout doesn't break at the mid-size breakpoint
- [ ] PWA install banner appears appropriately and installed app opens correctly (icon, splash screen, no stray portrait lock — recently fixed, verify orientation actually rotates on a tablet)
- [ ] Inputs that were bumped to 16px (tag input, add-source fields) actually no longer trigger iOS Safari auto-zoom — verify on a real iPhone, not simulator
- [ ] Keyboard shortcuts (J/K, O, R, /, L, S, A, Esc) all work as documented in the Sidebar's shortcut list

## 9. Accessibility & performance

- [ ] Keyboard-only navigation can reach and operate every primary action (no mouse)
- [ ] Screen reader spot-check on Inbox and Reader (VoiceOver or NVDA) — labels make sense
- [ ] Run `npm run perf` and compare against `scripts/perf-history.json` baseline — flag any regression, and refresh the baseline if it's stale (last one on record predates this round of changes)
- [ ] No console errors on a clean load of Inbox, Reader, Cards, Review, Settings
- [ ] Lighthouse accessibility score holds steady (was 100 as of the last recorded run — don't let it slip)

## 10. Edge cases that break demos

- [ ] Empty states: brand-new account with zero feeds — Inbox, Cards, Review, Today all show sensible empty states, not blank/broken screens
- [ ] Feed that returns malformed/broken RSS — fails gracefully, doesn't crash the Inbox
- [ ] Very long article (10k+ words) — reader doesn't choke, TTS doesn't desync
- [ ] Article with no images / all images broken — layout holds
- [ ] Slow network (throttle to 3G in devtools) — loading states appear, nothing silently hangs forever
- [ ] Offline — cached content (via `feedCache.js`) still readable; app doesn't hard-crash

---

## Sign-off

- [ ] Every section above checked on **at least one** real mobile device (not just devtools emulation)
- [ ] A friend/colleague who has never seen the app completes signup → add feed → highlight → annotate unaided, with no hints from you
- [ ] Changelog and AGENT_LOG entries are current for whatever fixes came out of this pass
