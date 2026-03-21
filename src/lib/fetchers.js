// ── Content fetchers ──────────────────────────────────────────
import { getCachedFeed, setCachedFeed } from "./feedCache.js";
import { getAnthropicKey } from "./apiKeys.js";

// Own Cloudflare Worker proxy — fast, free, private, no rate limits.
// Set VITE_PROXY_URL in .env.local and GitHub secrets after deploying.
// Falls back to public proxies if not set (for local dev / pre-deploy).
const OWN_PROXY      = import.meta.env.VITE_PROXY_URL
  ? `${import.meta.env.VITE_PROXY_URL}?url=`
  : null;
const PROXY_PRIMARY  = "https://corsproxy.io/?";
const PROXY_FALLBACK = "https://api.allorigins.win/get?url=";
const PROXY_THIRD    = "https://api.codetabs.com/v1/proxy?quest=";
const RSS2JSON_API   = "https://api.rss2json.com/v1/api.json?rss_url=";
const TIMEOUT_MS     = 10000; // 10s — some sites are slow

// Detect when a proxy returned a bot-challenge page instead of RSS/HTML content
function looksLikeBlockPage(text) {
  const t = text.trim().toLowerCase().slice(0, 2000);
  return (
    t.startsWith("<!doctype html") || t.startsWith("<html") ||
    t.includes("cf-browser-verification") ||
    t.includes("attention required") ||
    t.includes("just a moment") ||        // Cloudflare
    t.includes("enable javascript") ||
    t.includes("access denied") ||
    t.includes("403 forbidden") ||
    t.includes("blocked")
  );
}

async function fetchWithTimeout(url, ms = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function proxiedFetch(targetUrl) {
  const enc = encodeURIComponent(targetUrl);

  // ── Own Cloudflare Worker — try first if configured ──────
  // Use a shorter 4s timeout so a downed Worker fails fast and the
  // public-proxy race below starts without a 10s delay.
  if (OWN_PROXY) {
    try {
      const res = await fetchWithTimeout(OWN_PROXY + enc, 4000);
      if (res.ok) {
        const text = await res.text();
        if (text?.trim()) return text;
      }
    } catch {
      // Worker unreachable — fall through to public proxies
    }
  }

  // ── Public proxies — race all three as fallback ───────────
  const p1 = fetchWithTimeout(PROXY_PRIMARY + enc, TIMEOUT_MS)
    .then(async res => {
      if (!res.ok) throw new Error(`corsproxy ${res.status}`);
      const text = await res.text();
      if (!text?.trim() || text.includes("Access denied") || text.includes("blocked")) throw new Error("corsproxy blocked");
      return text;
    });

  const p2 = fetchWithTimeout(PROXY_FALLBACK + enc, TIMEOUT_MS)
    .then(async res => {
      if (!res.ok) throw new Error(`allorigins ${res.status}`);
      const json = await res.json();
      if (!json?.contents?.trim()) throw new Error("allorigins empty");
      return json.contents;
    });

  const p3 = fetchWithTimeout(PROXY_THIRD + enc, TIMEOUT_MS)
    .then(async res => {
      if (!res.ok) throw new Error(`codetabs ${res.status}`);
      const text = await res.text();
      if (!text?.trim()) throw new Error("codetabs empty");
      return text;
    });

  const result = await Promise.any([p1, p2, p3]).catch(() => {
    throw new Error("Could not reach this feed. The site may block external requests or the URL may have changed.");
  });
  return result;
}

// ── RSS Feed ──────────────────────────────────────────────────
// Always returns { title, items } — unwraps the cache envelope internally.
export async function fetchRSSFeed(feedUrl, { forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = getCachedFeed(feedUrl);
    // getCachedFeed returns { data, isStale } where data = { title, items }
    if (cached?.data) return cached.data;
  }

  let result;
  try {
    const text = await proxiedFetch(feedUrl);
    // Proxy returned a Cloudflare challenge / block page — skip to rss2json
    if (looksLikeBlockPage(text)) throw new Error("proxy blocked");
    result = parseRSS(text, feedUrl);
  } catch {
    // Fallback: rss2json has publisher relationships that bypass Cloudflare blocks
    result = await fetchViaRss2Json(feedUrl);
  }

  setCachedFeed(feedUrl, result);
  return result;
}

async function fetchViaRss2Json(feedUrl) {
  const res = await fetchWithTimeout(RSS2JSON_API + encodeURIComponent(feedUrl), TIMEOUT_MS);
  if (!res.ok) throw new Error(`rss2json HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== "ok") throw new Error(`rss2json: ${json.message || "error"}`);

  return {
    title: json.feed?.title || new URL(feedUrl).hostname,
    items: (json.items || []).slice(0, 80).map(item => {
      // rss2json returns thumbnail separately; also try to extract from content
      const image = item.thumbnail && !item.thumbnail.includes("1x1")
        ? item.thumbnail
        : extractImageFromText(item.content || item.description || "");
      const descRaw = item.description || "";
      const enclosure = item.enclosure;
      const audioUrl = enclosure?.type?.startsWith("audio") ? enclosure.link : null;
      return {
        title:         item.title || "Untitled",
        url:           item.link || "",
        description:   stripHtml(descRaw).slice(0, 400),
        fullText:      item.content || item.description || "",
        date:          normaliseDate(item.pubDate),
        author:        item.author || "",
        image,
        audioUrl,
        audioDuration: null,
        isPodcast:     !!audioUrl,
      };
    }),
  };
}

// Extract first usable image from HTML string (used in rss2json fallback)
function extractImageFromText(html) {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']{20,})["']/i);
  const src = match?.[1];
  if (!src) return null;
  if (src.includes("tracking") || src.includes("pixel") || src.includes("spacer")) return null;
  return src;
}

function parseRSS(xmlText, sourceUrl) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(xmlText, "text/xml");
  if (doc.querySelector("parsererror")) throw new Error("Invalid RSS/XML");

  const isAtom    = !!doc.querySelector("feed");
  const items     = Array.from(doc.querySelectorAll(isAtom ? "entry" : "item"));
  const feedTitle = doc.querySelector(isAtom ? "feed > title" : "channel > title")
    ?.textContent?.trim() || new URL(sourceUrl).hostname;

  return {
    title: feedTitle,
    items: items.slice(0, 80).map((item) => parseRSSItem(item, isAtom)),
  };
}

// Normalise any date string to ISO 8601. Returns "" if unparseable.
function normaliseDate(raw) {
  if (!raw) return "";
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString();
    // Handle RFC 2822 variants with missing timezone — assume UTC
    const cleaned = raw.replace(/([+-]\d{2})(\d{2})$/, "$1:$2").trim();
    const d2 = new Date(cleaned);
    if (!isNaN(d2.getTime())) return d2.toISOString();
  } catch {}
  return "";
}

function parseRSSItem(item, isAtom) {
  const image = extractItemImage(item);

  if (isAtom) {
    // Prefer content over summary for full-text Atom feeds
    const contentEl  = item.querySelector("content");
    const summaryEl  = item.querySelector("summary");
    const bodyRaw    = contentEl?.textContent || summaryEl?.textContent || "";
    return {
      title:       item.querySelector("title")?.textContent?.trim() || "Untitled",
      url:         item.querySelector("link[rel=alternate]")?.getAttribute("href")
                   || item.querySelector("link:not([rel])")?.getAttribute("href")
                   || item.querySelector("link")?.textContent?.trim() || "",
      description: stripHtml(bodyRaw).slice(0, 400),
      fullText:    bodyRaw,
      date:        normaliseDate(item.querySelector("updated, published")?.textContent),
      author:      item.querySelector("author name")?.textContent?.trim() || "",
      image,
    };
  }

  // RSS 2.0 — prefer content:encoded (WordPress full post) over description (excerpt)
  const contentEncoded = item.querySelector("encoded")?.textContent   // namespace-stripped
    || (() => {
      // Try with namespace prefix preserved in XML
      const all = Array.from(item.querySelectorAll("*"));
      return all.find(el => el.nodeName === "content:encoded" || el.localName === "encoded")?.textContent;
    })();
  const descRaw = item.querySelector("description")?.textContent || "";
  const bodyRaw = contentEncoded || descRaw;

  // Detect podcast audio enclosure
  const enclosure = item.querySelector("enclosure");
  const audioUrl = enclosure?.getAttribute("type")?.startsWith("audio")
    ? enclosure.getAttribute("url") : null;

  // iTunes duration
  const allEls = Array.from(item.querySelectorAll("*"));
  const durationEl = allEls.find(el => el.localName === "duration");
  const audioDuration = durationEl?.textContent?.trim() || null;

  return {
    title:       item.querySelector("title")?.textContent?.trim() || "Untitled",
    url:         item.querySelector("link")?.textContent?.trim() || "",
    description: stripHtml(descRaw).slice(0, 400),
    fullText:    bodyRaw,
    date:        normaliseDate(item.querySelector("pubDate, date")?.textContent),
    author:      item.querySelector("author, creator")?.textContent?.trim()
                 || allEls.find(el => el.localName === "creator" || el.localName === "author")?.textContent?.trim() || "",
    image,
    // Podcast fields — null for regular articles
    audioUrl,
    audioDuration,
    isPodcast: !!audioUrl,
  };
}

function extractItemImage(item) {
  // 1. media:content (most common in modern feeds — BBC, NYT, tech blogs)
  const mediaContent = item.querySelector("media\\:content, media\\:thumbnail");
  if (mediaContent?.getAttribute("url")) return mediaContent.getAttribute("url");

  // 2. Generic "content" or "thumbnail" elements (some feed parsers drop the namespace)
  const genericMedia = item.querySelector("content[url], thumbnail[url]");
  if (genericMedia?.getAttribute("url")) return genericMedia.getAttribute("url");

  // 3. enclosure with image MIME type (podcasts, photoblogs)
  const enclosure = item.querySelector("enclosure");
  if (enclosure?.getAttribute("type")?.startsWith("image")) return enclosure.getAttribute("url");

  // 4. Parse the raw description/content HTML to find the first <img src>
  //    This catches WordPress, Substack, Ghost, Medium, and most CMS feeds
  const rawDesc =
    item.querySelector("description")?.textContent ||
    item.querySelector("content\\:encoded")?.textContent ||
    item.querySelector("summary")?.textContent ||
    item.querySelector("content")?.textContent || "";

  if (rawDesc) {
    // Try parsing as HTML to find img tags properly
    const parser = new DOMParser();
    const descDoc = parser.parseFromString(rawDesc, "text/html");
    const firstImg = descDoc.querySelector("img[src]");
    if (firstImg) {
      const src = firstImg.getAttribute("src");
      // Skip tracking pixels and tiny images (1x1, spacers)
      if (src && !src.includes("tracking") && !src.includes("pixel") &&
          !src.includes("spacer") && src.length > 10) {
        return src;
      }
    }
    // Fallback regex for malformed HTML in CDATA sections
    const imgMatch = rawDesc.match(/<img[^>]+src=["']([^"']{20,})["']/i);
    if (imgMatch?.[1]) return imgMatch[1];
  }

  // 5. itunes:image href (podcasts)
  const itunesImg = item.querySelector("image");
  if (itunesImg?.getAttribute("href")) return itunesImg.getAttribute("href");

  // 6. Check for og: meta inside item XML (some Atom feeds embed this)
  const ogImage = item.querySelector("[property='og:image']");
  if (ogImage?.getAttribute("content")) return ogImage.getAttribute("content");

  return null;
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent.replace(/\s+/g, " ").trim().slice(0, 280);
}

// ── Article full-text fetcher ─────────────────────────────────
// Fetches the actual article page and extracts readable body text.
// This is what powers the reader view — NOT the RSS description.
export async function fetchArticleContent(articleUrl) {
  const rawHtml = await proxiedFetch(articleUrl);

  const parser = new DOMParser();
  const doc    = parser.parseFromString(rawHtml, "text/html");

  // Fix relative URLs
  const base = doc.createElement("base");
  base.href  = articleUrl;
  doc.head.appendChild(base);

  // Meta fields
  const title = (
    doc.querySelector("meta[property='og:title']")?.getAttribute("content") ||
    doc.querySelector("h1")?.textContent ||
    doc.querySelector("title")?.textContent ||
    "Article"
  ).trim();

  const description = (
    doc.querySelector("meta[property='og:description']")?.getAttribute("content") ||
    doc.querySelector("meta[name='description']")?.getAttribute("content") ||
    ""
  ).trim();

  const rawImage =
    doc.querySelector("meta[property='og:image']")?.getAttribute("content") ||
    doc.querySelector("meta[name='twitter:image']")?.getAttribute("content") ||
    null;
  let image = null;
  if (rawImage) {
    try { image = new URL(rawImage, articleUrl).href; } catch { image = rawImage; }
  }

  // ── Find the best article container ──────────────────────────
  // Scored selector list — higher = better match
  const SELECTORS = [
    // Standard semantic
    { sel: "article",                              score: 10 },
    { sel: "[itemprop='articleBody']",             score: 10 },
    // 9to5Mac, 9to5Google, Electrek (WordPress VIP)
    { sel: ".article-content",                     score: 10 },
    { sel: ".post-content",                        score:  9 },
    { sel: ".entry-content",                       score:  9 },
    { sel: ".single-article-content",             score:  9 },
    // The Verge, Vox Media
    { sel: ".duet--article--article-body-component", score: 10 },
    { sel: "[data-component='article-body']",      score: 10 },
    // Ars Technica
    { sel: ".article-content.post-page",           score: 10 },
    { sel: "#article-guts",                        score:  9 },
    // General news
    { sel: ".article-body",                        score:  9 },
    { sel: ".story-body",                          score:  9 },
    { sel: ".story-content",                       score:  9 },
    { sel: ".content-body",                        score:  8 },
    { sel: ".body-content",                        score:  8 },
    { sel: "#article-body",                        score:  8 },
    { sel: ".post-body",                           score:  8 },
    { sel: ".article__body",                       score:  8 },
    // Substack, Ghost, Medium
    { sel: ".available-content",                   score:  9 },
    { sel: ".post",                                score:  7 },
    { sel: '[role="main"]',                        score:  7 },
    { sel: "main",                                 score:  6 },
    { sel: ".content",                             score:  4 },
    { sel: "body",                                 score:  1 },
  ];

  let articleEl = null;
  for (const { sel } of SELECTORS) {
    const el = doc.querySelector(sel);
    if (el) { articleEl = el; break; }
  }

  // Remove noise nodes
  const NOISE = [
    "script","style","noscript","nav","header","footer","aside",
    ".ad",".ads","[class*='advertisement']","[id*='ad-']",
    ".sidebar",".related",".comments",".social",".share",".newsletter",
    ".subscription","[class*='popup']","[class*='banner']",
    "figure.wp-block-embed","iframe",
    // 9to5Mac / WordPress VIP specific
    "[class*='sharedaddy']","[class*='jp-relatedposts']",
    "[class*='wpcnt']","[id*='respond']","[class*='post-nav']",
    "[class*='author-info']","[class*='tags-links']",
    // Paywall / subscription prompts
    "[class*='paywall']","[class*='subscribe']","[class*='membership']",
    "[class*='piano-']","[class*='tp-']",
  ];
  NOISE.forEach((sel) => {
    try { articleEl?.querySelectorAll(sel).forEach((el) => el.remove()); } catch {}
  });

  // Extract paragraphs in reading order for best quality text
  const paragraphs = articleEl
    ? Array.from(articleEl.querySelectorAll("p, h2, h3, h4, li, blockquote"))
        .map((el) => el.textContent.replace(/\s+/g, " ").trim())
        .filter((t) => t.length > 20)
    : [];

  // Use paragraph extraction if we got enough; fall back to full innerText
  let bodyText = "";
  if (paragraphs.length >= 3) {
    bodyText = paragraphs.join("\n\n");
  } else {
    bodyText = (articleEl?.innerText || articleEl?.textContent || "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // Cap at 15k chars (enough for a full long-form article)
  bodyText = bodyText.slice(0, 15000);

  return { title, description, image, url: articleUrl, bodyText };
}

// ── YouTube ───────────────────────────────────────────────────
export function parseYouTubeUrl(url) {
  try {
    const u = new URL(url);
    let videoId = null;
    if (u.hostname.includes("youtube.com")) {
      videoId = u.searchParams.get("v");
      if (!videoId && u.pathname.startsWith("/shorts/")) videoId = u.pathname.split("/shorts/")[1];
    } else if (u.hostname === "youtu.be") {
      videoId = u.pathname.slice(1).split("?")[0];
    }
    return videoId ? { isYouTube: true, videoId } : { isYouTube: false };
  } catch { return { isYouTube: false }; }
}

export function isPodcastUrl(url) {
  const u = url.toLowerCase();
  return u.includes("podcast") || u.includes("itunes.apple.com/") ||
    u.includes("feeds.buzzsprout") || u.includes("feeds.transistor") ||
    u.includes("feeds.captivate") || u.includes("anchor.fm/") ||
    u.includes("feeds.simplecast") || u.includes("feeds.soundcloud") ||
    u.includes("feeds.libsyn") || u.includes("rss.art19") ||
    u.includes("feeds.megaphone") || u.includes("omnycontent.com/");
}

export function isRSSUrl(url) {
  return url.includes("/feed") || url.includes("/rss") || url.includes(".xml") ||
    url.includes("atom") || url.endsWith("/feed/") || url.includes("feedburner");
}

// ── X / Twitter ───────────────────────────────────────────────
// Converts an x.com or twitter.com profile URL to an RSSHub RSS feed.
// RSSHub is an open-source relay that bridges social platforms to RSS.
// Public instance: https://rsshub.app — self-hostable for privacy.
export function parseXUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname === "x.com" || u.hostname === "twitter.com" || u.hostname === "www.x.com" || u.hostname === "www.twitter.com") {
      // Match /<username> or /<username>/status/... (we only care about the username)
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 1 && !["search", "explore", "home", "notifications", "messages"].includes(parts[0])) {
        return { isX: true, username: parts[0] };
      }
    }
  } catch { /* ignore */ }
  return { isX: false };
}

// Returns the RSS feed URL for an X account (via RSSHub public instance)
export function xToRSSUrl(username) {
  return `https://rsshub.app/twitter/user/${username}`;
}

export function detectInputType(url) {
  if (parseYouTubeUrl(url).isYouTube) return "youtube";
  if (parseXUrl(url).isX) return "twitter";
  if (isPodcastUrl(url)) return "podcast";
  if (isRSSUrl(url)) return "rss";
  return "article";
}

// ── Apple Podcasts Search ─────────────────────────────────────
// Uses the iTunes Search API (public, no auth required).
// Returns an array of { title, feedUrl, artworkUrl, artistName, description }
export async function searchApplePodcasts(term) {
  if (!term || term.trim().length < 2) return [];
  try {
    const endpoint = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=podcast&entity=podcast&limit=12`;
    const res = await fetchWithTimeout(endpoint, 8000);
    const json = await res.json();
    return (json.results || []).map(r => ({
      title:       r.collectionName,
      feedUrl:     r.feedUrl,
      artworkUrl:  r.artworkUrl100,
      artistName:  r.artistName,
      trackCount:  r.trackCount,
    })).filter(r => r.feedUrl);
  } catch {
    return [];
  }
}


// ── RSS Auto-discovery ────────────────────────────────────────
// Given any website URL, fetches the page and looks for:
//   <link rel="alternate" type="application/rss+xml" href="...">
//   <link rel="alternate" type="application/atom+xml" href="...">
// Returns { feedUrl, title } or null if none found.
export async function discoverFeed(pageUrl) {
  try {
    const html = await proxiedFetch(pageUrl);
    const parser = new DOMParser();
    const doc    = parser.parseFromString(html, "text/html");

    const FEED_TYPES = [
      "application/rss+xml",
      "application/atom+xml",
      "application/feed+json",
      "application/rdf+xml",
    ];

    for (const type of FEED_TYPES) {
      const link = doc.querySelector(`link[rel="alternate"][type="${type}"]`);
      if (link) {
        const href  = link.getAttribute("href");
        const title = link.getAttribute("title") || doc.title || new URL(pageUrl).hostname;
        if (!href) continue;
        // Resolve relative URLs against the page origin
        const feedUrl = href.startsWith("http") ? href : new URL(href, pageUrl).href;
        return { feedUrl, title };
      }
    }

    // Fallback: probe common feed paths in parallel — first valid feed wins
    const base = new URL(pageUrl).origin;
    const COMMON_PATHS = ["/feed", "/feed.xml", "/rss", "/rss.xml", "/atom.xml", "/feeds/posts/default"];
    const found = await Promise.any(
      COMMON_PATHS.map(async path => {
        const candidate = base + path;
        const text = await proxiedFetch(candidate);
        if (text.includes("<rss") || text.includes("<feed") || text.includes("<rdf:RDF")) {
          const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
          return { feedUrl: candidate, title: titleMatch?.[1]?.trim() || new URL(pageUrl).hostname };
        }
        throw new Error("not a feed");
      })
    ).catch(() => null);

    return found;
  } catch {
    return null;
  }
}

// ── AI Summarization ──────────────────────────────────────────
// ── AI Summary — tiered: Worker → Edge Function → direct (dev only) ──
const WORKER_BASE = import.meta.env.VITE_PROXY_URL || null;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || null;

export async function summarizeContent(text, title) {
  const payload = { text: text.slice(0, 6000), title: title || "Untitled" };

  // ── Tier 1: Cloudflare Worker (API key stored as Worker secret) ──
  if (WORKER_BASE) {
    try {
      const res = await fetch(`${WORKER_BASE}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.summary) return data.summary;
      }
    } catch {
      // Worker unreachable — fall through
    }
  }

  // ── Tier 2: Supabase Edge Function (authenticated) ──────────────
  if (SUPABASE_URL) {
    try {
      const { supabase } = await import("./supabase.js");
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/summarize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.summary) return data.summary;
        }
      }
    } catch {
      // Edge function unreachable — fall through
    }
  }

  // ── Tier 3: Direct browser call (dev/fallback only) ─────────────
  const key = getAnthropicKey();
  if (!key) return "No AI summary backend configured. Deploy the Cloudflare Worker or set an API key in Settings.";
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `You are a reading assistant. Summarize the following article in 3–5 clear bullet points. Write in plain text only — no markdown, no asterisks, no bold. Each bullet must start with "•" and be a complete, insightful sentence.\n\nTitle: "${title}"\n\nArticle:\n${text.slice(0, 6000)}`,
        }],
      }),
    });
    const data = await response.json();
    return data.content?.[0]?.text || "Could not generate summary.";
  } catch (err) {
    console.error("Summarization error:", err);
    return "Summarization failed. Please try again.";
  }
}
