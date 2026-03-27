# /nav — Navigation audit

Audit the app's navigation UX. Report only — no changes.

## What to read (in this order, stop when you have enough)

1. `src/App.jsx` — page list, routing logic, initial page logic
2. `src/components/Sidebar.jsx` — desktop nav items and active state
3. `src/components/BottomNav.jsx` — mobile nav items

## What to check

**Consistency**
- Do Sidebar and BottomNav show the same pages? (they should for shared pages)
- Are active states highlighted identically in both?
- Are icon + label pairs the same between mobile/desktop?

**Coverage**
- Are all VALID_PAGES reachable from the nav?
- Any pages only reachable from deep in the UI that should be in the nav?

**Mobile UX**
- Are there more than 5 items in BottomNav? (thumb reach problem)
- Is there a "more" overflow for less-used pages?

**Labels**
- Are page labels clear and consistent (no "Manage Feeds" vs "Feeds" inconsistency)?

## Report format
```
CONSISTENCY ISSUES: [list or "none"]
MISSING FROM NAV: [list or "none"]
MOBILE OVERFLOW: [yes/no + details]
LABEL INCONSISTENCIES: [list or "none"]
TOP RECOMMENDATION: [one change with highest UX impact]
```
