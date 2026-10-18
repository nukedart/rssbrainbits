# Feedbox — Master Work List

Derived from `docs/GAP_SHEET.md`. Status: `todo` · `running` · `review` · `done` · `blocked`.
Workers have disjoint write sets. Orchestrator reviews every diff before accepting.

| ID | Sprint | Task | Agent / model | Write set | Status |
|---|---|---|---|---|---|
| T1 | 1 | Unit tests for `exportUtils.js` (existing fns) and other untested pure logic in `src/lib/` | qa-style worker / sonnet | `src/lib/*.test.js` (new files only) | done |
| T2 | 1 | Signed-in functional test of all primary screens | — | — | blocked: needs Pedro to sign in |
| T3 | 2 | Onboarding step explaining Highlight → Tag → Review | frontend / sonnet | `src/components/Onboarding.jsx` | done |
| T4 | 2 | Tag management: rename / merge / delete a tag across all highlights | frontend + backend / sonnet | `src/lib/supabase.js`, `src/pages/CardsPage.jsx` | done |
| T5 | 3 | "Export all highlights" (Markdown/Obsidian) in Settings | frontend / sonnet | `src/lib/exportUtils.js`, `src/pages/SecondaryPages.jsx` | done |
| T6 | 3 | Spacing + typography pass with screenshots | — | — | blocked: needs signed-in browser |
| T7 | 4 | User interviews, free-tier review | Pedro | — | todo |

Integration gate (orchestrator): `npm test` + `npx vite build`, changelog entry, then deploy only on Pedro's say-so.
