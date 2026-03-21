import { useState } from "react";
import { useTheme } from "../hooks/useTheme";

const FOLDER_COLORS = [
  { id:"gray",   hex:"#8A9099" },
  { id:"teal",   hex:"#accfae" },
  { id:"blue",   hex:"#2F6FED" },
  { id:"amber",  hex:"#AA8439" },
  { id:"red",    hex:"#EF4444" },
  { id:"purple", hex:"#8B5CF6" },
  { id:"green",  hex:"#22C55E" },
];

export default function FolderModal({ folder = null, onSave, onDelete, onClose }) {
  const { T } = useTheme();
  const isNew = !folder;

  const [name,  setName]  = useState(folder?.name  || "");
  const [color, setColor] = useState(folder?.color || "gray");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleSave() {
    if (!name.trim()) return;
    onSave({ name: name.trim(), color });
  }

  const overlayStyle = {
    position: "fixed", inset: 0, background: T.overlay,
    zIndex: 1100, display: "flex", alignItems: "center",
    justifyContent: "center", padding: 20,
  };

  const cardStyle = {
    background: T.card, borderRadius: 18, padding: "26px 24px 22px",
    width: "100%", maxWidth: "min(420px, 95vw)",
    border: `1px solid ${T.border}`,
    boxShadow: "0 24px 80px rgba(0,0,0,.2)",
    animation: "fadeInScale .18s ease",
  };

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📁</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{isNew ? "New collection" : "Edit collection"}</div>
          </div>
          <button onClick={onClose} style={{ background: T.surface2, border: "none", borderRadius: 7, width: 28, height: 28, cursor: "pointer", color: T.textSecondary, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>×</button>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: T.textTertiary, display: "block", marginBottom: 6 }}>Collection name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onClose(); }}
            placeholder="e.g. Tech, News, Work…"
            autoFocus
            style={{ width: "100%", background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 9, padding: "9px 12px", fontSize: 14, color: T.text, fontFamily: "inherit", outline: "none" }}
            onFocus={e => { e.target.style.borderColor = T.accent; }}
            onBlur={e => { e.target.style.borderColor = T.border; }}
          />
        </div>

        {/* Color picker */}
        <div style={{ marginBottom: 22 }}>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: T.textTertiary, display: "block", marginBottom: 8 }}>Color</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {FOLDER_COLORS.map(c => (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                style={{
                  width: 26, height: 26, borderRadius: "50%", border: "none",
                  background: c.hex, cursor: "pointer",
                  outline: color === c.id ? `3px solid ${c.hex}` : "none",
                  outlineOffset: 2,
                  transform: color === c.id ? "scale(1.2)" : "scale(1)",
                  transition: "all .12s",
                }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          {!isNew && !confirmDelete && (
            <button onClick={() => setConfirmDelete(true)} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 9, padding: "9px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: T.danger, fontFamily: "inherit" }}>
              Delete
            </button>
          )}
          {confirmDelete && (
            <button onClick={() => onDelete(folder.id)} style={{ background: "#FEE2E2", border: "1px solid #F87171", borderRadius: 9, padding: "9px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#991B1B", fontFamily: "inherit" }}>
              Confirm delete
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 9, padding: "9px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: T.textSecondary, fontFamily: "inherit" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={!name.trim()} style={{ background: name.trim() ? T.accent : T.surface2, border: "none", borderRadius: 9, padding: "9px 18px", cursor: name.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 600, color: name.trim() ? "#fff" : T.textTertiary, fontFamily: "inherit", transition: "all .15s" }}>
            {isNew ? "Create folder" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
