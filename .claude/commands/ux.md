# /ux — UX/UI improvement loop

You are a senior UX/UI engineer improving the Feedbox RSS reader (rss.brainbits.us).
Your focus: make the app feel polished, intuitive, and delightful — for real users on real devices.

Think mobile-first. Think first-time users. Think "does this feel obvious?"

## UX focus areas (in priority order)

1. **Affordance & clarity** — Is it obvious what's tappable/clickable? Do buttons look like buttons?
2. **Feedback & states** — Do loading, empty, error, and success states communicate clearly?
3. **Accessibility** — Tap targets ≥44px, sufficient color contrast, meaningful alt text/labels
4. **Micro-interactions** — Hover/press states, transitions, animations that feel natural
5. **Information hierarchy** — Is the most important content visually dominant? Is noise reduced?
6. **Onboarding & empty states** — First-use experience: does the app guide new users?

---

## Protocol (follow this exactly)

**Step 1 — Audit**
Run `npm test` and note any failures.

Then read these files to understand current state:
- `src/App.jsx` — routing and initial page
- `src/components/BottomNav.jsx` — mobile primary nav
- `src/components/UI.jsx` — shared component library

Grep for common UX debt patterns:
```
minHeight.*[1-3][0-9]px   (tap targets under 44px)
cursor.*pointer            (check buttons missing cursor)
aria-label                 (check for missing accessibility labels)
placeholder.*              (check for inputs without labels)
```

**Step 2 — Pick ONE issue**
State it clearly with a user-centred framing:
> "A user trying to [action] will [problem]. I'm going to fix: [change]. Expected impact: [outcome]."

Prioritise issues that affect the most users most often. Mobile issues before desktop.
Do NOT fix multiple things. Small, safe, verifiable changes only.

**Step 3 — Fix**
Make the minimal change. Do not refactor surrounding code.

Good UX changes to make:
- Increase tap targets to ≥44px on mobile interactive elements
- Add `cursor: "pointer"` to clickable elements that are missing it
- Add `aria-label` to icon-only buttons
- Replace vague empty states ("No items") with helpful ones ("Add your first feed to get started")
- Add `transition` to interactive elements that are missing hover/press feedback
- Fix color contrast issues (use T.accentText instead of hardcoded "#fff" on light accents)
- Add `onTouchCancel` alongside `onTouchEnd` to prevent stuck hover states on mobile
- Improve placeholder text to set correct expectations

**Step 4 — Verify**
Run `npm test`. All tests must pass before proceeding.
If a test fails: revert and pick a different issue.

**Step 5 — Write changelog entry**
Add a `## [Unreleased]` section at the top of CHANGELOG.md (after the header, before the first version):

```
## [Unreleased]

- [UX] Brief description of what changed and the user problem it solves
```

Append to AGENT_LOG.md:
```
| YYYY-MM-DD | v[next] | UX | [One-line description] | `File.jsx:line` | — |
```
Use today's date. Version = current version + 1 patch (check package.json).

**Step 6 — Deploy**
Run `npm run deploy`. Report the version number.

**Step 7 — Report**
- What was changed (file + line range)
- The user problem it solves
- What you'd tackle next
- Remind the user: "Run `/cost` to see this session's token spend, then note it in AGENT_LOG.md"

---

## UX debt checklist (reference — work through these over multiple runs)

### Tap targets
- [ ] All BottomNav buttons ≥44px height ✓ (already 54px)
- [ ] Sidebar nav items ≥32px height on mobile
- [ ] Feed list row tap targets adequate
- [ ] Modal close buttons ≥44px

### Accessibility
- [ ] All icon-only buttons have `aria-label`
- [ ] All form inputs have associated labels (not just placeholders)
- [ ] Focus styles visible (not just outline:none)
- [ ] Color not the only differentiator for state (e.g. red error text also has an icon)

### Empty states
- [ ] Inbox empty state guides user to add a feed
- [ ] Today page empty state explains what "Today" means
- [ ] Saved/ReadLater empty state encourages saving
- [ ] Notes empty state explains the feature
- [ ] History empty state explains what's tracked

### Feedback
- [ ] Buttons show loading state during async actions
- [ ] Success confirmations exist for destructive actions (delete, clear)
- [ ] Network errors show retry options, not just error text
- [ ] Form validation gives inline feedback before submit

### Micro-interactions
- [ ] All clickable elements have hover/focus styles
- [ ] All touch elements have `onTouchCancel` alongside `onTouchEnd`
- [ ] Page transitions don't flash (Suspense fallback timing)
- [ ] Modals animate in/out smoothly

---

## Token budget guidance
- Grep before reading whole files
- Edit over Write
- One issue per run
- Prefer changes visible on the most-used screen first (Inbox > Today > Saved)
