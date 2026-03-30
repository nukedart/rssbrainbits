// ── Content fetchers ──────────────────────────────────────────
import { Readability } from "@mozilla/readability";
import { getCachedFeed, setCachedFeed } from "./feedCache.js";
import { getAiProvider } from "./apiKeys.js";

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
  if (!text?.trim()) return true; // empty response is always a failure
  const t = text.trim().toLowerCase().slice(0, 2000);
  // Must start with RSS/Atom/XML markers to be valid
  const isXml = t.startsWith("<?xml") || t.startsWith("<rss") || t.startsWith("<feed") || t.startsWith("<rdf:");
  if (isXml) return false; // looks like a real feed — don't block it
  // HTML page returned instead of XML = block page
  if (t.startsWith("<!doctype html") || t.startsWith("<html")) return true;
  // Cloudflare-specific markers (appear in JSON error responses too)
  if (t.includes("cf-browser-verification") || t.includes("just a moment") || t.includes("enable javascript")) return true;
  // JSON wrapping (some proxies return {error: ...} or status codes in JSON)
  if (t.startsWith("{") && (t.includes('"error"') || t.includes('"status":4') || t.includes('"status":5'))) return true;
  return false;
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

// ── YouTube Transcript ────────────────────────────────────────
// Fetches auto-generated captions from YouTube's timedtext API.
// Returns [{ start: number, dur: number, text: string }] or [] on failure.
export async function fetchYouTubeTranscript(videoId) {
  if (!videoId) return [];
  const urls = [
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=srv3`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`,
  ];
  for (const url of urls) {
    try {
      const text = await proxiedFetch(url);
      if (!text?.trim()) continue;
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/xml");
      const nodes = Array.from(doc.querySelectorAll("text, s"));
      if (!nodes.length) continue;
      return nodes.map(n => ({
        start: parseFloat(n.getAttribute("start") || n.getAttribute("t") || "0") / (n.getAttribute("t") ? 1000 : 1),
        dur:   parseFloat(n.getAttribute("dur")   || n.getAttribute("d") || "2")  / (n.getAttribute("d") ? 1000 : 1),
        text:  (n.textContent || "").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim(),
      })).filter(l => l.text);
    } catch { /* try next */ }
  }
  return [];
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
    items: (json.items || []).slice(0, getFeedLimit()).map(item => {
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

export function getFeedLimit() {
  return parseInt(localStorage.getItem("fb-feed-limit") || "20", 10);
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
    items: items.slice(0, getFeedLimit()).map((item) => parseRSSItem(item, isAtom)),
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
    description: (stripHtml(descRaw) || stripHtml(contentEncoded || "")).slice(0, 400),
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
  // Use nodeName/localName checks — querySelector with CSS-escaped namespace prefixes
  // (media\\:content) is unreliable across browsers when parsing XML documents.
  const allEls = Array.from(item.querySelectorAll("*"));
  const byName = (...names) => allEls.find(el => names.includes(el.nodeName) || names.includes(el.localName));

  // 1. media:content / media:thumbnail (BBC, NYT, YouTube, most modern feeds)
  const media = byName("media:content", "media:thumbnail");
  if (media?.getAttribute("url")) return media.getAttribute("url");

  // 2. Any element with a "url" attribute and image-like localName
  const genericMedia = allEls.find(el =>
    (el.localName === "content" || el.localName === "thumbnail") && el.getAttribute("url")
  );
  if (genericMedia) return genericMedia.getAttribute("url");

  // 3. enclosure with image MIME type (podcasts, photoblogs)
  const enclosure = byName("enclosure");
  if (enclosure?.getAttribute("type")?.startsWith("image")) return enclosure.getAttribute("url");

  // 4. Parse description/content:encoded HTML to find first <img src>
  //    Catches WordPress, Substack, Ghost, Medium, and most CMS feeds
  const encodedEl = allEls.find(el => el.localName === "encoded" || el.nodeName === "content:encoded");
  const rawDesc =
    item.querySelector("description")?.textContent ||
    encodedEl?.textContent ||
    item.querySelector("summary")?.textContent ||
    item.querySelector("content")?.textContent || "";

  if (rawDesc) {
    const parser = new DOMParser();
    const descDoc = parser.parseFromString(rawDesc, "text/html");
    const firstImg = descDoc.querySelector("img[src]");
    if (firstImg) {
      const src = firstImg.getAttribute("src");
      if (src && !src.includes("tracking") && !src.includes("pixel") &&
          !src.includes("spacer") && src.length > 10) {
        return src;
      }
    }
    const imgMatch = rawDesc.match(/<img[^>]+src=["']([^"']{20,})["']/i);
    if (imgMatch?.[1]) return imgMatch[1];
  }

  // 5. itunes:image href (podcasts)
  const itunesImg = byName("itunes:image", "image");
  if (itunesImg?.getAttribute("href")) return itunesImg.getAttribute("href");

  // 6. og:image meta embedded in Atom items
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

  // Meta fields (og/twitter tags — present even if Readability wins)
  const ogTitle = doc.querySelector("meta[property='og:title']")?.getAttribute("content");
  const ogDesc  = doc.querySelector("meta[property='og:description']")?.getAttribute("content") ||
                  doc.querySelector("meta[name='description']")?.getAttribute("content") || "";
  const rawImage =
    doc.querySelector("meta[property='og:image']")?.getAttribute("content") ||
    doc.querySelector("meta[name='twitter:image']")?.getAttribute("content") ||
    null;
  let image = null;
  if (rawImage) {
    try { image = new URL(rawImage, articleUrl).href; } catch { image = rawImage; }
  }

  // ── Try Readability first ─────────────────────────────────────
  let readabilityResult = null;
  try {
    // Readability mutates the document, so clone it
    const docClone = doc.cloneNode(true);
    readabilityResult = new Readability(docClone).parse();
  } catch { /* fall through */ }

  if (readabilityResult?.content && readabilityResult.textContent?.trim().length > 200) {
    const title       = (ogTitle || readabilityResult.title || "Article").trim();
    const description = ogDesc.trim() || readabilityResult.excerpt?.trim() || "";
    let   bodyText    = readabilityResult.textContent.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 15000);

    // Post-process Readability HTML: fix relative URLs and open links externally
    const tmp = parser.parseFromString(readabilityResult.content, "text/html");
    tmp.querySelectorAll("img[src]").forEach(img => {
      try { img.setAttribute("src", new URL(img.getAttribute("src"), articleUrl).href); } catch {}
      img.removeAttribute("width"); img.removeAttribute("height");
    });
    tmp.querySelectorAll("a[href]").forEach(a => {
      try { a.setAttribute("href", new URL(a.getAttribute("href"), articleUrl).href); } catch {}
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    });
    const bodyHtml = tmp.body.innerHTML;

    return { title, description, image, url: articleUrl, bodyText, bodyHtml };
  }

  // ── Fallback: manual DOM extraction ──────────────────────────
  const title = (
    ogTitle ||
    doc.querySelector("h1")?.textContent ||
    doc.querySelector("title")?.textContent ||
    "Article"
  ).trim();
  const description = ogDesc.trim();

  // Site-specific overrides (fastest path — checked before generic selectors)
  const hostname = (() => { try { return new URL(articleUrl).hostname.replace(/^www\./, ""); } catch { return ""; } })();
  const SITE_SELECTORS = {
    "makeuseof.com":    [".article-body", ".article-content", ".content-writer-content", ".content__item"],
    "9to5mac.com":      [".article-content", ".post-content", ".entry-content"],
    "9to5google.com":   [".article-content", ".post-content", ".entry-content"],
    "electrek.co":      [".article-content", ".post-content", ".entry-content"],
    "appleinsider.com": [".article-body", ".review-body", ".news-article"],
    "macrumors.com":    [".article-content", ".post-content"],
    "theverge.com":     [".duet--article--article-body-component", "[data-component='article-body']"],
    "arstechnica.com":  [".article-content.post-page", "#article-guts", ".article-content"],
    "wired.com":        ["[class*='ArticleBodyComponent']", "[class*='article-body']", "article"],
    "techcrunch.com":   [".article-content", ".entry-content", "article"],
    "engadget.com":     ["[class*='article-body']", ".o-article__body", "article"],
  };

  const SELECTORS = [
    "article", "[itemprop='articleBody']",
    ".article-content", ".post-content", ".entry-content", ".single-article-content",
    ".duet--article--article-body-component", "[data-component='article-body']",
    ".article-content.post-page", "#article-guts",
    ".article-body", ".story-body", ".story-content", ".content-body", ".body-content",
    "#article-body", ".post-body", ".article__body",
    ".available-content", ".post", '[role="main"]', "main", ".content", "body",
  ];

  let articleEl = null;
  const siteSelectors = SITE_SELECTORS[hostname];
  if (siteSelectors) {
    for (const sel of siteSelectors) { articleEl = doc.querySelector(sel); if (articleEl) break; }
  }
  if (!articleEl) {
    for (const sel of SELECTORS) { articleEl = doc.querySelector(sel); if (articleEl) break; }
  }

  const NOISE_SELECTOR = [
    "script","style","noscript","nav","header","footer","aside",
    ".ad",".ads","[class*='advertisement']","[id*='ad-']",
    ".sidebar",".related",".comments",".social",".share",".newsletter",
    ".subscription","[class*='popup']","[class*='banner']",
    "figure.wp-block-embed","iframe",
    "[class*='sharedaddy']","[class*='jp-relatedposts']",
    "[class*='wpcnt']","[id*='respond']","[class*='post-nav']",
    "[class*='author-info']","[class*='tags-links']",
    "[class*='author-box']","[class*='author-bio']",
    "[class*='related-posts']","[class*='recommended']",
    "[class*='mu-ad']","[class*='newsletter-signup']","[class*='bio-box']",
    "[class*='paywall']","[class*='subscribe']","[class*='membership']",
    "[class*='piano-']","[class*='tp-']",
  ].join(",");
  try { articleEl?.querySelectorAll(NOISE_SELECTOR).forEach(el => el.remove()); } catch {}

  const paragraphs = articleEl
    ? Array.from(articleEl.querySelectorAll("p, h2, h3, h4, li, blockquote"))
        .map((el) => el.textContent.replace(/\s+/g, " ").trim())
        .filter((t) => t.length > 20)
    : [];

  let bodyText = "";
  if (paragraphs.length >= 3) {
    bodyText = paragraphs.join("\n\n");
  } else {
    bodyText = (articleEl?.innerText || articleEl?.textContent || "")
      .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }
  bodyText = bodyText.slice(0, 15000);

  let bodyHtml = null;
  if (articleEl) {
    const clone = articleEl.cloneNode(true);
    clone.querySelectorAll("*").forEach(node => {
      for (const attr of Array.from(node.attributes)) {
        if (attr.name.startsWith("on")) node.removeAttribute(attr.name);
      }
    });
    clone.querySelectorAll("img[src]").forEach(img => {
      try { img.setAttribute("src", new URL(img.getAttribute("src"), articleUrl).href); } catch {}
      img.removeAttribute("width"); img.removeAttribute("height");
    });
    clone.querySelectorAll("a[href]").forEach(a => {
      try { a.setAttribute("href", new URL(a.getAttribute("href"), articleUrl).href); } catch {}
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    });
    bodyHtml = clone.innerHTML;
  }

  return { title, description, image, url: articleUrl, bodyText, bodyHtml };
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

// Returns true for YouTube channel/handle/user URLs (not individual videos).
export function isYouTubeChannelUrl(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("youtube.com")) return false;
    const p = u.pathname;
    return (
      p.startsWith("/feeds/videos.xml") ||
      p.startsWith("/channel/") ||
      p.startsWith("/@") ||
      p.startsWith("/c/") ||
      p.startsWith("/user/")
    );
  } catch { return false; }
}

// Resolves any YouTube channel URL to its RSS feed URL.
// /channel/UCxxx  → direct conversion, no fetch needed.
// /@handle or /c/ → fetch the channel page and extract channel_id from HTML.
export async function resolveYouTubeChannelRSS(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("youtube.com")) return null;

    // Already a feeds.xml URL — return as-is
    if (u.pathname.startsWith("/feeds/videos.xml")) return url;

    // /channel/UCxxxxx — direct, no fetch needed
    const chanMatch = u.pathname.match(/\/channel\/(UC[\w-]+)/);
    if (chanMatch) return `https://www.youtube.com/feeds/videos.xml?channel_id=${chanMatch[1]}`;

    // /@handle, /c/name, /user/name — fetch page to find channel_id
    const html = await proxiedFetch(url).catch(() => null);
    if (html) {
      // Canonical RSS link in <head>
      const rssMatch = html.match(/href="(https:\/\/www\.youtube\.com\/feeds\/videos\.xml[^"]+)"/);
      if (rssMatch) return rssMatch[1].replace(/&amp;/g, "&");
      // channel_id in page JSON data
      const cidMatch = html.match(/"externalChannelId":"(UC[\w-]+)"/) ||
                       html.match(/"channelId":"(UC[\w-]+)"/) ||
                       html.match(/channel_id=(UC[\w-]+)/);
      if (cidMatch) return `https://www.youtube.com/feeds/videos.xml?channel_id=${cidMatch[1]}`;
    }
  } catch {}
  return null;
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
    url.includes("atom") || url.endsWith("/feed/") || url.includes("feedburner") ||
    url.includes("rss=1") || url.includes("format=rss") || url.includes("type=rss");
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
  if (isYouTubeChannelUrl(url)) return "youtube";
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


// ── Podcast RSS Resolution ────────────────────────────────────
// Given an Apple Podcasts or other podcast page URL, returns the actual RSS
// feed URL. Uses the iTunes Lookup API for Apple Podcasts URLs; falls back to
// discoverFeed() for other podcast sites (Spotify, Overcast, etc.).
// Returns { feedUrl, title } or null.
export async function resolvePodcastFeedUrl(url) {
  try {
    // Apple Podcasts: extract numeric ID from URL (e.g. /id1234567890)
    const appleMatch = url.match(/\/id(\d{6,})/);
    if (appleMatch) {
      const id = appleMatch[1];
      const res = await fetchWithTimeout(
        `https://itunes.apple.com/lookup?id=${id}&entity=podcast`,
        8000
      );
      const json = await res.json();
      const entry = (json.results || []).find(r => r.feedUrl);
      if (entry?.feedUrl) return { feedUrl: entry.feedUrl, title: entry.collectionName };
    }
  } catch { /* fall through */ }
  // Generic fallback — scrape the page for <link rel="alternate">
  return discoverFeed(url);
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

// Cache the active provider per page load.
export async function summarizeContent(text, title, style = "keypoints") {
  if (!WORKER_BASE) return "AI features require the Cloudflare Worker — set VITE_PROXY_URL.";
  const provider = getAiProvider();
  try {
    const res = await fetch(`${WORKER_BASE}/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 6000), title: title || "Untitled", style, provider }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.summary || "Could not generate summary.";
  } catch (err) {
    console.error("Summarization error:", err);
    return "Summarization failed. Please try again.";
  }
}

export async function askQuestion(text, title, question) {
  if (!WORKER_BASE) throw new Error("AI features require the Cloudflare Worker — set VITE_PROXY_URL.");
  const res = await fetch(`${WORKER_BASE}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.slice(0, 6000), title: title || "Untitled", question }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.answer || "No answer found.";
}

export async function suggestTags(text, title) {
  if (!WORKER_BASE) return [];
  try {
    const res = await fetch(`${WORKER_BASE}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 2000), title: title || "Untitled" }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.tags || []).slice(0, 5);
  } catch { return []; }
}
