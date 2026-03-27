/**
 * Lighthouse performance audit script.
 *
 * Usage:
 *   npm run perf          — builds dist/, audits it via vite preview
 *   npm run perf:live     — audits the live site at rss.brainbits.us (no build)
 *
 * Scores are written to scripts/perf-history.json so the agent can track
 * regression over time.
 */

import { execSync, spawn } from "child_process";
import { createServer } from "net";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, "..");
const HISTORY_FILE = join(__dir, "perf-history.json");
const LIVE_URL = "https://rss.brainbits.us";

const isLive = process.argv.includes("--live");

// ── helpers ──────────────────────────────────────────────────
function findFreePort() {
  return new Promise(resolve => {
    const srv = createServer();
    srv.listen(0, () => { const p = srv.address().port; srv.close(() => resolve(p)); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function score(val) {
  const n = Math.round(val * 100);
  const color = n >= 90 ? "\x1b[32m" : n >= 50 ? "\x1b[33m" : "\x1b[31m";
  return `${color}${n}\x1b[0m`;
}

// ── main ─────────────────────────────────────────────────────
async function run() {
  let url = LIVE_URL;
  let previewProc = null;
  let port = null;

  if (!isLive) {
    // Build first
    console.log("\x1b[2m⬡ Building dist/…\x1b[0m");
    try { execSync("npm run build", { cwd: ROOT, stdio: "pipe" }); }
    catch (e) { console.error("Build failed:\n" + e.stderr?.toString()); process.exit(1); }

    port = await findFreePort();
    previewProc = spawn("npx", ["vite", "preview", "--port", String(port)], { cwd: ROOT, stdio: "pipe" });
    url = `http://localhost:${port}`;
    await sleep(1500); // let preview start
  }

  console.log(`\n\x1b[1m⚡ Lighthouse audit → ${url}\x1b[0m\n`);

  const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless", "--no-sandbox"] });

  const result = await lighthouse(url, {
    port: chrome.port,
    output: "json",
    logLevel: "error",
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    settings: { throttlingMethod: "simulate", screenEmulation: { mobile: false } },
  });

  await chrome.kill();
  if (previewProc) previewProc.kill();

  const cats = result.lhr.categories;
  const scores = {
    performance:    cats.performance?.score    ?? 0,
    accessibility:  cats.accessibility?.score  ?? 0,
    bestPractices:  cats["best-practices"]?.score ?? 0,
    seo:            cats.seo?.score            ?? 0,
  };

  // Print score card
  console.log("┌──────────────────────┬───────┐");
  console.log(`│ Performance          │  ${score(scores.performance).padEnd(11)}│`);
  console.log(`│ Accessibility        │  ${score(scores.accessibility).padEnd(11)}│`);
  console.log(`│ Best Practices       │  ${score(scores.bestPractices).padEnd(11)}│`);
  console.log(`│ SEO                  │  ${score(scores.seo).padEnd(11)}│`);
  console.log("└──────────────────────┴───────┘");

  // Top opportunities
  const audits = Object.values(result.lhr.audits)
    .filter(a => a.score !== null && a.score < 0.9 && a.details?.type === "opportunity")
    .sort((a, b) => (b.details?.overallSavingsMs ?? 0) - (a.details?.overallSavingsMs ?? 0))
    .slice(0, 5);

  if (audits.length) {
    console.log("\n\x1b[33mTop opportunities:\x1b[0m");
    audits.forEach(a => {
      const ms = a.details?.overallSavingsMs ? ` (save ~${Math.round(a.details.overallSavingsMs)}ms)` : "";
      console.log(`  • ${a.title}${ms}`);
    });
  }

  // Persist history
  const entry = { date: new Date().toISOString().slice(0, 10), url, ...scores };
  const history = existsSync(HISTORY_FILE)
    ? JSON.parse(readFileSync(HISTORY_FILE, "utf8"))
    : [];
  history.push(entry);
  writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(-30), null, 2)); // keep last 30 runs
  console.log(`\n\x1b[2mHistory saved → scripts/perf-history.json (${history.length} entries)\x1b[0m\n`);

  // Exit non-zero if performance < 70
  if (scores.performance < 0.70) {
    console.error("\x1b[31m✗ Performance score below 70 threshold\x1b[0m");
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
