import { useState, useEffect, useRef } from "react";
import { useDialog } from "../hooks/useDialog";
import { useTheme } from "../hooks/useTheme";
import { SHAPE } from "../lib/tokens";

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
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef(null);
  useDialog(dialogRef, { onClose });
  const [mob, setMob] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onMq = e => setMob(e.matches);
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  async function handleSave() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), color });
    } finally {
      setSaving(false);
    }
  }

  const overlayStyle = {
    position: "fixed", inset: 0, background: T.overlay,
    zIndex: 1100, display: "flex", alignItems: mob ? "flex-end" : "center",
    justifyContent: "center", padding: mob ? 0 : 20,
  };

  const cardStyle = {
    background: T.card, borderRadius: mob ? "24px 24px 0 0" : 24,
    padding: mob ? "12px 24px calc(22px + env(safe-area-inset-bottom))" : "26px 24px 22px",
    width: "100%", maxWidth: mob ? "none" : "min(420px, 95vw)", maxHeight: "92vh", overflowY: "auto",
    border: `1px solid ${T.border}`,
    boxShadow: SHAPE.shadowFloat,
    animation: mob ? "slideUp .22s ease" : "fadeInScale .18s ease",
  };

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="folder-modal-title" style={cardStyle}>
        <div aria-hidden="true" style={{ display: mob ? "block" : "none", width: 36, height: 4, borderRadius: 2, background: T.border, margin: "0 auto 16px" }} />
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div id="folder-modal-title" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: T.text }}>{isNew ? "New collection" : "Edit collection"}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", borderRadius: "50%", width: 44, height: 44, cursor: "pointer", color: T.textSecondary, fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>×</button>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="folder-name" style={{ fontSize: 13, fontWeight: 500, color: T.textTertiary, display: "block", marginBottom: 8 }}>Collection name</label>
          <input
            id="folder-name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
            placeholder="e.g. Tech, News, Work…"
            autoFocus
            style={{ width: "100%", boxSizing: "border-box", height: 48, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 14, padding: "0 14px", fontSize: 16, color: T.text, fontFamily: "inherit", outline: "none" }}
            onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accent}33`; }}
            onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
          />
        </div>

        {/* Color picker */}
        <div style={{ marginBottom: 22 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: T.textTertiary, display: "block", marginBottom: 10 }}>Color</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {FOLDER_COLORS.map(c => (
              <button
                key={c.id} aria-label={c.id} aria-pressed={color === c.id}
                onClick={() => setColor(c.id)}
                style={{
                  width: 32, height: 32, borderRadius: "50%", border: "none",
                  background: c.hex, cursor: "pointer",
                  outline: color === c.id ? `3px solid ${c.hex}` : "none",
                  outlineOffset: 2,
                  transform: color === c.id ? "scale(1.2)" : "scale(1)",
                  transition: "transform .12s, outline-color .12s",
                }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
          {!isNew && !confirmDelete && (
            <button onClick={() => setConfirmDelete(true)} style={{ background: "transparent", border: "none", borderRadius: 14, height: 48, padding: "0 16px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: T.danger, fontFamily: "inherit" }}>
              Delete
            </button>
          )}
          {confirmDelete && (
            <button onClick={() => onDelete(folder.id)} style={{ background: `${T.danger}22`, border: `1px solid ${T.danger}`, borderRadius: 14, height: 48, padding: "0 16px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: T.danger, fontFamily: "inherit" }}>
              Confirm delete
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: "transparent", border: "none", borderRadius: 14, height: 48, padding: "0 16px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: T.textSecondary, fontFamily: "inherit" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={!name.trim() || saving} style={{ background: name.trim() ? T.accent : T.surface2, border: "none", borderRadius: 14, height: 48, padding: "0 22px", cursor: name.trim() && !saving ? "pointer" : "default", fontSize: 14, fontWeight: 600, color: name.trim() ? T.accentText : T.textTertiary, fontFamily: "inherit", transition: "background .15s, color .15s" }}>
            {saving ? "Saving…" : (isNew ? "Create folder" : "Save")}
          </button>
        </div>
      </div>
    </div>
  );
}
