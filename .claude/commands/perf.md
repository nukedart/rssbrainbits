# /perf — Performance audit

Run a focused performance audit. Do not make changes — report only.

## Steps

1. Run `npm run build` and capture the chunk sizes from terminal output.
   Look for chunks over 50 kB gzipped — those are candidates for lazy-loading.

2. Check `scripts/perf-history.json` for recent Lighthouse trend (improving or regressing?).

3. Read `src/App.jsx` lines 1–60 to check which pages are React.lazy-loaded vs. eagerly imported.

4. Run `npm test` — confirm no regressions.

5. Report a prioritized list:
   ```
   BUNDLE (from build output):
     vendor-react     XX kB gz
     vendor-supabase  XX kB gz
     main             XX kB gz
     [etc]

   LIGHTHOUSE TREND: [last 3 scores or "no history yet"]

   TOP 3 PERF WINS (in order of impact):
   1. [issue] — [fix approach] — [estimated impact]
   2. ...
   3. ...

   RECOMMENDED NEXT ITERATION: [one specific fix to tackle]
   ```

Keep the report concise. No code changes in this command.
