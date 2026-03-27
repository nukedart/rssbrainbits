# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Local dev server (Vite HMR, port 5173)
npm run build        # Production build → dist/ (also writes dist/stats.html bundle report)
npm run preview      # Preview built dist/ locally

npm run deploy       # Patch version bump → build → git push → GitHub Actions deploys
npm run deploy:minor # Minor version bump + deploy
npm run deploy:major # Major version bump + deploy
npm run deploy:dry   # Show what deploy would do, no push
npm run deploy:local # Build only, no git push

npm test             # Run all Vitest unit tests (fast, no browser)
npm run test:watch   # Watch mode for TDD
npm run test:coverage # Coverage report for src/lib/ and src/hooks/
npm run perf         # Build + Lighthouse audit → prints score card, saves scripts/perf-history.json
npm run perf:live    # Lighthouse audit against live rss.brainbits.us (no build)
npm run analyze      # Build + open bundle visualizer (dist/stats.html)
```

## Agent Skills (slash commands)

Type these in the chat to trigger focused agent workflows:

| Command | What it does |
|---|---|
| `/iterate` | Full autonomous loop: audit → pick one issue → fix → test → deploy |
| `/perf` | Performance-only audit: bundle sizes + Lighthouse trend + top wins |
| `/nav` | Navigation UX audit: consistency, coverage, mobile overflow, labels |
| `/polish` | Visual audit: hardcoded colors, spacing, radius, theme consistency |
| `/ux` | UX/UI improvement loop: tap targets, accessibility, empty states, micro-interactions |

## Token efficiency rules (agent must follow)

- **Read files only when needed** — use Grep to find patterns before opening files
- **Prefer Edit over Write** — sends only the diff, not the full file
- **One issue per iteration** — no compound PRs
- **Always run `npm test` before deploying** — catch regressions early
- **Check `scripts/perf-history.json`** before performance work to know baseline
- After each session, note the `/cost` value in the session summary

## Architecture

**Single-page React app** (Vite) deployed to GitHub Pages. Backend is entirely Supabase (auth + PostgreSQL + Edge Functions). No traditional server.

### Routing
`App.jsx` manages routing via React state (`currentPage`), not React Router. Pages are `React.lazy`-loaded. Navigation is driven by Sidebar (desktop) and BottomNav (mobile).

### Data flow
- **Feeds** are stored in Supabase `feeds` table; RSS content is fetched client-side via a race between three CORS proxies (`corsproxy.io`, `allorigins.win`, `codetabs.com`) with results cached in `localStorage` via `feedCache.js`.
- **Auth** lives in `useAuth.jsx` (Supabase Auth context). All DB queries go through `src/lib/supabase.js`, which wraps the Supabase client with helper functions.
- **AI summaries** call Anthropic Claude Haiku either directly (`VITE_ANTHROPIC_API_KEY`) or via an optional Cloudflare Worker proxy (`VITE_PROXY_URL`). Logic is in `fetchers.js`.
- **Article reading** uses Mozilla Readability for clean extraction; full-screen reading is `ContentViewer.jsx`.
- **TTS** uses the browser Web Speech API with word-sync via `onboundary` events.

### Key files
| File | Role |
|---|---|
| `src/App.jsx` | App shell, routing, global modals |
| `src/lib/supabase.js` | All Supabase DB queries and auth wrappers |
| `src/lib/fetchers.js` | RSS fetch, article extraction, AI summary, YouTube transcript |
| `src/hooks/useAuth.jsx` | Auth context (sign in/out, user state) |
| `src/hooks/useTheme.jsx` | Theme context (Dark/Light/Distilled), CSS variable injection |
| `src/components/ContentViewer.jsx` | Full-screen article reader (highlights, TTS, notes) |
| `src/pages/InboxPage.jsx` | Feed list, filtering, smart feeds, search |
| `src/pages/SecondaryPages.jsx` | History, Saved, Settings, Manage Feeds |
| `src/lib/plan.js` | Freemium plan checking |
| `src/lib/tokens.js` | Design system color tokens for all three themes |
| `supabase/functions/` | Edge Functions: summarize, Stripe checkout/portal/webhook |
| `cloudflare-worker/worker.js` | Optional CORS proxy + Anthropic relay |

### Database
Schema is in `supabase-schema.sql`. All tables use Row-Level Security — users only see their own rows. Key tables: `feeds`, `history`, `saved`, `highlights`, `article_tags`, `read_items`, `smart_feeds`, `folders`.

### Environment variables
```
VITE_SUPABASE_URL        # Required
VITE_SUPABASE_ANON_KEY   # Required
VITE_ANTHROPIC_API_KEY   # Optional: direct AI summaries
VITE_PROXY_URL           # Optional: Cloudflare Worker proxy URL
```

Supabase Edge Functions need server-side secrets (`STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) set via `supabase secrets set`.

### Deployment
Push to `main` triggers GitHub Actions (`.github/workflows/main.yml`), which builds with env vars and deploys to GitHub Pages. The `deploy.sh` script handles version bumping in `package.json`, `CHANGELOG.md`, and inline source before pushing.
