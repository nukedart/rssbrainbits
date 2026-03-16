// ── Content fetchers ──────────────────────────────────────────
const PROXY_PRIMARY  = "https://corsproxy.io/?";
const PROXY_FALLBACK = "https://api.allorigins.win/get?url=";
const TIMEOUT_MS     = 12000;

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
  // Try corsproxy.io first — returns raw content directly
  try {
    const res = await fetchWithTimeout(PROXY_PRIMARY + encodeURIComponent(targetUrl));
    if (!res.ok) throw new Error(`Primary proxy ${res.status}`);
    return await res.text();
  } catch (primaryErr) {
    console.warn("Primary proxy failed, trying fallback:", primaryErr.message);
  }
  // Fall back to allorigins
  try {
    const res = await fetchWithTimeout(PROXY_FALLBACK + encodeURIComponent(targetUrl));
    if (!res.ok) throw new Error(`Fallback proxy ${res.status}`);
    const json = await res.json();
    return json.contents;
  } catch (fallbackErr) {
    throw new Error("Both proxies failed. The site may block external requests.");
  }
}

// ── RSS Feed ──────────────────────────────────────────────────
export async function fetchRSSFeed(feedUrl) {
  const text = await proxiedFetch(feedUrl);
  return parseRSS(text, feedUrl);
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
    items: items.slice(0, 40).map((item) => parseRSSItem(item, isAtom)),
  };
}

function parseRSSItem(item, isAtom) {
  const image = extractItemImage(item);
  if (isAtom) {
    return {
      title:       item.querySelector("title")?.textContent?.trim() || "Untitled",
      url:         item.querySelector("link")?.getAttribute("href") || item.querySelector("link")?.textContent?.trim() || "",
      description: stripHtml(item.querySelector("summary, content")?.textContent || ""),
      date:        item.querySelector("updated, published")?.textContent || "",
      author:      item.querySelector("author name")?.textContent?.trim() || "",
      image,
    };
  }
  return {
    title:       item.querySelector("title")?.textContent?.trim() || "Untitled",
    url:         item.querySelector("link")?.textContent?.trim() || "",
    description: stripHtml(item.querySelector("description")?.textContent || ""),
    date:        item.querySelector("pubDate")?.textContent || "",
    author:      item.querySelector("author, dc\\:creator")?.textContent?.trim() || "",
    image,
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
    { sel: "article",                           score: 10 },
    { sel: "[itemprop='articleBody']",          score: 10 },
    { sel: ".article-body",                     score:  9 },
    { sel: ".post-content",                     score:  9 },
    { sel: ".entry-content",                    score:  9 },
    { sel: ".story-body",                       score:  9 },
    { sel: ".content-body",                     score:  8 },
    { sel: ".article-content",                  score:  8 },
    { sel: "#article-body",                     score:  8 },
    { sel: '[role="main"]',                     score:  7 },
    { sel: "main",                              score:  6 },
    { sel: ".content",                          score:  4 },
    { sel: "body",                              score:  1 },
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

export function isRSSUrl(url) {
  return url.includes("/feed") || url.includes("/rss") || url.includes(".xml") ||
    url.includes("atom") || url.endsWith("/feed/") || url.includes("feedburner");
}

export function detectInputType(url) {
  if (parseYouTubeUrl(url).isYouTube) return "youtube";
  if (isRSSUrl(url)) return "rss";
  return "article";
}

// ── AI Summarization ──────────────────────────────────────────
export async function summarizeContent(text, title) {
  const { getAnthropicKey } = await import("./apiKeys.js");
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": getAnthropicKey(),
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Summarize this article in 3-5 concise bullet points. Be direct and insightful.\n\nTitle: "${title}"\n\nContent:\n${text.slice(0, 6000)}`,
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
