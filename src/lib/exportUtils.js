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

// Export highlights for one article formatted for Obsidian
// Produces YAML frontmatter + blockquote highlights with [[wikilink]] tags
const yamlStr = (v) => String(v ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const yamlTag = (t) => (/^[\w-]+$/.test(t) ? t : `"${yamlStr(t)}"`);

export function highlightsToObsidian(highlights, articleTitle, articleUrl) {
  if (!highlights?.length) return "";

  const allTags = [...new Set(highlights.flatMap(h => h.tags || []))];
  const date = new Date().toISOString().slice(0, 10);

  const lines = [];
  lines.push("---");
  lines.push(`title: "${yamlStr(articleTitle || "Article")}"`);
  lines.push(`source: "${yamlStr(articleUrl)}"`);
  lines.push(`date: ${date}`);
  lines.push(`tags: [feedbox${allTags.map(t => `, ${yamlTag(t)}`).join("")}]`);
  lines.push("---");
  lines.push("");

  highlights.forEach(h => {
    lines.push(`> ${h.passage}`);
    lines.push("");
    if (h.note) {
      lines.push(h.note);
      lines.push("");
    }
    if (h.tags?.length) {
      lines.push(h.tags.map(t => `[[${t}]]`).join("  "));
      lines.push("");
    }
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

// Export ALL highlights grouped by article as one Markdown document.
// format: "markdown" (default) or "obsidian"
export function allHighlightsToMarkdown(highlights, format = "markdown") {
  if (!highlights?.length) return "";
  const groups = new Map();
  for (const h of highlights) {
    const key = h.article_url || h.article_title || "unknown";
    if (!groups.has(key)) groups.set(key, { url: h.article_url || "", title: h.article_title || h.title || h.article_url || "Untitled", items: [] });
    groups.get(key).items.push(h);
  }
  const date = new Date().toISOString().slice(0, 10);
  const out = [`# Feedbox highlights`, "", `*${highlights.length} highlight${highlights.length !== 1 ? "s" : ""} from ${groups.size} article${groups.size !== 1 ? "s" : ""} · exported ${date}*`, ""];
  for (const g of groups.values()) {
    if (format === "obsidian") {
      out.push(highlightsToObsidian(g.items, g.title, g.url), "---", "");
    } else {
      out.push(`## ${g.title}`);
      if (g.url) out.push(g.url);
      out.push("");
      const tags = [...new Set(g.items.flatMap(h => h.tags || []))];
      if (tags.length) { out.push(`**Tags:** ${tags.join(", ")}`, ""); }
      for (const h of g.items) {
        out.push(`> ${h.passage}`, "");
        if (h.note) out.push(`**Note:** ${h.note}`, "");
      }
    }
  }
  return out.join("\n");
}
