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

**Step 5 — Write changelog entry**
Before deploying, write a `## [Unreleased]` section at the top of CHANGELOG.md (after the header block, before the first versioned entry). The deploy script will promote it to the real version number automatically.

Format:
```
## [Unreleased]

- [Area] Brief description of what changed and why it improves the app
```

Area is one of: Nav, Polish, Perf, Fix, Feature

Also append a new row to AGENT_LOG.md in this format:
```
| YYYY-MM-DD | v[next] | [Area] | [One-line description] | `File.jsx:line` | — |
```
Use today's date. The version will be the current version + 1 patch (check package.json).

**Step 6 — Deploy**
Run `npm run deploy`. Report the version number deployed.

**Step 7 — Log**
Report back:
- What was changed (file + line range)
- Why it improves the app
- What you'd tackle next
- Remind the user: "Run `/cost` to see this session's token spend, then note it in AGENT_LOG.md"

## Pausing and resuming
When stopping for the day, all state is in git — no special cleanup needed.
When resuming, check `git log --oneline -5` and `AGENT_LOG.md` to understand what was done last.

## Token budget guidance
- Read files only when you need them — not speculatively
- Use Grep to find specific patterns instead of reading whole files
- Prefer Edit over Write (sends only the diff)
- If unsure between two approaches, pick the simpler one
