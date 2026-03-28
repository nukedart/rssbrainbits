# /features — Competitive feature gap analysis

You are a product researcher and engineer for Feedbox (rss.brainbits.us), a personal RSS reader.
Your job: identify features that top RSS reader apps have that Feedbox is missing or could do better — and produce a prioritized, actionable backlog.

Think like a power user who has tried every major RSS app. Think about what makes people stay with Feedly or switch to Reeder. What's the one thing users tweet about loving?

---

## Step 1 — Understand Feedbox's current feature set

Read these files to build a complete picture of what Feedbox already does:
- `src/App.jsx` — page list and routing (what pages/sections exist)
- `src/pages/InboxPage.jsx` lines 1–80 — filtering, smart feeds, search
- `src/pages/SecondaryPages.jsx` lines 1–80 — Settings, ManageFeeds, History, ReadLater sections
- `src/pages/TodayPage.jsx` lines 1–60 — Today digest logic
- `src/components/ContentViewer.jsx` lines 1–60 — reader features (TTS, highlights, notes)

Summarize what Feedbox currently offers in a compact bullet list before proceeding.

---

## Step 2 — Research competitors

Use WebSearch to look up recent feature comparisons for these apps. Search for:
- `"Feedly" features 2024 2025`
- `"Inoreader" features 2024 2025`
- `"Reeder 5" OR "Reeder." features`
- `"NetNewsWire" features`
- `"Readwise Reader" features`
- `RSS reader comparison 2024 2025 best features`

For each app, extract the standout features — things users specifically praise or that differentiate the app. Ignore generic features (reading articles, adding feeds) that every app has.

---

## Step 3 — Gap analysis

Cross-reference the competitor features against Feedbox's current feature set.
Categorize each gap as:
- **Missing entirely** — Feedbox has nothing like it
- **Partial** — Feedbox has a version but it's less capable
- **Already covered** — Feedbox does this well

---

## Step 4 — Prioritize

Score each gap on two axes:
- **User value** (1–5): How much do users want/need this?
- **Build effort** (S/M/L/XL): How complex to implement in this React/Supabase stack?

Focus on HIGH value + SMALL/MEDIUM effort wins first ("quick wins").

---

## Report format

```
## FEEDBOX CURRENT FEATURES
[compact bullet list]

## COMPETITOR STANDOUT FEATURES

### Feedly
- [feature] — [why users love it]

### Inoreader
- [feature] — [why users love it]

### Reeder / NetNewsWire
- [feature] — [why users love it]

### Readwise Reader
- [feature] — [why users love it]

## GAP ANALYSIS

### Quick Wins (High value, S/M effort)
| Feature | From | Value | Effort | Notes |
|---------|------|-------|--------|-------|
| [feature] | [app] | ⭐⭐⭐⭐⭐ | S | [brief implementation note] |

### Worth Building (High value, L effort)
| Feature | From | Value | Effort | Notes |
|---------|------|-------|--------|-------|

### Nice to Have (Medium value, S effort)
| Feature | From | Value | Effort | Notes |
|---------|------|-------|--------|-------|

### Skip (Low value or conflicts with Feedbox's direction)
- [feature] — [why skip]

## TOP 3 RECOMMENDATIONS
1. [Feature] — [one sentence on why this is the highest-priority addition]
2. [Feature] — [one sentence]
3. [Feature] — [one sentence]

## NEXT STEP
If you want to implement any of these, run `/iterate` and reference this report.
To add a feature to the backlog, append it to BACKLOG.md (create if it doesn't exist).
```

---

## Important notes

- Do NOT make any code changes — this is research and reporting only.
- Be specific about implementation: "add a keyboard shortcut `j/k` to navigate articles" is better than "improve keyboard navigation."
- Consider the stack: React SPA, Supabase backend, no server-side rendering. Some features (server-side full-text search, push notifications) require specific infrastructure.
- Feedbox is a personal/indie app — deprioritize enterprise features (team sharing, SSO, audit logs).
- Flag any feature that requires a new Supabase table or Edge Function so the user knows the scope upfront.
