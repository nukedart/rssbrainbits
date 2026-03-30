import { useEffect, useRef, useState } from "react";
import { useTheme } from "../hooks/useTheme";

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
  const toolbarRef = useRef(null);

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
        setToolbar({ x: rect.left + rect.width / 2, y: rect.top, selectedText: text, range: range.cloneRange() });
      }, 10);
    }

    function handleMouseDown(e) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target)) setToolbar(null);
    }

    document.addEventListener("mouseup", handleSelectionEnd);
    document.addEventListener("touchend", handleSelectionEnd);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mouseup", handleSelectionEnd);
      document.removeEventListener("touchend", handleSelectionEnd);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [containerRef]);

  if (!toolbar) return null;

  function handlePickColor(colorId) {
    onHighlight({ passage: toolbar.selectedText, color: colorId, position: toolbar.range.startOffset });
    window.getSelection()?.removeAllRanges();
    setToolbar(null);
  }

  const TOOLBAR_W = 210;
  const left = Math.max(8, Math.min(toolbar.x - TOOLBAR_W / 2, window.innerWidth - TOOLBAR_W - 8));

  return (
    <div ref={toolbarRef} style={{
      position: "fixed", left, top: toolbar.y - 56,
      width: TOOLBAR_W, background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,.15)",
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 6, padding: "8px 12px", zIndex: 600, animation: "slideUp .15s ease",
    }}>
      <span style={{ fontSize: 11, color: T.textTertiary, fontWeight: 600, marginRight: 2 }}>Highlight</span>
      {HIGHLIGHT_COLORS.map((c) => (
        <button key={c.id} title={c.label} onClick={() => handlePickColor(c.id)} style={{
          width: 22, height: 22, borderRadius: "50%",
          background: c.bg, border: `2px solid ${c.border}`,
          cursor: "pointer", transition: "transform .1s", flexShrink: 0,
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.25)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
        />
      ))}
    </div>
  );
}
