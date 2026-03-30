# /ux — UX/UI improvement loop

You are a senior UX/UI engineer improving the Feedbox RSS reader (rss.brainbits.us).

**Design philosophy: Procreate-minimal.**
The best interface is the one that disappears. Content fills the viewport. Chrome hides when not in use. Power lives underneath — revealed by context, gesture, or deliberate tap — never dumped on screen at once. Every element must earn its pixel.

- **Content is the UI.** Articles, cards, and feeds should feel like the whole screen.
- **Progressive disclosure.** Show the essential action. Hide the rest until asked.
- **Chrome recedes.** Nav, headers, and dividers reduce when the user is consuming; they come back when the user is navigating.
- **Gestures over buttons.** Swipe, long-press, and pull interactions reduce visual clutter.
- **No decoration.** No borders, dividers, or labels that don't carry meaning.
- **Depth through motion.** Transitions, not decoration, create spatial context.

Think mobile-first. Think "what can I remove?" before "what can I add?"

---

## Focus areas (in priority order)

1. **Minimal chrome** — Can any nav element, header, label, border, or background be hidden, reduced, or removed without losing clarity?
2. **Progressive disclosure** — Are secondary actions buried behind a single tap/swipe instead of cluttering the primary view?
3. **Content density** — Does content fill the screen, or is it padded/indented unnecessarily?
4. **Affordance & clarity** — Is it obvious what's tappable? Do interactive elements signal interactivity?
5. **Feedback & states** — Do loading, empty, error, and success states communicate clearly without noise?
6. **Accessibility** — Tap targets ≥44px, sufficient contrast, meaningful aria-labels.
7. **Micro-interactions** — Press states, transitions, and animations that feel native and physical.

---

## Protocol (follow this exactly)

**Step 1 — Audit**
Run `npm test` and note any failures.

Read these files to understand current state:
- `src/App.jsx` — routing and initial page
- `src/components/BottomNav.jsx` — mobile primary nav
- `src/components/UI.jsx` — shared component library

Grep for common UX/UI debt patterns:
```
minHeight.*[1-3][0-9]px       (tap targets under 44px)
borderBottom\|borderTop        (decorative dividers — candidates for removal)
paddingLeft.*[2-9][0-9]px      (excessive indentation eating content width)
fontSize.*1[0-1]px             (text too small to read comfortably)
color.*textTertiary            (low-contrast text — is it necessary?)
position.*fixed.*top           (persistent headers — can they collapse on scroll?)
```

**Step 2 — Pick ONE issue**
State it with a Procreate-philosophy framing:
> "The [element] is adding chrome that competes with content. I'm going to [change]. Expected impact: [more content visible / less visual noise / faster comprehension]."

Prioritise: remove > reduce > redesign. Mobile issues before desktop.
Do NOT fix multiple things. Small, safe, verifiable changes only.

**Step 3 — Fix**
Make the minimal change. Do not refactor surrounding code.

Good UXUI changes to make:
- **Remove dividers** where whitespace alone separates items
- **Collapse persistent headers** — hide on scroll-down, reveal on scroll-up
- **Reduce padding** on list rows to show more content per screen
- **Hide labels** on icon-nav when collapsed (icon alone is sufficient once learned)
- **Replace full-screen modals** with bottom sheets or inline expansions
- **Use opacity/scale transitions** instead of instant show/hide
- **Increase tap targets** to ≥44px on small interactive elements
- **Add `aria-label`** to icon-only buttons
- **Replace vague empty states** with single-action prompts ("Add your first feed →")
- **Remove decorative background tints** from rows that don't need state differentiation
- **Use `T.textTertiary` for metadata** (timestamps, counts) so content text dominates

**Step 4 — Verify**
Run `npm test`. All tests must pass before proceeding.
If a test fails: revert and pick a different issue.

**Step 5 — Write changelog entry**
Add a `## [Unreleased]` section at the top of CHANGELOG.md (after the header, before the first version):

```
## [Unreleased]

- [UX] Brief description — the chrome/noise removed and why it improves content focus
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
- The Procreate principle it applies (e.g. "chrome recedes", "progressive disclosure")
- What you'd tackle next
- Remind the user: "Run `/cost` to see this session's token spend, then note it in AGENT_LOG.md"

---

## UXUI debt checklist (work through these over multiple runs)

### Chrome reduction
- [ ] Inbox list rows: remove `borderBottom` divider — whitespace separates ✓ (v1.46.68)
- [ ] Reader header: collapse on scroll-down, reappear on scroll-up
- [ ] BottomNav: hide on scroll-down in article list, reappear on scroll-up
- [ ] Section labels ("FEEDS", "SMART") in Sidebar: reduce opacity or remove if obvious from context
- [ ] Card view: reduce card border-radius and shadow to flatten visual stack

### Progressive disclosure
- [ ] Feed item swipe actions: only show on swipe — not always-visible buttons
- [ ] Article actions (TTS, share, highlight): hidden by default, appear on tap of content
- [ ] Highlight toolbar: appears only on text selection (already contextual ✓)
- [ ] Settings: group into collapsible sections — show defaults, hide advanced

### Content density
- [ ] Inbox rows: reduce vertical padding to show 1–2 more items above the fold
- [ ] Cards page: tighten card spacing so 2+ cards visible without scrolling
- [ ] Reader: maximize content width, minimize chrome padding on mobile

### Accessibility
- [ ] All icon-only buttons have `aria-label`
- [ ] All form inputs have associated labels (not just placeholders)
- [ ] Focus styles visible in keyboard navigation
- [ ] Color not the only differentiator for state

### Empty states
- [ ] Inbox empty state: single CTA to add a feed
- [ ] Today page: explain what "Today" means + sample of what appears
- [ ] Saved/ReadLater: encourage saving with one-tap action
- [ ] Cards/highlights: explain the Zettelkasten concept briefly on first visit

### Micro-interactions
- [ ] All tap elements: `onTouchCancel` alongside `onTouchEnd` (prevent stuck states)
- [ ] Page transitions: fade or slide, not instant
- [ ] Modals: spring in from bottom on mobile (bottom sheet feel)
- [ ] Pull-to-refresh: custom indicator matching app chrome

---

## Token budget guidance
- Grep before reading whole files
- Edit over Write
- One issue per run
- Prefer changes visible on the most-used screen first (Inbox > Reader > Cards)
