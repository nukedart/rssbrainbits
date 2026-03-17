// ── Export utilities ──────────────────────────────────────────

// Export highlights (and notes) for one article to Markdown
export function highlightsToMarkdown(highlights, articleTitle, articleUrl) {
  if (!highlights?.length) return "";

  const lines = [];
  lines.push(`# ${articleTitle || "Article"}`);
  if (articleUrl) lines.push(`> ${articleUrl}`);
  lines.push("");
  lines.push(`*${highlights.length} highlight${highlights.length !== 1 ? "s" : ""}*`);
  lines.push("");

  highlights.forEach((h, i) => {
    lines.push(`## Highlight ${i + 1}`);
    lines.push("");
    lines.push(`> ${h.passage}`);
    lines.push("");
    if (h.note) {
      lines.push(`**Note:** ${h.note}`);
      lines.push("");
    }
  });

  return lines.join("\n");
}

// Export ALL highlights grouped by article
export function allHighlightsToMarkdown(highlights) {
  if (!highlights?.length) return "";

  // Group by article
  const byArticle = new Map();
  highlights.forEach(h => {
    const key = h.article_url || "unknown";
    if (!byArticle.has(key)) {
      byArticle.set(key, { title: h.article_title || h.article_url || "Article", url: h.article_url, highlights: [] });
    }
    byArticle.get(key).highlights.push(h);
  });

  const lines = [];
  lines.push("# My Reading Highlights");
  lines.push("");
  lines.push(`*Exported from Feedbox · ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}*`);
  lines.push("");
  lines.push("---");
  lines.push("");

  byArticle.forEach(({ title, url, highlights: hs }) => {
    lines.push(`## ${title}`);
    if (url) lines.push(`> ${url}`);
    lines.push("");
    hs.forEach(h => {
      lines.push(`> ${h.passage}`);
      lines.push("");
      if (h.note) {
        lines.push(`**Note:** ${h.note}`);
        lines.push("");
      }
    });
    lines.push("---");
    lines.push("");
  });

  return lines.join("\n");
}

// Copy text to clipboard, return success bool
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  }
}

// Download a string as a file
export function downloadFile(content, filename, mimeType = "text/markdown") {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Generate OPML XML from an array of feed objects
export function feedsToOPML(feeds) {
  const escape = (str) => (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const date   = new Date().toUTCString();
  const items  = feeds.map(f =>
    `    <outline type="rss" text="${escape(f.name || f.url)}" title="${escape(f.name || f.url)}" xmlUrl="${escape(f.url)}" />`
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Feedbox Subscriptions</title>
    <dateCreated>${date}</dateCreated>
    <dateModified>${date}</dateModified>
  </head>
  <body>
    <outline text="Feedbox" title="Feedbox">
${items}
    </outline>
  </body>
</opml>`;
}
