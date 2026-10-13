import { useEffect, useRef, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { lookupTerm } from "../lib/fetchers";
import { SHAPE } from "../lib/tokens";

// Ids stay stable (saved highlights reference them); hues follow the Feedbox palette.
export const HIGHLIGHT_COLORS = [
  { id: "yellow", label: "Amber",  bg: "#F2C462", border: "#D9A530", mark: "rgba(242,196,98,0.45)",  text: "#3A2C05" },
  { id: "green",  label: "Teal",   bg: "#65D5C4", border: "#3FB5A3", mark: "rgba(101,213,196,0.40)", text: "#0C2824" },
  { id: "blue",   label: "Rose",   bg: "#EE9A8E", border: "#D6786A", mark: "rgba(238,154,142,0.45)", text: "#4A1A14" },
  { id: "purple", label: "Violet", bg: "#A99BE0", border: "#8878CC", mark: "rgba(169,155,224,0.45)", text: "#231A4D" },
];

export function getHighlightStyle(colorId) {
  const c = HIGHLIGHT_COLORS.find((h) => h.id === colorId) || HIGHLIGHT_COLORS[0];
  return { backgroundColor: c.mark, borderRadius: 3, padding: "1px 0" };
}

export default function SelectionToolbar({ containerRef, onHighlight }) {
  const { T } = useTheme();
  const [toolbar, setToolbar] = useState(null);
  const [lookupResult, setLookupResult] = useState(null); // null | "loading" | string
  const toolbarRef = useRef(null);
  const tapStartRef = useRef(null);
  const tapMovedRef = useRef(false);

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
      tapMovedRef.current = false;
    }

    function handleTouchMove(e) {
      const start = tapStartRef.current;
      if (!start) return;
      const touch = e.touches[0];
      if (Math.abs(touch.clientX - start.x) > 10 || Math.abs(touch.clientY - start.y) > 10) {
        tapMovedRef.current = true;
      }
    }

    function handleTouchEnd(e) {
      const start = tapStartRef.current;
      const moved = tapMovedRef.current;
      tapStartRef.current = null;
      tapMovedRef.current = false;
      // A finger that moved during this touch was scrolling, not tapping to
      // select — momentum scroll can still land within the old 15px release
      // radius of the start point, so distance-at-release alone isn't enough.
      if (!start || moved) return;
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
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd);
    return () => {
      document.removeEventListener("mouseup", handleSelectionEnd);
      document.removeEventListener("touchend", handleSelectionEnd);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
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

  const TOOLBAR_W = 304;
  const TOOLBAR_H = lookupResult && lookupResult !== "loading" ? 100 : 52;
  const left = Math.max(8, Math.min(toolbar.x - TOOLBAR_W / 2, window.innerWidth - TOOLBAR_W - 8));
  // Show above selection if there's room, otherwise flip below
  const aboveY = toolbar.y - TOOLBAR_H - 8;
  const top = aboveY >= 8 ? aboveY : toolbar.bottom + 8;
  const lookupActive = lookupResult && lookupResult !== "loading";

  return (
    <div ref={toolbarRef} style={{
      position: "fixed", left, top,
      width: TOOLBAR_W, background: "#2F373B", color: "#E8ECEE",
      borderRadius: lookupActive ? 20 : 26, boxShadow: "0 10px 30px rgba(0,0,0,.35)",
      zIndex: 600, animation: "slideUp .15s ease", overflow: "hidden",
    }}>
      {lookupActive && (
        <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid rgba(255,255,255,.12)" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#E8ECEE", lineHeight: 1.5 }}>{lookupResult}</p>
        </div>
      )}
      {lookupResult === "loading" && (
        <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,.12)", fontSize: 13, color: "#AEB7BB" }}>Looking up…</div>
      )}
      <div role="toolbar" aria-label="Highlight color" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 52, padding: "0 8px 0 16px", boxSizing: "border-box",
      }}>
        {HIGHLIGHT_COLORS.map((c) => (
          <button key={c.id} aria-label={`Highlight ${c.label}`} onClick={() => handlePickColor(c.id)} style={{
            width: 26, height: 26, padding: 0, borderRadius: "50%",
            background: c.bg, border: "none",
            cursor: "pointer", flexShrink: 0, WebkitTapHighlightColor: "transparent",
          }} />
        ))}
        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,.16)", flexShrink: 0 }} />
        <button aria-label="Highlight and add note" onClick={() => handlePickColor(HIGHLIGHT_COLORS[1].id)} style={{
          width: 44, height: 40, border: "none", borderRadius: 20, background: "rgba(255,255,255,.1)", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 19l1-4 9.5-9.5a2 2 0 0 1 3 3L9 18z"/></svg>
        </button>
        <button aria-label="Look up selected text" onClick={handleLookup} disabled={lookupResult === "loading"} style={{
          width: 40, height: 40, border: "none", borderRadius: 20, cursor: "pointer", flexShrink: 0,
          background: lookupActive ? "rgba(101,213,196,.16)" : "transparent", color: lookupActive ? "#65D5C4" : "#AEB7BB",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 5h9a4 4 0 0 1 4 4v10H9a4 4 0 0 1-4-4z"/><path d="M9 9h5M9 13h3"/></svg>
        </button>
      </div>
    </div>
  );
}
