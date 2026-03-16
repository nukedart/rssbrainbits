import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { Button } from "./UI";
import { HIGHLIGHT_COLORS } from "./SelectionToolbar";

export default function NotePanel({ highlight, onSave, onDelete, onClose }) {
  const { T } = useTheme();
  const [note, setNote] = useState(highlight?.note || "");
  const color = HIGHLIGHT_COLORS.find((c) => c.id === highlight?.color) || HIGHLIGHT_COLORS[0];

  useEffect(() => { setNote(highlight?.note || ""); }, [highlight]);
  if (!highlight) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 700, background: T.overlay, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: T.card, borderRadius: "20px 20px 0 0",
        padding: "20px 20px 40px", width: "100%", maxWidth: 560,
        boxShadow: "0 -4px 30px rgba(0,0,0,.15)", animation: "slideUp .2s ease",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border, margin: "0 auto 20px" }} />

        <div style={{ background: color.bg, border: `1px solid ${color.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 14, color: color.text, lineHeight: 1.6, fontStyle: "italic" }}>
          "{highlight.passage}"
        </div>

        <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: T.textTertiary, display: "block", marginBottom: 8 }}>Your note</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Add a thought, connection, or question…" autoFocus rows={4}
          style={{
            width: "100%", boxSizing: "border-box", background: T.surface,
            border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px",
            fontSize: 14, color: T.text, fontFamily: "inherit", lineHeight: 1.6,
            resize: "vertical", outline: "none",
          }}
          onFocus={e => { e.target.style.borderColor = T.accent; }}
          onBlur={e => { e.target.style.borderColor = T.border; }}
        />

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <Button variant="danger" size="sm" onClick={() => { onDelete(highlight.id); onClose(); }}>Delete</Button>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => { onSave(highlight.id, note.trim()); onClose(); }}>Save note</Button>
        </div>
      </div>
    </div>
  );
}
