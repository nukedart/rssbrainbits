/**
 * Feedbox CORS Proxy + AI Summarizer — Cloudflare Worker
 * ────────────────────────────────────────────────────────
 * Two endpoints:
 *   GET  ?url=...        → CORS proxy for RSS feeds
 *   POST /summarize      → AI article summary via Claude Haiku
 *
 * Secrets (set via `wrangler secret put` or Dashboard):
 *   ANTHROPIC_API_KEY    → required for /summarize
 *
 * Free tier: 100,000 requests/day, 10ms CPU/request — plenty for RSS.
 *
 * Deploy:
 *   1. npx wrangler login
 *   2. npx wrangler secret put ANTHROPIC_API_KEY
 *   3. npx wrangler deploy
 *   OR paste into Cloudflare Dashboard → Workers → Create Worker
 *
 * After deploy, set VITE_PROXY_URL=https://feedbox-proxy.<your-subdomain>.workers.dev
 * in your GitHub repo secrets and .env.local
 */

const ALLOWED_ORIGIN = "https://rss.brainbits.us"; // your app domain

// Content types we'll actually proxy (RSS, XML, HTML for discovery)
const ALLOWED_CONTENT = ["xml", "rss", "atom", "html", "text", "json"];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    // ── CORS preflight ───────────────────────────────────────
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    // ── Route: POST /summarize ───────────────────────────────
    if (request.method === "POST" && url.pathname === "/summarize") {
      return handleSummarize(request, env, origin);
    }

    // ── Route: GET ?url= (CORS proxy) ───────────────────────
    if (request.method === "GET") {
      return handleProxy(request, env, origin, url);
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders(origin) });
  },
};

// ── AI Summarizer ─────────────────────────────────────────────
async function handleSummarize(request, env, origin) {
  const headers = corsHeaders(origin);

  // Validate API key is configured
  if (!env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured on worker" }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  const { text, title, style = "keypoints" } = body;
  if (!text) {
    return new Response(
      JSON.stringify({ error: "Missing 'text' field" }),
      { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  const PROMPTS = {
    keypoints: `Summarize the following article in 3–5 clear bullet points. Write in plain text only — no markdown, no asterisks, no bold. Each bullet must start with "•" and be a complete, insightful sentence.`,
    brief:     `Give a 1–2 sentence TL;DR of the following article. Write in plain text only — no markdown, no formatting.`,
    detailed:  `Summarize the following article in 6–8 detailed bullet points covering all key ideas, data, and conclusions. Write in plain text only. Each bullet must start with "•" and be a complete sentence.`,
  };
  const prompt = PROMPTS[style] || PROMPTS.keypoints;
  const maxTokens = style === "detailed" ? 1500 : 800;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: maxTokens,
        messages: [{
          role: "user",
          content: `You are a reading assistant. ${prompt}\n\nTitle: "${title || "Untitled"}"\n\nArticle:\n${text.slice(0, 6000)}`,
        }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: data.error?.message || "Anthropic API error", status: response.status }),
        { status: 502, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const summary = data.content?.[0]?.text || "Could not generate summary.";
    return new Response(
      JSON.stringify({ summary }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Summarization failed: ${err.message}` }),
      { status: 502, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
}

// ── CORS Proxy ────────────────────────────────────────────────
async function handleProxy(request, env, origin, url) {
  const target = url.searchParams.get("url");

  if (!target) {
    return new Response("Missing ?url= parameter", { status: 400 });
  }

  // Validate target URL
  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }

  // Only allow http/https
  if (!["http:", "https:"].includes(targetUrl.protocol)) {
    return new Response("Only http/https allowed", { status: 400 });
  }

  // Block private/internal IPs (SSRF protection)
  const host = targetUrl.hostname;
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    host.startsWith("172.16.") ||
    host.endsWith(".local")
  ) {
    return new Response("Private addresses not allowed", { status: 400 });
  }

  // Fetch the target
  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Feedbox/1.0; +https://rss.brainbits.us)",
        Accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    const contentType = response.headers.get("Content-Type") || "";
    const body = await response.text();

    if (!body.trim()) {
      return new Response("Empty response from target", { status: 502 });
    }

    return new Response(body, {
      status: response.status,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": contentType || "text/plain; charset=utf-8",
        "Cache-Control": response.ok ? "public, max-age=300, s-maxage=300" : "no-store",
        "X-Proxied-By": "feedbox-worker",
      },
    });
  } catch (err) {
    const msg = err.name === "TimeoutError"
      ? "Target timed out after 10s"
      : `Fetch failed: ${err.message}`;
    return new Response(msg, {
      status: 502,
      headers: corsHeaders(origin),
    });
  }
}

// ── CORS headers ──────────────────────────────────────────────
function corsHeaders(origin) {
  const allowed = [ALLOWED_ORIGIN, "http://localhost:5173", "http://localhost:4173"];
  const allowOrigin = allowed.includes(origin) ? origin : ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}
