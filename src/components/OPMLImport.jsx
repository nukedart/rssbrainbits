import { useState, useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { Button } from "./UI";

// ── OPML Parser ───────────────────────────────────────────────
// Parses an OPML file and returns a flat list of feed objects.
// Handles both flat OPML and folder-organized OPML (Reeder, NetNewsWire, Feedly).
function parseOPML(xmlText) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(xmlText, "text/xml");

  if (doc.querySelector("parsererror")) {
    throw new Error("Invalid OPML file — could not parse XML.");
  }

  const feeds = [];
  const seen  = new Set();

  function processOutlines(nodes, folder = null) {
    Array.from(nodes).forEach((node) => {
      const type    = node.getAttribute("type");
      const xmlUrl  = node.getAttribute("xmlUrl") || node.getAttribute("xmlurl");
      const title   = node.getAttribute("title") || node.getAttribute("text") || "";
      const children = node.querySelectorAll(":scope > outline");

      if (xmlUrl && !seen.has(xmlUrl)) {
        // It's a feed entry
        seen.add(xmlUrl);
        feeds.push({
          url:    xmlUrl,
          name:   title,
          folder: folder,
          type:   "rss",
        });
      } else if (children.length > 0) {
        // It's a folder — recurse with folder name
        processOutlines(children, title || folder);
      }
    });
  }

  const body     = doc.querySelector("body");
  const topLevel = body?.querySelectorAll(":scope > outline") || [];
  processOutlines(topLevel);

  return feeds;
}

export default function OPMLImport({ onImport, onClose }) {
  const { T }   = useTheme();
  const fileRef = useRef(null);

  const [feeds, setFeeds]       = useState(null); // parsed feeds preview
  const [error, setError]       = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress]   = useState({ done: 0, total: 0 });
  const [selected, setSelected]   = useState(new Set()); // selected feed URLs
  const [done, setDone]           = useState(false);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null); setFeeds(null); setDone(false);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseOPML(ev.target.result);
        if (parsed.length === 0) throw new Error("No feeds found in this OPML file.");
        setFeeds(parsed);
        setSelected(new Set(parsed.map(f => f.url))); // select all by default
      } catch (err) {
        setError(err.message);
      }
    };
    reader.readAsText(file);
  }

  function toggleFeed(url) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(url) ? n.delete(url) : n.add(url);
      return n;
    });
  }

  function toggleAll() {
    if (selected.size === feeds.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(feeds.map(f => f.url)));
    }
  }

  async function handleImport() {
    const toImport = feeds.filter(f => selected.has(f.url));
    if (!toImport.length) return;
    setImporting(true);
    setProgress({ done: 0, total: toImport.length });

    let succeeded = 0;
    for (const feed of toImport) {
      try {
        await onImport(feed);
        succeeded++;
      } catch {
        // Skip failed feeds silently
      }
      setProgress({ done: succeeded, total: toImport.length });
    }

    setImporting(false);
    setDone(true);
  }

  // Group feeds by folder for display
  const folders = feeds ? [...new Set(feeds.map(f => f.folder || ""))] : [];

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: T.overlay, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: T.card, borderRadius: 18,
        padding: "28px 28px 24px", width: "100%", maxWidth: "min(520px, 95vw)",
        boxShadow: "0 24px 80px rgba(0,0,0,.22)",
        border: `1px solid ${T.border}`,
        animation: "fadeInScale .2s ease",
        maxHeight: "85vh", display: "flex", flexDirection: "column",
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 20, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: T.text, margin: "0 0 4px" }}>Import OPML</h2>
            <p style={{ fontSize: 13, color: T.textSecondary, margin: 0, lineHeight: 1.5 }}>
              Import feeds from Reeder, NetNewsWire, Feedly, Inoreader, or any RSS reader that exports OPML.
            </p>
          </div>
          <button onClick={onClose} style={{
            background: T.surface2, border: "none", borderRadius: 8,
            width: 30, height: 30, cursor: "pointer", color: T.textSecondary,
            fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
            marginLeft: 12, flexShrink: 0,
          }}>×</button>
        </div>

        {/* Success state */}
        {done && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>
              {progress.done} feed{progress.done !== 1 ? "s" : ""} imported
            </div>
            <div style={{ fontSize: 13, color: T.textSecondary, marginBottom: 24 }}>
              Your feeds are loading in the inbox now.
            </div>
            <Button onClick={onClose}>Done</Button>
          </div>
        )}

        {/* Importing progress */}
        {importing && (
          <div style={{ padding: "20px 0" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 12 }}>
              Importing {progress.done} / {progress.total} feeds…
            </div>
            <div style={{ height: 6, background: T.surface2, borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%", background: T.accent, borderRadius: 3,
                width: `${(progress.done / progress.total) * 100}%`,
                transition: "width .3s ease",
              }} />
            </div>
            <div style={{ fontSize: 12, color: T.textTertiary, marginTop: 8 }}>
              This may take a moment — each feed is being verified.
            </div>
          </div>
        )}

        {/* Initial upload state */}
        {!feeds && !importing && !done && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".opml,.xml"
              onChange={handleFile}
              style={{ display: "none" }}
            />
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${T.border}`, borderRadius: 14,
                padding: "36px 24px", textAlign: "center", cursor: "pointer",
                transition: "border-color .15s, background .15s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = T.accent;
                e.currentTarget.style.background = T.accentSurface;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = T.border;
                e.currentTarget.style.background = "transparent";
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>
                Click to select your OPML file
              </div>
              <div style={{ fontSize: 12, color: T.textTertiary }}>
                Supports .opml and .xml files
              </div>
            </div>

            {error && (
              <div style={{ fontSize: 13, color: T.danger, padding: "9px 13px", background: `${T.danger}15`, borderRadius: 9, marginTop: 14 }}>
                {error}
              </div>
            )}

            <div style={{ marginTop: 20, background: T.surface, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: T.textTertiary, marginBottom: 10 }}>
                How to export from your reader
              </div>
              {[
                ["Reeder",         "Settings → Manage Feeds → Export OPML"],
                ["NetNewsWire",    "File → Export Subscriptions…"],
                ["Feedly",         "Organize → Import/Export → Export OPML"],
                ["Inoreader",      "Preferences → Subscriptions → Export"],
              ].map(([app, path]) => (
                <div key={app} style={{ display: "flex", gap: 10, padding: "4px 0", alignItems: "baseline" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.text, minWidth: 100 }}>{app}</span>
                  <span style={{ fontSize: 12, color: T.textSecondary }}>{path}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feed preview + selection */}
        {feeds && !importing && !done && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            {/* Select all toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexShrink: 0 }}>
              <button onClick={toggleAll} style={{
                background: "none", border: `1px solid ${T.border}`, borderRadius: 7,
                padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                color: T.textSecondary, fontFamily: "inherit",
              }}>
                {selected.size === feeds.length ? "Deselect all" : "Select all"}
              </button>
              <span style={{ fontSize: 13, color: T.textSecondary }}>
                {selected.size} of {feeds.length} feeds selected
              </span>
            </div>

            {/* Scrollable feed list */}
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0, marginBottom: 16 }}>
              {folders.map(folder => {
                const folderFeeds = feeds.filter(f => (f.folder || "") === folder);
                return (
                  <div key={folder || "_root"}>
                    {folder && (
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: T.textTertiary, padding: "10px 4px 4px" }}>
                        📁 {folder}
                      </div>
                    )}
                    {folderFeeds.map(feed => {
                      const isSel = selected.has(feed.url);
                      const favicon = `https://www.google.com/s2/favicons?domain=${new URL(feed.url).hostname}&sz=32`;
                      return (
                        <div key={feed.url}
                          onClick={() => toggleFeed(feed.url)}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                            background: isSel ? T.accentSurface : "transparent",
                            transition: "background .1s", marginBottom: 2,
                          }}
                          onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = T.surface; }}
                          onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
                        >
                          {/* Checkbox */}
                          <div style={{
                            width: 16, height: 16, borderRadius: 5, flexShrink: 0,
                            border: `2px solid ${isSel ? T.accent : T.border}`,
                            background: isSel ? T.accent : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all .1s",
                          }}>
                            {isSel && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1, fontWeight: 700 }}>✓</span>}
                          </div>

                          {/* Favicon */}
                          <div style={{ width: 16, height: 16, borderRadius: 3, overflow: "hidden", background: T.surface2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <img src={favicon} alt="" width={12} height={12} style={{ display: "block" }} onError={e => { e.target.style.display = "none"; }} />
                          </div>

                          {/* Name + URL */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: isSel ? 500 : 400, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {feed.name || new URL(feed.url).hostname}
                            </div>
                            <div style={{ fontSize: 10, color: T.textTertiary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {feed.url}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
              <Button variant="secondary" onClick={() => { setFeeds(null); setSelected(new Set()); }} style={{ flex: 1, justifyContent: "center" }}>
                ← Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={selected.size === 0}
                style={{ flex: 2, justifyContent: "center" }}
              >
                Import {selected.size} feed{selected.size !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
