// ── ArticleNotesPanel — notes sidebar inside ContentViewer ────
import { useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import { createNote, deleteNote } from "../lib/supabase";

export default function ArticleNotesPanel({ articleUrl, articleTitle, notes, onNotesChange, onClose }) {
  const { T }        = useTheme();
  const { user }     = useAuth();
  const { isMobile } = useBreakpoint();
  const [creating, setCreating] = useState(notes.length === 0);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody]   = useState("");
  const [saving, setSaving]     = useState(false);

  async function handleCreate() {
    if (!newTitle.trim() && !newBody.trim()) { setCreating(false); return; }
    setSaving(true);
    try {
      const note = await createNote(user.id, {
        title: newTitle.trim() || (articleTitle ? articleTitle.slice(0, 60) : "Untitled Note"),
        body: newBody.trim(),
        article_url: articleUrl,
        article_title: articleTitle,
      });
      onNotesChange([note, ...notes]);
      setNewTitle(""); setNewBody(""); setCreating(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    await deleteNote(id);
    onNotesChange(notes.filter(n => n.id !== id));
  }

  // Desktop: right-side drawer inside ContentViewer
  // Mobile: bottom sheet overlay
  if (isMobile) {
    return (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 700, background: T.overlay, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div style={{
          background: T.card, borderRadius: "20px 20px 0 0",
          padding: "20px 20px 40px", width: "100%", maxWidth: 560,
          maxHeight: "70vh", display: "flex", flexDirection: "column",
          boxShadow: "0 -4px 30px rgba(0,0,0,.2)", animation: "slideUp .2s ease",
        }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border, margin: "0 auto 16px" }} />
          <PanelContent
            articleTitle={articleTitle}
            notes={notes}
            creating={creating}
            setCreating={setCreating}
            newTitle={newTitle}
            setNewTitle={setNewTitle}
            newBody={newBody}
            setNewBody={setNewBody}
            saving={saving}
            onCreate={handleCreate}
            onDelete={handleDelete}
            onClose={onClose}
            T={T}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: "absolute", right: 0, top: 0, bottom: 0, width: 300,
      background: T.card, borderLeft: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column",
      boxShadow: "-8px 0 32px rgba(0,0,0,.14)",
      animation: "slideInRight .18s ease",
      zIndex: 50,
    }}>
      <PanelContent
        articleTitle={articleTitle}
        notes={notes}
        creating={creating}
        setCreating={setCreating}
        newTitle={newTitle}
        setNewTitle={setNewTitle}
        newBody={newBody}
        setNewBody={setNewBody}
        saving={saving}
        onCreate={handleCreate}
        onDelete={handleDelete}
        onClose={onClose}
        T={T}
      />
    </div>
  );
}

function PanelContent({ articleTitle, notes, creating, setCreating, newTitle, setNewTitle, newBody, setNewBody, saving, onCreate, onDelete, onClose, T }) {
  return (
    <>
      {/* Header */}
      <div style={{ padding: "0 0 12px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.text, flex: 1 }}>Article Notes</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: T.textTertiary, padding: "2px 6px", lineHeight: 1 }}>✕</button>
        </div>
        {articleTitle && (
          <div style={{ fontSize: 11, color: T.textTertiary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {articleTitle}
          </div>
        )}
      </div>

      {/* Notes list + create */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 0 0" }}>

        {notes.map(note => (
          <NoteRow key={note.id} note={note} onDelete={onDelete} T={T} />
        ))}

        {creating ? (
          <div style={{ background: T.surface, borderRadius: 10, padding: "12px 14px", marginTop: notes.length ? 12 : 0 }}>
            <input
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Title (optional)"
              style={{ width: "100%", boxSizing: "border-box", background: "none", border: "none", outline: "none", fontSize: 13, fontWeight: 600, color: T.text, fontFamily: "inherit", marginBottom: 8, padding: 0 }}
            />
            <textarea
              value={newBody}
              onChange={e => setNewBody(e.target.value)}
              placeholder="Write your note…"
              onKeyDown={e => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onCreate();
                if (e.key === "Escape") { setCreating(false); }
              }}
              style={{ width: "100%", boxSizing: "border-box", background: "none", border: "none", outline: "none", resize: "none", fontSize: 12, color: T.text, fontFamily: "inherit", lineHeight: 1.7, minHeight: 80, padding: 0, display: "block" }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <button onClick={onCreate} disabled={saving || (!newTitle.trim() && !newBody.trim())}
                style={{ background: T.accent, border: "none", borderRadius: 7, padding: "5px 16px", fontSize: 12, fontWeight: 600, color: "#03210b", cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={() => { setCreating(false); }}
                style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 7, padding: "5px 10px", fontSize: 12, color: T.textSecondary, cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
              <span style={{ fontSize: 10, color: T.textTertiary, alignSelf: "center", marginLeft: 4 }}>⌘↵</span>
            </div>
          </div>
        ) : (
          <button onClick={() => setCreating(true)}
            style={{
              marginTop: notes.length ? 12 : 0,
              width: "100%", background: "none",
              border: `1.5px dashed ${T.border}`, borderRadius: 10,
              padding: "10px 14px", fontSize: 12, color: T.textTertiary,
              cursor: "pointer", fontFamily: "inherit", transition: "all .12s", textAlign: "left",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textTertiary; }}
          >
            + New note
          </button>
        )}
      </div>
    </>
  );
}

function NoteRow({ note, onDelete, T }) {
  const preview = (note.body || "").replace(/\n+/g, " ").slice(0, 80);
  return (
    <div style={{ background: T.surface, borderRadius: 10, padding: "10px 13px", marginBottom: 8, position: "relative", paddingRight: 30 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: preview ? 3 : 0 }}>
        {note.title || "Untitled Note"}
      </div>
      {preview && (
        <div style={{ fontSize: 11, color: T.textSecondary, lineHeight: 1.55 }}>
          {preview}{(note.body || "").length > 80 ? "…" : ""}
        </div>
      )}
      <button onClick={() => onDelete(note.id)}
        style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: T.textTertiary, padding: "2px 4px", opacity: 0.25, transition: "opacity .12s, color .12s" }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "#F87171"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "0.25"; e.currentTarget.style.color = T.textTertiary; }}
      >✕</button>
    </div>
  );
}
