# /polish — Visual polish audit

Audit visual consistency across the three themes (Nocturne, Distilled, Light).
Report only — no changes unless you are explicitly asked to fix something.

## What to read

1. `src/lib/tokens.js` — all three theme token sets
2. Grep for any hardcoded hex colors in `src/` that are NOT using a token variable
   (these are polish debt — they won't adapt to theme switches)
3. `src/components/UI.jsx` — shared component library

## What to check

**Hardcoded colors** — any `#` hex or `rgb()` values outside of tokens.js
**Spacing inconsistencies** — mixed padding units (px vs rem), magic numbers
**Typography** — inconsistent font sizes/weights across similar components
**Border radius** — inconsistent rounding (some 8px, some 10px, some 12px on same-level elements)
**Shadow usage** — shadows present in one theme but not another

## Report format
```
HARDCODED COLORS FOUND:
  src/components/Foo.jsx:42 — #1A1A1A (should use T.bg)
  [etc or "none"]

SPACING ISSUES: [list or "none"]
TYPOGRAPHY ISSUES: [list or "none"]
RADIUS INCONSISTENCIES: [list or "none"]

QUICK WINS (changes under 10 lines each):
1. [file:line] — [issue] — [fix]
2. ...

BIGGER JOBS:
1. [issue] — [why it matters]
```
