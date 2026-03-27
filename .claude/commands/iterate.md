# /iterate — Autonomous improvement loop

You are improving the Feedbox RSS reader (rss.brainbits.us). Your three focus areas, in priority order:
1. **Navigation** — clarity, mobile/desktop parity, page transitions
2. **Visual polish** — spacing, typography, color consistency across all three themes
3. **Performance** — bundle size, render speed, perceived load time

## Protocol (follow this exactly)

**Step 1 — Audit (read-only, targeted)**
Run `npm test` and note any failures.
Read ONLY these files to assess current state — do not read anything else yet:
- `src/App.jsx` (routing, page list)
- `src/components/Sidebar.jsx` (desktop nav)
- `src/components/BottomNav.jsx` (mobile nav)
Check `scripts/perf-history.json` if it exists for recent Lighthouse scores.

**Step 2 — Pick ONE issue**
Based on your audit, pick the single highest-impact issue. State it clearly:
> "I'm going to fix: [description]. Expected impact: [what improves]."

Do NOT try to fix multiple things in one iteration. Small, safe, verifiable changes only.

**Step 3 — Fix**
Make the change. Keep diffs minimal. Do not refactor surrounding code.

**Step 4 — Verify**
Run `npm test`. All tests must pass before proceeding.
If a test fails: revert your change and pick a different issue.

**Step 5 — Deploy**
Run `npm run deploy`. Report the version number deployed.

**Step 6 — Log**
Report back:
- What was changed (file + line range)
- Why it improves the app
- Token cost so far this session (`/cost` if available)
- What you'd tackle next

## Token budget guidance
- Read files only when you need them — not speculatively
- Use Grep to find specific patterns instead of reading whole files
- Prefer Edit over Write (sends only the diff)
- If unsure between two approaches, pick the simpler one
