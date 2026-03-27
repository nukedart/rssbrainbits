// ── NotesPage.jsx — Notes Library + Editor ────────────────────
import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import {
  getNotes, createNote, updateNote, deleteNote,
  getAllHighlights, deleteHighlight, updateHighlightNote, getAllArticleTags,
} from "../lib/supabase";
import { allHighlightsToMarkdown, copyToClipboard, downloadFile } from "../lib/exportUtils.js";
import { HIGHLIGHT_COLORS } from "./SelectionToolbar";
import { Spinner, EmptyState } from "./UI";
import { isProUser } from "../lib/plan";

const ContentViewerLazy = lazy(() => import("./ContentViewer"));

// ── Setup SQL shown when notes table is missing ───────────────
const SETUP_SQL = `CREATE TABLE IF NOT EXISTS public.notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT 'Untitled Note',
  body          TEXT NOT NULL DEFAULT '',
  tags          TEXT[] NOT NULL DEFAULT '{}',
  color         TEXT DEFAULT 'teal',
  article_url   TEXT DEFAULT NULL,
  article_title TEXT DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notes" ON public.notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS notes_user_updated
  ON public.notes(user_id, updated_at DESC);`;

// ── Migration SQL for existing notes tables ───────────────────
const MIGRATION_SQL = `ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS article_url   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS article_title TEXT DEFAULT NULL;`;

// ── Card accent colours per note.color ───────────────────────
const NOTE_COLORS = {
  teal:   { strip: "#accfae", chip: "rgba(172,207,174,0.13)", text: "#accfae" },
  blue:   { strip: "#2F6FED", chip: "rgba(47,111,237,0.12)",  text: "#6B9BF2" },
  amber:  { strip: "#C4993C", chip: "rgba(196,153,60,0.12)",  text: "#C4993C" },
  purple: { strip: "#A78BFA", chip: "rgba(167,139,250,0.12)", text: "#A78BFA" },
  red:    { strip: "#F87171", chip: "rgba(248,113,113,0.12)", text: "#F87171" },
  green:  { strip: "#4ADE80", chip: "rgba(74,222,128,0.12)",  text: "#4ADE80" },
  gray:   { strip: "#8A9099", chip: "rgba(138,144,153,0.12)", text: "#9AA0A8" },
};

// Map SelectionToolbar highlight color ids → note color keys
const HL_COLOR = { yellow:"amber", green:"green", blue:"blue", purple:"purple", red:"red", orange:"amber" };

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso), now = new Date(), diff = now - d;
  if (diff < 86400000) return "Today";
  if (diff < 172800000) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── NoteCard ──────────────────────────────────────────────────
function NoteCard({ note, onOpen, onReread, T, featured, isMobile }) {
  const col = NOTE_COLORS[note.color] || NOTE_COLORS.teal;
  const px = featured ? 28 : 20;
  const preview = (note.body || "").replace(/\n+/g, " ").slice(0, featured ? 220 : 120);
  const firstTag = note.tags?.[0];
  const words = note.body?.trim().split(/\s+/).filter(Boolean).length || 0;

  return (
    <div
      onClick={() => onOpen(note)}
      style={{
        background: T.card, borderRadius: 14,
        padding: `${featured ? 26 : 18}px ${px}px 0`,
        cursor: "pointer", position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column",
        minHeight: featured ? (isMobile ? 160 : 200) : 150,
        transition: "transform .15s, box-shadow .15s",
        WebkitTapHighlightColor: "transparent",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(0,0,0,.22)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Meta row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: featured ? 14 : 10 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".13em",
          background: col.chip, color: col.text, padding: "3px 8px", borderRadius: 4, flexShrink: 0,
        }}>{firstTag || "Note"}</span>
        <span style={{ fontSize: 11, color: T.textTertiary, marginLeft: "auto", flexShrink: 0 }}>
          {fmtDate(note.updated_at)}
        </span>
      </div>

      {/* Title */}
      <h2 style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: featured ? (isMobile ? 22 : 28) : (isMobile ? 17 : 19),
        fontWeight: 500, color: T.text,
        lineHeight: 1.22, margin: "0 0 10px", letterSpacing: "-.02em",
      }}>
        {note.title || "Untitled Note"}
      </h2>

      {/* Preview */}
      {preview && (
        <p style={{ fontSize: featured ? 14 : 13, color: T.textSecondary, lineHeight: 1.65, margin: "0 0 14px", flex: 1 }}>
          {preview}{(note.body || "").length > (featured ? 220 : 120) ? "…" : ""}
        </p>
      )}

      {/* Featured: word count */}
      {featured && words > 0 && (
        <div style={{ fontSize: 11, color: T.textTertiary, marginBottom: 14 }}>{words} words</div>
      )}

      {/* Article link */}
      {note.article_url && onReread && (
        <div onClick={e => { e.stopPropagation(); onReread({ url: note.article_url, title: note.article_title, source: "" }); }}
          style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, padding: "5px 8px", background: "rgba(0,0,0,.06)", borderRadius: 7, cursor: "pointer" }}
          title="Re-read source article"
        >
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: T.textTertiary, flexShrink: 0 }}>From</span>
          <span style={{ fontSize: 11, color: T.textSecondary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {note.article_title || note.article_url}
          </span>
          <span style={{ fontSize: 11, color: T.textTertiary, flexShrink: 0 }}>↗</span>
        </div>
      )}

      {/* Colour strip */}
      <div style={{ height: 3, background: col.strip, margin: `auto -${px}px 0` }} />
    </div>
  );
}

// ── NoteListRow (compact list view) ──────────────────────────
function NoteListRow({ note, onOpen, T }) {
  const col = NOTE_COLORS[note.color] || NOTE_COLORS.teal;
  const preview = (note.body || "").replace(/\n+/g, " ").slice(0, 90);
  return (
    <div onClick={() => onOpen(note)} style={{
      display: "flex", alignItems: "center", gap: 14,
      background: T.card, borderRadius: 10, padding: "11px 16px",
      cursor: "pointer", transition: "background .12s",
      borderLeft: `3px solid ${col.strip}`,
    }}
      onMouseEnter={e => e.currentTarget.style.background = T.surface}
      onMouseLeave={e => e.currentTarget.style.background = T.card}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 15, fontWeight: 500, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-.01em" }}>
          {note.title || "Untitled Note"}
        </div>
        {preview && (
          <div style={{ fontSize: 12, color: T.textTertiary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
            {preview}{(note.body?.length || 0) > 90 ? "…" : ""}
          </div>
        )}
      </div>
      <span style={{ fontSize: 11, color: T.textTertiary, flexShrink: 0 }}>{fmtDate(note.updated_at)}</span>
    </div>
  );
}

// ── HighlightCard ─────────────────────────────────────────────
function HighlightCard({ highlight, onDelete, onEdit, onReread, T, isMobile }) {
  const hDef = HIGHLIGHT_COLORS.find(c => c.id === highlight.color) || HIGHLIGHT_COLORS[0];
  const colKey = HL_COLOR[highlight.color] || "teal";
  const col = NOTE_COLORS[colKey] || NOTE_COLORS.teal;
  const [editing, setEditing] = useState(false);
  const [noteVal, setNoteVal] = useState(highlight.note || "");
  const [deleting, setDeleting] = useState(false);

  async function saveNote() {
    await onEdit(highlight.id, noteVal);
    setEditing(false);
  }

  async function handleDelete(e) {
    e.stopPropagation();
    setDeleting(true);
    await onDelete(highlight.id);
  }

  const passage = highlight.passage || "";

  return (
    <div style={{
      background: T.card, borderRadius: 14, padding: "18px 20px 0",
      position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column", minHeight: 150,
      transition: "transform .15s, box-shadow .15s",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(0,0,0,.22)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Source chip + date */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".13em", background: col.chip, color: col.text, padding: "3px 8px", borderRadius: 4, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {(highlight.article_title || "Highlight").slice(0, 28)}
        </span>
        <span style={{ fontSize: 11, color: T.textTertiary, flexShrink: 0 }}>{fmtDate(highlight.created_at)}</span>
      </div>

      {/* Passage */}
      <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 15, fontStyle: "italic", fontWeight: 400, color: T.text, lineHeight: 1.6, margin: "0 0 10px", flex: 1 }}>
        "{passage.length > 200 ? passage.slice(0, 200) + "…" : passage}"
      </p>

      {/* Note editor */}
      {editing ? (
        <div style={{ marginBottom: 10 }}>
          <textarea autoFocus value={noteVal} onChange={e => setNoteVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveNote(); if (e.key === "Escape") setEditing(false); }}
            style={{ width: "100%", boxSizing: "border-box", background: T.surface2, border: `1.5px solid ${T.accent}`, borderRadius: 7, padding: "7px 10px", fontSize: 12, color: T.text, fontFamily: "inherit", outline: "none", resize: "none", minHeight: 50 }}
          />
          <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
            <button onClick={saveNote} style={{ background: T.accent, border: "none", borderRadius: 5, padding: "3px 10px", fontSize: 11, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Save</button>
            <button onClick={() => setEditing(false)} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 5, padding: "3px 8px", fontSize: 11, color: T.textSecondary, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          </div>
        </div>
      ) : highlight.note ? (
        <div onClick={e => { e.stopPropagation(); setEditing(true); setNoteVal(highlight.note); }}
          style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5, background: T.surface, borderRadius: 6, padding: "6px 8px", marginBottom: 10, cursor: "text" }}>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: T.textTertiary, display: "block", marginBottom: 2 }}>Note</span>
          {highlight.note}
        </div>
      ) : null}

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        {!editing && !highlight.note && (
          <button onClick={e => { e.stopPropagation(); setEditing(true); setNoteVal(""); }}
            style={{ background: "none", border: `1px dashed ${T.border}`, borderRadius: 5, padding: "2px 8px", fontSize: 11, color: T.textTertiary, cursor: "pointer", fontFamily: "inherit" }}>
            + Note
          </button>
        )}
        <div style={{ flex: 1 }} />
        {highlight.article_url && (
          <button onClick={e => { e.stopPropagation(); onReread({ url: highlight.article_url, title: highlight.article_title, source: "" }); }}
            style={{ background: "none", border: "none", fontSize: 11, color: T.textTertiary, cursor: "pointer", fontFamily: "inherit", padding: "2px 4px", transition: "color .12s" }}
            onMouseEnter={e => e.currentTarget.style.color = T.accent}
            onMouseLeave={e => e.currentTarget.style.color = T.textTertiary}
          >Re-read ↗</button>
        )}
        <button onClick={handleDelete} disabled={deleting}
          style={{ background: "none", border: "none", fontSize: 13, color: T.textTertiary, cursor: "pointer", fontFamily: "inherit", padding: "2px 6px", opacity: isMobile ? 0.4 : 0.2, transition: "opacity .12s, color .12s" }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "#F87171"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = isMobile ? "0.4" : "0.2"; e.currentTarget.style.color = T.textTertiary; }}
        >{deleting ? "…" : "✕"}</button>
      </div>

      {/* Strip */}
      <div style={{ height: 3, background: hDef.border, margin: "0 -20px" }} />
    </div>
  );
}

// ── TagCard ───────────────────────────────────────────────────
function TagCard({ title, url, tags, onSearch, onReread, T }) {
  return (
    <div style={{ background: T.card, borderRadius: 14, padding: "18px 20px 0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 16, fontWeight: 500, color: T.text, lineHeight: 1.3, flex: 1, minWidth: 0, letterSpacing: "-.01em" }}>{title}</div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button onClick={() => onReread({ url, title, source: "" })}
            style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "2px 8px", fontSize: 11, color: T.textSecondary, cursor: "pointer", fontFamily: "inherit", transition: "all .12s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSecondary; }}
          >Re-read</button>
          <a href={url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 13, color: T.textTertiary, textDecoration: "none", lineHeight: "22px" }}
            onMouseEnter={e => e.currentTarget.style.color = T.accent}
            onMouseLeave={e => e.currentTarget.style.color = T.textTertiary}
          >↗</a>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
        {tags.map(tag => (
          <span key={tag} onClick={() => onSearch(tag)}
            style={{ padding: "3px 10px", borderRadius: 20, background: T.accentSurface, color: T.accent, border: `1px solid ${T.accent}28`, fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "background .12s" }}
            onMouseEnter={e => { e.currentTarget.style.background = T.accent; e.currentTarget.style.color = T.accentText; }}
            onMouseLeave={e => { e.currentTarget.style.background = T.accentSurface; e.currentTarget.style.color = T.accent; }}
          >#{tag}</span>
        ))}
      </div>
      <div style={{ height: 3, background: T.accent, margin: "0 -20px" }} />
    </div>
  );
}

// ── NoteEditor ────────────────────────────────────────────────
function NoteEditor({ note, onClose, onSave, onDelete, T, isMobile }) {
  const [title, setTitle] = useState(note?.title === "Untitled Note" ? "" : (note?.title || ""));
  const [body, setBody]   = useState(note?.body || "");
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [zenMode, setZenMode]       = useState(false);
  const [distillResult, setDistillResult] = useState(null);
  const [distilling, setDistilling] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);
  const saveTimer  = useRef(null);
  const lastSaved  = useRef({ title: note?.title || "", body: note?.body || "" });
  const titleRef   = useRef(null);
  const bodyRef    = useRef(null);

  // Auto-resize textarea helper
  function resize(el) { if (!el) return; el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
  useEffect(() => { resize(titleRef.current); }, [title]);
  useEffect(() => { resize(bodyRef.current); }, [body]);

  // Focus on mount
  useEffect(() => {
    setTimeout(() => {
      if (!title) titleRef.current?.focus();
      else bodyRef.current?.focus();
    }, 50);
  }, []);

  function scheduleSave(t, b) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaved(false);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await onSave({ title: t || "Untitled Note", body: b });
      lastSaved.current = { title: t, body: b };
      setSaving(false); setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 900);
  }

  async function handleClose() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      const t = title, b = body;
      if (t !== lastSaved.current.title || b !== lastSaved.current.body) {
        await onSave({ title: t || "Untitled Note", body: b });
      }
    }
    onClose();
  }

  async function handleExport() {
    await copyToClipboard(`# ${title || "Untitled Note"}\n\n${body}`);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  }

  async function handleAIDistill() {
    if (!body.trim() || distilling) return;
    setDistilling(true);
    try {
      const { summarizeContent } = await import("../lib/fetchers");
      const result = await summarizeContent(body, title || "Note", "brief");
      setDistillResult(result);
    } catch { setDistillResult("Unable to distill. Check your AI settings."); }
    setDistilling(false);
  }

  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(words / 200));
  const dateStr = note?.created_at
    ? new Date(note.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, background: T.bg, display: "flex", flexDirection: "column" }}>

      {/* Top bar */}
      {!zenMode && (
        <div style={{ height: 48, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", padding: "0 24px", flexShrink: 0, gap: 0 }}>
          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic", fontSize: 16, fontWeight: 500, color: T.accent, letterSpacing: "-.01em" }}>Feed Box</span>
          <span style={{ color: T.border, margin: "0 14px", fontSize: 20, fontWeight: 200 }}>|</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Editor</span>
          <span style={{ color: T.textTertiary, margin: "0 10px", fontSize: 12 }}>·</span>
          <button onClick={handleClose}
            style={{ fontSize: 13, color: T.textTertiary, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, transition: "color .12s" }}
            onMouseEnter={e => e.currentTarget.style.color = T.text}
            onMouseLeave={e => e.currentTarget.style.color = T.textTertiary}
          >All Notes</button>
          <div style={{ flex: 1 }} />
          {saving && <span style={{ fontSize: 11, color: T.textTertiary }}>Saving…</span>}
          {saved && !saving && <span style={{ fontSize: 11, color: T.accent }}>✓ Saved</span>}
          <button onClick={handleExport}
            style={{ marginLeft: 16, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 14px", fontSize: 12, fontWeight: 600, color: copiedExport ? T.accent : T.textSecondary, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, transition: "color .15s" }}
          >{copiedExport ? "✓ Copied" : "↑ Export"}</button>
          <button
            onClick={() => { if (window.confirm("Delete this note?")) { onDelete(note.id); onClose(); } }}
            style={{ marginLeft: 6, background: "none", border: "none", padding: "5px 8px", fontSize: 14, color: T.textTertiary, cursor: "pointer", borderRadius: 6, transition: "color .12s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#F87171"}
            onMouseLeave={e => e.currentTarget.style.color = T.textTertiary}
            title="Delete note"
          >✕</button>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 720, padding: isMobile ? "28px 20px 120px" : "48px 40px 120px" }}>

          {/* Session label */}
          {!zenMode && (
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: note?.article_url ? 14 : 22 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".16em", color: T.textTertiary }}>Focused Session</span>
              <span style={{ fontSize: 12, color: T.textTertiary }}>{dateStr}</span>
            </div>
          )}

          {/* Article context */}
          {!zenMode && note?.article_url && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, padding: "9px 14px", background: T.surface, borderRadius: 10, border: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: T.textTertiary, flexShrink: 0 }}>From</span>
              <span style={{ fontSize: 12, color: T.textSecondary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {note.article_title || note.article_url}
              </span>
              <a href={note.article_url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: T.accent, textDecoration: "none", flexShrink: 0, fontWeight: 500 }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
              >Re-read ↗</a>
            </div>
          )}

          {/* Title */}
          <textarea ref={titleRef} value={title} onChange={e => { setTitle(e.target.value); scheduleSave(e.target.value, body); }}
            placeholder="Untitled Note"
            rows={1}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "none", border: "none", outline: "none", resize: "none", overflow: "hidden",
              fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic",
              fontSize: isMobile ? 28 : 40, fontWeight: 500,
              color: title ? T.text : T.textTertiary, lineHeight: 1.15,
              letterSpacing: "-.03em", marginBottom: 28, padding: 0, display: "block",
            }}
          />

          {/* Body */}
          <textarea ref={bodyRef} value={body} onChange={e => { setBody(e.target.value); scheduleSave(title, e.target.value); }}
            placeholder="Start writing…"
            style={{
              width: "100%", boxSizing: "border-box",
              background: "none", border: "none", outline: "none", resize: "none", overflow: "hidden",
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: isMobile ? 16 : 19, fontWeight: 400,
              color: T.text, lineHeight: 1.85, letterSpacing: "-.01em",
              padding: 0, minHeight: "35vh", display: "block",
            }}
          />

          {/* AI Distill result */}
          {distillResult && (
            <div style={{ marginTop: 32, padding: "16px 18px", background: T.surface, borderRadius: 12, borderLeft: `3px solid ${T.accent}` }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: T.accent }}>✦ AI Distill</span>
                <button onClick={() => setDistillResult(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textTertiary, fontSize: 13, padding: 0, marginLeft: "auto" }}>✕</button>
              </div>
              <p style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{distillResult}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom toolbar */}
      <div style={{ borderTop: `1px solid ${T.border}`, padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexShrink: 0, background: T.bg }}>
        <button onClick={handleAIDistill} disabled={distilling || !body.trim()}
          style={{ background: "none", border: "none", cursor: body.trim() && !distilling ? "pointer" : "default", fontFamily: "inherit", fontSize: 13, color: distilling ? T.accent : T.textTertiary, display: "flex", alignItems: "center", gap: 7, padding: "4px 12px", borderRadius: 8, opacity: body.trim() ? 1 : 0.4, transition: "color .15s" }}
          onMouseEnter={e => { if (body.trim() && !distilling) e.currentTarget.style.color = T.accent; }}
          onMouseLeave={e => { if (!distilling) e.currentTarget.style.color = T.textTertiary; }}
        >
          <span style={{ fontSize: 11 }}>✦</span>
          {distilling ? "Distilling…" : "AI Distill"}
        </button>
        <div style={{ width: 1, height: 14, background: T.border }} />
        <button onClick={() => setZenMode(v => !v)}
          style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: zenMode ? T.accent : T.textTertiary, display: "flex", alignItems: "center", gap: 7, padding: "4px 12px", borderRadius: 8, transition: "color .15s" }}
          onMouseEnter={e => { if (!zenMode) e.currentTarget.style.color = T.text; }}
          onMouseLeave={e => { if (!zenMode) e.currentTarget.style.color = T.textTertiary; }}
        >
          <span style={{ fontSize: 12 }}>◎</span>
          Zen Mode
        </button>
      </div>

      {/* Footer stats */}
      {!zenMode && (
        <div style={{ borderTop: `1px solid ${T.border}`, padding: isMobile ? "10px 20px" : "10px 32px", display: "flex", gap: 28, alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: T.textTertiary }}>Words</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.text, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{words}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: T.textTertiary }}>Reading Time</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.text, lineHeight: 1.1 }}>~{readTime} min</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main NotesPage ─────────────────────────────────────────────
export default function NotesPage() {
  const { T } = useTheme();
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();
  const isPro = isProUser(user);

  const [notes, setNotes]           = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [articleTags, setArticleTags] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [tab, setTab]               = useState("notes");
  const [viewMode, setViewMode]     = useState("grid");
  const [sortBy, setSortBy]         = useState("modified");
  const [search, setSearch]         = useState("");
  const [editorNote, setEditorNote] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [sqlCopied, setSqlCopied]   = useState(false);
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [migrationOpen, setMigrationOpen]     = useState(false);
  const [migCopied, setMigCopied]             = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getNotes(user.id).catch(err => {
        const msg = err?.message || "";
        if (msg.includes("does not exist") || err?.code === "42P01" || msg.includes("relation")) {
          setSetupNeeded(true); return [];
        }
        throw err;
      }),
      getAllHighlights(user.id),
      isPro ? getAllArticleTags(user.id) : Promise.resolve([]),
    ])
      .then(([n, h, t]) => {
        setNotes(n); setHighlights(h); setArticleTags(t);
        // Detect if article_url column is missing (migration needed)
        if (n.length > 0 && !Object.prototype.hasOwnProperty.call(n[0], "article_url")) {
          setMigrationNeeded(true);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  // ── Notes CRUD ─────────────────────────────────────────────
  async function handleNewNote() {
    if (setupNeeded) return;
    const note = await createNote(user.id);
    setNotes(prev => [note, ...prev]);
    setEditorNote(note);
  }

  async function handleSaveNote({ title, body }) {
    if (!editorNote) return;
    const updated = await updateNote(editorNote.id, { title, body });
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
    setEditorNote(updated);
  }

  async function handleDeleteNote(id) {
    await deleteNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
  }

  function handleCloseEditor() {
    const n = editorNote;
    if (n && !n.body?.trim() && (!n.title || n.title === "Untitled Note")) {
      deleteNote(n.id).catch(console.error);
      setNotes(prev => prev.filter(x => x.id !== n.id));
    }
    setEditorNote(null);
  }

  // ── Highlights CRUD ────────────────────────────────────────
  async function handleDeleteHighlight(id) {
    await deleteHighlight(id);
    setHighlights(prev => prev.filter(h => h.id !== id));
  }

  async function handleEditHighlightNote(id, note) {
    await updateHighlightNote(id, note);
    setHighlights(prev => prev.map(h => h.id === id ? { ...h, note } : h));
  }

  // ── Filtering / sorting ────────────────────────────────────
  const q = search.trim().toLowerCase();

  function filteredNotes() {
    let items = [...notes];
    if (q) items = items.filter(n =>
      (n.title || "").toLowerCase().includes(q) ||
      (n.body || "").toLowerCase().includes(q) ||
      (n.tags || []).some(t => t.toLowerCase().includes(q))
    );
    if (sortBy === "title") items.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    else if (sortBy === "created") items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return items;
  }

  function filteredHighlights() {
    let items = [...highlights];
    if (q) items = items.filter(h =>
      (h.passage || "").toLowerCase().includes(q) ||
      (h.note || "").toLowerCase().includes(q) ||
      (h.article_title || "").toLowerCase().includes(q)
    );
    return items;
  }

  // Group tags by article
  const tagsByArticle = new Map();
  articleTags.forEach(t => {
    if (!tagsByArticle.has(t.article_url)) {
      tagsByArticle.set(t.article_url, { title: t.article_title || t.article_url || "Untitled", url: t.article_url, tags: [] });
    }
    const art = tagsByArticle.get(t.article_url);
    if (!art.tags.includes(t.tag)) art.tags.push(t.tag);
  });
  const filteredTags = q
    ? [...tagsByArticle.values()].filter(a => a.title?.toLowerCase().includes(q) || a.tags.some(tag => tag.toLowerCase().includes(q)))
    : [...tagsByArticle.values()];

  const fn = filteredNotes(), fh = filteredHighlights();
  const tabs = [
    { id: "notes",      label: "Notes",      count: notes.length },
    { id: "highlights", label: "Highlights", count: highlights.length },
    ...(isPro ? [{ id: "tags", label: "Tags", count: tagsByArticle.size }] : []),
  ];
  const headings = { notes: "All Notes", highlights: "Highlights", tags: "Tags" };
  const currentCount = tab === "notes" ? fn.length : tab === "highlights" ? fh.length : filteredTags.length;
  const isEmpty = currentCount === 0;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", background: T.bg }}>

        {/* ── Page header ── */}
        <div style={{ borderBottom: `1px solid ${T.border}`, flexShrink: 0, padding: isMobile ? "14px 16px 0" : "20px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: isMobile ? 10 : 12 }}>

            {/* Heading block */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".16em", color: T.textTertiary, marginBottom: 2 }}>Library</div>
              <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: isMobile ? 24 : 32, fontWeight: 500, color: T.text, margin: 0, letterSpacing: "-.025em", lineHeight: 1.1 }}>
                {headings[tab]}
              </h1>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginTop: isMobile ? 4 : 8 }}>
              {!isMobile && tab === "notes" && (
                <>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 8px", fontSize: 11, color: T.textSecondary, fontFamily: "inherit", cursor: "pointer", outline: "none" }}>
                    <option value="modified">Date Modified</option>
                    <option value="created">Date Created</option>
                    <option value="title">Title A–Z</option>
                  </select>
                  <div style={{ display: "flex", gap: 1, background: T.surface2, borderRadius: 8, padding: 2 }}>
                    {[{ v: "grid", icon: "⊞" }, { v: "list", icon: "☰" }].map(({ v, icon }) => (
                      <button key={v} onClick={() => setViewMode(v)} style={{ width: 28, height: 24, borderRadius: 5, border: "none", cursor: "pointer", background: viewMode === v ? T.card : "transparent", color: viewMode === v ? T.text : T.textTertiary, fontSize: 13, fontFamily: "inherit", transition: "all .12s" }}>{icon}</button>
                    ))}
                  </div>
                </>
              )}
              {/* + New Note */}
              <button onClick={handleNewNote} disabled={setupNeeded}
                style={{ display: "flex", alignItems: "center", gap: 5, background: T.accent, border: "none", borderRadius: 10, padding: isMobile ? "8px 12px" : "7px 14px", fontSize: 13, fontWeight: 600, color: T.accentText, cursor: setupNeeded ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: setupNeeded ? 0.4 : 1, WebkitTapHighlightColor: "transparent", flexShrink: 0 }}
              >
                <span style={{ fontSize: 16, lineHeight: 1, fontWeight: 400 }}>+</span>
                {!isMobile && "New Note"}
              </button>
            </div>
          </div>

          {/* Mobile: search */}
          {isMobile && (
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              style={{ width: "100%", boxSizing: "border-box", background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 9, padding: "9px 12px", fontSize: 14, color: T.text, fontFamily: "inherit", outline: "none", marginBottom: 10 }}
              onFocus={e => e.target.style.borderColor = T.accent}
              onBlur={e => e.target.style.borderColor = T.border}
            />
          )}

          {/* Tab bar + desktop search */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", flex: 1 }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  padding: isMobile ? "8px 12px" : "8px 16px",
                  background: "none", border: "none",
                  borderBottom: `2px solid ${tab === t.id ? T.accent : "transparent"}`,
                  color: tab === t.id ? T.accent : T.textTertiary,
                  fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
                  cursor: "pointer", fontFamily: "inherit", transition: "color .15s, border-color .15s", whiteSpace: "nowrap",
                }}>
                  {t.label}
                  {t.count > 0 && <span style={{ marginLeft: 5, fontSize: 11, opacity: 0.6 }}>({t.count})</span>}
                </button>
              ))}
            </div>
            {!isMobile && (
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                style={{ width: 180, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 9, padding: "6px 11px", fontSize: 12, color: T.text, fontFamily: "inherit", outline: "none", marginBottom: 1 }}
                onFocus={e => e.target.style.borderColor = T.accent}
                onBlur={e => e.target.style.borderColor = T.border}
              />
            )}
          </div>
        </div>

        {/* ── Migration banner ── */}
        {migrationNeeded && !setupNeeded && (
          <div style={{ borderBottom: `1px solid ${T.border}`, padding: "10px 24px", background: T.surface, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: T.textSecondary, flex: 1 }}>
              ✦ Enable article-linked notes by upgrading your notes table.
            </span>
            <button onClick={() => setMigrationOpen(v => !v)}
              style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 7, padding: "3px 10px", fontSize: 11, fontWeight: 600, color: T.accent, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
              {migrationOpen ? "Hide SQL" : "Show SQL"}
            </button>
            {migrationOpen && (
              <button onClick={async () => { await copyToClipboard(MIGRATION_SQL); setMigCopied(true); setTimeout(() => setMigCopied(false), 2000); }}
                style={{ background: T.accentSurface, border: `1px solid ${T.accent}`, borderRadius: 7, padding: "3px 10px", fontSize: 11, fontWeight: 600, color: T.accent, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                {migCopied ? "✓ Copied" : "Copy SQL"}
              </button>
            )}
          </div>
        )}
        {migrationNeeded && migrationOpen && (
          <div style={{ borderBottom: `1px solid ${T.border}`, padding: "10px 24px", flexShrink: 0 }}>
            <pre style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 11, color: T.textSecondary, lineHeight: 1.7, overflowX: "auto", whiteSpace: "pre-wrap", margin: 0 }}>{MIGRATION_SQL}</pre>
            <p style={{ fontSize: 12, color: T.textTertiary, margin: "6px 0 0" }}>Run in your Supabase Dashboard → SQL Editor, then refresh.</p>
          </div>
        )}

        {/* ── Content ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px 14px 90px" : "20px 24px 48px" }}>

          {loading && <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}><Spinner size={28} /></div>}

          {/* Setup screen */}
          {!loading && tab === "notes" && setupNeeded && (
            <div style={{ maxWidth: 580, margin: "0 auto", paddingTop: 24 }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontWeight: 500, color: T.text, margin: "0 0 10px" }}>Set up the Notes table</h2>
              <p style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.65, margin: "0 0 20px" }}>
                Run this SQL in your <strong>Supabase Dashboard → SQL Editor</strong>, then refresh the page.
              </p>
              <pre style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px", fontSize: 12, color: T.textSecondary, lineHeight: 1.7, overflowX: "auto", whiteSpace: "pre-wrap" }}>{SETUP_SQL}</pre>
              <button onClick={async () => { await copyToClipboard(SETUP_SQL); setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000); }}
                style={{ marginTop: 12, background: T.accentSurface, border: `1px solid ${T.accent}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: T.accent, cursor: "pointer", fontFamily: "inherit" }}>
                {sqlCopied ? "✓ Copied!" : "Copy SQL"}
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && isEmpty && !setupNeeded && (
            <EmptyState
              icon={tab === "tags" ? "🏷️" : tab === "highlights" ? "✍️" : "📝"}
              title={search ? "No matches" : tab === "highlights" ? "No highlights yet" : tab === "tags" ? "No tagged articles" : "No notes yet"}
              subtitle={search ? `Nothing matched "${search}"` : tab === "highlights" ? "Select text in any article to create a highlight." : tab === "tags" ? "Open an article and add tags." : `Click "+ New Note" to start writing.`}
            />
          )}

          {/* ── Notes grid / list ── */}
          {!loading && !isEmpty && tab === "notes" && !setupNeeded && (
            viewMode === "list" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 700 }}>
                {fn.map(note => <NoteListRow key={note.id} note={note} onOpen={setEditorNote} T={T} />)}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 14, alignItems: "start" }}>
                {fn.map((note, i) => (
                  <div key={note.id} style={{ gridColumn: !isMobile && i === 0 ? "1 / -1" : undefined }}>
                    <NoteCard note={note} onOpen={setEditorNote} onReread={setViewingItem} T={T} featured={!isMobile && i === 0} isMobile={isMobile} />
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Highlights grid ── */}
          {!loading && !isEmpty && tab === "highlights" && (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 14, alignItems: "start" }}>
              {fh.map(h => (
                <HighlightCard key={h.id} highlight={h}
                  onDelete={handleDeleteHighlight}
                  onEdit={handleEditHighlightNote}
                  onReread={setViewingItem}
                  T={T} isMobile={isMobile}
                />
              ))}
            </div>
          )}

          {/* ── Tags grid ── */}
          {!loading && !isEmpty && tab === "tags" && (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 14, alignItems: "start" }}>
              {filteredTags.map(({ title, url, tags }) => (
                <TagCard key={url} title={title} url={url} tags={tags} onSearch={setSearch} onReread={setViewingItem} T={T} isMobile={isMobile} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Note editor overlay ── */}
      {editorNote && (
        <NoteEditor
          note={editorNote}
          onClose={handleCloseEditor}
          onSave={handleSaveNote}
          onDelete={handleDeleteNote}
          T={T} isMobile={isMobile}
        />
      )}

      {/* ── Re-read article overlay ── */}
      {viewingItem && (
        <Suspense fallback={null}>
          <ContentViewerLazy item={viewingItem} onClose={() => setViewingItem(null)} />
        </Suspense>
      )}
    </>
  );
}
