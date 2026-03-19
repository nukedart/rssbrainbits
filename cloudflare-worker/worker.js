/**
 * Feedbox CORS Proxy — Cloudflare Worker
 * ────────────────────────────────────────
 * Free tier: 100,000 requests/day, 10ms CPU/request — plenty for RSS.
 *
 * Deploy:
 *   1. npx wrangler login
 *   2. npx wrangler deploy
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

    // ── CORS preflight ───────────────────────────────────────
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(origin),
      });
    }

    // ── Only allow GET ───────────────────────────────────────
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    // ── Extract target URL ───────────────────────────────────
    const url = new URL(request.url);
    const target = url.searchParams.get("url");

    if (!target) {
      return new Response("Missing ?url= parameter", { status: 400 });
    }

    // ── Validate target URL ──────────────────────────────────
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

    // ── Fetch the target ─────────────────────────────────────
    try {
      const response = await fetch(targetUrl.toString(), {
        headers: {
          // Mimic a real browser so feeds don't block us
          "User-Agent":
            "Mozilla/5.0 (compatible; Feedbox/1.0; +https://rss.brainbits.us)",
          Accept:
            "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
        // Follow redirects
        redirect: "follow",
        // 10s timeout via AbortController
        signal: AbortSignal.timeout(10000),
      });

      const contentType = response.headers.get("Content-Type") || "";
      const isAllowed = ALLOWED_CONTENT.some((t) => contentType.includes(t));

      // Stream response body
      const body = await response.text();

      // Reject empty or clearly wrong responses
      if (!body.trim()) {
        return new Response("Empty response from target", { status: 502 });
      }

      return new Response(body, {
        status: response.status,
        headers: {
          ...corsHeaders(origin),
          "Content-Type": contentType || "text/plain; charset=utf-8",
          // Cache valid RSS for 5 minutes at the edge
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
  },
};

function corsHeaders(origin) {
  // Allow the Feedbox app domain + localhost for dev
  const allowed = [ALLOWED_ORIGIN, "http://localhost:5173", "http://localhost:4173"];
  const allowOrigin = allowed.includes(origin) ? origin : ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}
