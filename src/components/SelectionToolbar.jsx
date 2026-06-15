import { useEffect, useRef, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { lookupTerm } from "../lib/fetchers";

export const HIGHLIGHT_COLORS = [
  { id: "yellow", label: "Yellow", bg: "#FEF08A", border: "#EAB308", text: "#713F12" },
  { id: "green",  label: "Green",  bg: "#BBF7D0", border: "#22C55E", text: "#14532D" },
  { id: "blue",   label: "Blue",   bg: "#BFDBFE", border: "#3B82F6", text: "#1E3A5F" },
  { id: "purple", label: "Purple", bg: "#E9D5FF", border: "#A855F7", text: "#3B0764" },
];

export function getHighlightStyle(colorId) {
  const c = HIGHLIGHT_COLORS.find((h) => h.id === colorId) || HIGHLIGHT_COLORS[0];
  return { backgroundColor: c.bg, borderRadius: 3, padding: "1px 0" };
}

export default function SelectionToolbar({ containerRef, onHighlight }) {
  const { T } = useTheme();
  const [toolbar, setToolbar] = useState(null);
  const [lookupResult, setLookupResult] = useState(null); // null | "loading" | string
  const toolbarRef = useRef(null);
  const tapStartRef = useRef(null);

  useEffect(() => {
    function handleSelectionEnd() {
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) { setToolbar(null); return; }
        const text = selection.toString().trim();
        if (text.length < 5) { setToolbar(null); return; }
        const range = selection.getRangeAt(0);
        if (!containerRef.current?.contains(range.commonAncestorContainer)) { setToolbar(null); return; }
        const rect = range.getBoundingClientRect();
        setToolbar({ x: rect.left + rect.width / 2, y: rect.top, bottom: rect.bottom, selectedText: text, range: range.cloneRange() });
        setLookupResult(null);
      }, 10);
    }

    function handleMouseDown(e) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target)) setToolbar(null);
    }

    function handleTouchStart(e) {
      tapStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }

    function handleTouchEnd(e) {
      const start = tapStartRef.current;
      tapStartRef.current = null;
      if (!start) return;
      const touch = e.changedTouches[0];
      if (Math.abs(touch.clientX - start.x) > 15 || Math.abs(touch.clientY - start.y) > 15) return;
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) return;
      const range = document.caretRangeFromPoint?.(touch.clientX, touch.clientY);
      if (!range) return;
      const node = range.startContainer;
      if (node.nodeType !== Node.TEXT_NODE) return;
      if (!containerRef.current?.contains(node)) return;
      const text = node.textContent || "";
      const pos = range.startOffset;
      let s = 0;
      for (let i = pos - 1; i >= 1; i--) {
        if (/[.!?]/.test(text[i - 1])) { s = i; break; }
      }
      while (s < pos && /\s/.test(text[s])) s++;
      let end = text.length;
      for (let i = pos; i < text.length; i++) {
        if (/[.!?]/.test(text[i])) { end = i + 1; break; }
      }
      if (end - s < 10) return;
      const r = document.createRange();
      r.setStart(node, s);
      r.setEnd(node, end);
      sel.removeAllRanges();
      sel.addRange(r);
    }

    document.addEventListener("mouseup", handleSelectionEnd);
    document.addEventListener("touchend", handleSelectionEnd);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd);
    return () => {
      document.removeEventListener("mouseup", handleSelectionEnd);
      document.removeEventListener("touchend", handleSelectionEnd);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [containerRef]);

  if (!toolbar) return null;

  function handlePickColor(colorId) {
    onHighlight({ passage: toolbar.selectedText, color: colorId, position: toolbar.range.startOffset });
    window.getSelection()?.removeAllRanges();
    setToolbar(null);
    setLookupResult(null);
  }

  async function handleLookup() {
    setLookupResult("loading");
    const result = await lookupTerm(toolbar.selectedText);
    setLookupResult(result || "No explanation available.");
  }

  const TOOLBAR_W = lookupResult ? 280 : 248;
  const TOOLBAR_H = lookupResult && lookupResult !== "loading" ? 90 : 52;
  const left = Math.max(8, Math.min(toolbar.x - TOOLBAR_W / 2, window.innerWidth - TOOLBAR_W - 8));
  // Show above selection if there's room, otherwise flip below
  const aboveY = toolbar.y - TOOLBAR_H - 8;
  const top = aboveY >= 8 ? aboveY : toolbar.bottom + 8;

  return (
    <div ref={toolbarRef} style={{
      position: "fixed", left, top,
      width: TOOLBAR_W, background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,.15)",
      zIndex: 600, animation: "slideUp .15s ease", overflow: "hidden",
    }}>
      {/* Lookup result panel */}
      {lookupResult && lookupResult !== "loading" && (
        <div style={{ padding: "10px 12px 8px", borderBottom: `1px solid ${T.border}` }}>
          <p style={{ margin: 0, fontSize: 12, color: T.text, lineHeight: 1.55 }}>{lookupResult}</p>
        </div>
      )}
      {lookupResult === "loading" && (
        <div style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, fontSize: 12, color: T.textTertiary }}>Looking up…</div>
      )}
      {/* Toolbar buttons */}
      <div role="toolbar" aria-label="Highlight color" style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 6, padding: "8px 12px",
      }}>
        <span style={{ fontSize: 11, color: T.textTertiary, fontWeight: 600, marginRight: 2 }}>Highlight</span>
        {HIGHLIGHT_COLORS.map((c) => (
          <button key={c.id} aria-label={`Highlight ${c.label}`} onClick={() => handlePickColor(c.id)} style={{
            width: 22, height: 22, borderRadius: "50%",
            background: c.bg, border: `2px solid ${c.border}`,
            cursor: "pointer", transition: "transform .1s", flexShrink: 0,
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.25)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
          />
        ))}
        <div style={{ width: 1, height: 16, background: T.border, flexShrink: 0, marginLeft: 2 }} />
        <button
          aria-label="Look up selected text"
          onClick={handleLookup}
          disabled={lookupResult === "loading"}
          style={{
            background: lookupResult && lookupResult !== "loading" ? T.accentSurface : "transparent",
            border: `1px solid ${lookupResult && lookupResult !== "loading" ? T.accent : T.border}`,
            borderRadius: 6, padding: "3px 8px", cursor: "pointer",
            fontSize: 11, fontWeight: 600, color: lookupResult && lookupResult !== "loading" ? T.accent : T.textSecondary,
            fontFamily: "inherit", flexShrink: 0, transition: "background .1s",
          }}
        >?</button>
      </div>
    </div>
  );
}
