import { useState, useEffect, useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { getHistory, clearHistory, getReadLater, removeReadLater,
         getSaved, unsaveItem, saveItem } from "../lib/supabase";
import FeedItem from "../components/FeedItem";
import ContentViewer from "../components/ContentViewer";
import { Button, EmptyState, Spinner } from "../components/UI";
import { getAnthropicKey, setAnthropicKey } from "../lib/apiKeys";

// ── Shared page shell ─────────────────────────────────────────
function PageShell({ title, subtitle, action, children }) {
  const { T } = useTheme();
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 22px 12px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: "-.01em" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 1 }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
    </div>
  );
}

// ── Read Later page ───────────────────────────────────────────
export function ReadLaterPage() {
  const { T } = useTheme();
  const { user }  = useAuth();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [openItem, setOpenItem] = useState(null);

  useEffect(() => {
    if (!user) return;
    getReadLater(user.id).then(setItems).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  async function handleRemove(url) {
    await removeReadLater(user.id, url);
    setItems((prev) => prev.filter((s) => s.url !== url));
  }

  return (
    <PageShell title="Read Later" subtitle={`${items.length} articles saved`}>
      {loading && <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spinner size={28} /></div>}
      {!loading && items.length === 0 && (
        <EmptyState icon="⏱" title="Nothing queued" subtitle="Press L while reading any article to save it here for later." />
      )}
      {items.map((item) => (
        <FeedItem key={item.url} item={{ ...item, date: item.saved_at }}
          onClick={() => setOpenItem(item)}
          onDelete={() => handleRemove(item.url)}
        />
      ))}
      {openItem && <ContentViewer item={openItem} onClose={() => setOpenItem(null)} />}
    </PageShell>
  );
}

// ── History page ──────────────────────────────────────────────
export function HistoryPage() {
  const { user }  = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openItem, setOpenItem] = useState(null);

  useEffect(() => {
    if (!user) return;
    getHistory(user.id).then(setHistory).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  async function handleClear() {
    if (!confirm("Clear all reading history?")) return;
    const { clearHistory } = await import("../lib/supabase");
    await clearHistory(user.id);
    setHistory([]);
  }

  return (
    <PageShell title="History" subtitle={`${history.length} items`}
      action={history.length > 0 && <Button variant="ghost" size="sm" onClick={handleClear}>Clear all</Button>}
    >
      {loading && <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spinner size={28} /></div>}
      {!loading && history.length === 0 && <EmptyState icon="🕑" title="No history yet" subtitle="Articles and videos you open will appear here." />}
      {history.map((item) => (
        <FeedItem key={item.url} item={{ ...item, date: item.read_at }} onClick={() => setOpenItem(item)} />
      ))}
      {openItem && <ContentViewer item={openItem} onClose={() => setOpenItem(null)} />}
    </PageShell>
  );
}

// ── Settings page ─────────────────────────────────────────────
export function SettingsPage() {
  const { T, isDark, setIsDark } = useTheme();
  const { user, signOut } = useAuth();
  const shortcuts = [
    { key: "J / ↓",   action: "Next article" },
    { key: "K / ↑",   action: "Previous article" },
    { key: "O / Enter", action: "Open article" },
    { key: "R",        action: "Toggle read/unread" },
    { key: "L",        action: "Add to Read Later" },
    { key: "S",        action: "Save article" },
    { key: "A",        action: "Add feed / URL" },
    { key: "Esc",      action: "Close reader" },
  ];

  return (
    <PageShell title="Settings">
      <div style={{ maxWidth: 520, padding: "24px 22px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Account */}
        <Card title="Account" T={T}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            {user?.user_metadata?.avatar_url
              ? <img src={user.user_metadata.avatar_url} alt="" style={{ width: 44, height: 44, borderRadius: "50%" }} />
              : <div style={{ width: 44, height: 44, borderRadius: "50%", background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👤</div>
            }
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{user?.user_metadata?.full_name || user?.user_metadata?.user_name || "GitHub User"}</div>
              <div style={{ fontSize: 12, color: T.textSecondary }}>{user?.email}</div>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={signOut}>Sign out</Button>
        </Card>

        {/* Appearance */}
        <Card title="Appearance" T={T}>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ label: "☀️  Light", dark: false }, { label: "🌙  Dark", dark: true }].map(({ label, dark }) => (
              <button key={label} onClick={() => setIsDark(dark)} style={{
                flex: 1, padding: "10px 0",
                border: `1.5px solid ${isDark === dark ? T.accent : T.border}`,
                borderRadius: 10, background: isDark === dark ? T.accentSurface : T.surface,
                color: isDark === dark ? T.accentText : T.textSecondary,
                fontWeight: isDark === dark ? 600 : 400, fontSize: 13,
                cursor: "pointer", fontFamily: "inherit",
              }}>{label}</button>
            ))}
          </div>
        </Card>

        {/* Reading preferences */}
        <Card title="Reading" T={T}>
          <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <input type="checkbox"
              defaultChecked={localStorage.getItem("fb-automark") === "true"}
              onChange={e => localStorage.setItem("fb-automark", e.target.checked)}
              style={{ accentColor: T.accent, width: 16, height: 16 }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>Auto-mark-read on scroll</div>
              <div style={{ fontSize: 12, color: T.textTertiary, marginTop: 2 }}>Articles are marked read when scrolled past in the list</div>
            </div>
          </label>
        </Card>

        {/* Keyboard shortcuts */}
        <Card title="Keyboard Shortcuts" T={T}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {shortcuts.map(({ key, action }) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <kbd style={{
                  background: T.surface2, border: `1px solid ${T.border}`,
                  borderRadius: 6, padding: "2px 8px", fontSize: 11,
                  fontFamily: "monospace", color: T.text, flexShrink: 0, minWidth: 80,
                  textAlign: "center",
                }}>{key}</kbd>
                <span style={{ fontSize: 13, color: T.textSecondary }}>{action}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Data & Export */}
        <Card title="Data &amp; Export" T={T}>
          <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.7, marginBottom: 14 }}>
            Export your feed subscriptions as an OPML file, importable into any RSS reader.
          </div>
          <button onClick={async () => {
            const feeds = await getFeeds(user.id);
            const xml = feedsToOPML(feeds);
            downloadFile(xml, "feedbox-subscriptions.opml", "text/x-opml");
          }} style={{
            background: T.accent, border: "none", borderRadius: 9, padding: "9px 18px",
            cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#fff", fontFamily: "inherit",
          }}>↓ Export OPML</button>
        </Card>

        {/* Reading Stats */}
        <ReadingStatsCard T={T} user={user} />

        {/* Feed Health */}
        <FeedHealthCard T={T} user={user} />

        {/* Manage Feeds */}
        <ManageFeedsCard T={T} user={user} />

        {/* API Keys */}
        <Card title="API Keys" T={T}>
          <div style={{ fontSize: 12, color: T.textTertiary, marginBottom: 14, lineHeight: 1.6 }}>
            Keys are stored in your browser only — never sent to any server other than the respective API.
          </div>

          <ApiKeyInput
            label="Anthropic API Key"
            placeholder="sk-ant-..."
            hint="Used for AI summaries. Get at console.anthropic.com"
            getValue={getAnthropicKey}
            setValue={setAnthropicKey}
            T={T}
          />
        </Card>



        {/* About */}
        <Card title="About" T={T}>
          <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.7 }}>
            Feedbox — a calm reading space for RSS, articles, and YouTube. Built with React + Vite, hosted on GitHub Pages, powered by Supabase.
          </div>
          <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 8 }}>v1.11.0</div>
        </Card>
      </div>
    </PageShell>
  );
}



// ── Inline feed name editor ───────────────────────────────────
function FeedNameEditor({ feed, T, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(feed.name || "");
  const inputRef = useRef(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  function commit() {
    const trimmed = val.trim();
    if (trimmed && trimmed !== feed.name) onSave(trimmed);
    setEditing(false);
  }

  if (editing) {
    return (
      <input ref={inputRef} value={val} onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(feed.name||""); setEditing(false); }}}
        style={{ flex:1, background:T.surface2, border:`1.5px solid ${T.accent}`, borderRadius:7, padding:"3px 8px", fontSize:13, color:T.text, fontFamily:"inherit", outline:"none" }}
      />
    );
  }
  return (
    <span onClick={() => setEditing(true)} title="Click to rename"
      style={{ flex:1, fontSize:13, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", cursor:"text", padding:"3px 0" }}>
      {feed.name || new URL(feed.url).hostname}
      <span style={{ fontSize:10, color:T.textTertiary, marginLeft:5 }}>✎</span>
    </span>
  );
}

// ── Manage Feeds card ─────────────────────────────────────────
function ManageFeedsCard({ T, user }) {
  const [feeds, setFeeds]     = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null); // feedId being saved
  const FCOLS = { gray:"#8A9099", teal:"#4BBFAF", blue:"#2F6FED", amber:"#AA8439", red:"#EF4444", purple:"#8B5CF6", green:"#22C55E" };

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getFeeds(user.id),
      getFolders(user.id),
    ]).then(([f, fo]) => {
      setFeeds(f);
      setFolders(fo);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, [user]);

  async function handleMove(feedId, folderId) {
    setSaving(feedId);
    try {
      await setFeedFolder(feedId, folderId);
      setFeeds(prev => prev.map(f => f.id === feedId ? { ...f, folder_id: folderId } : f));
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(null);
    }
  }

  if (loading) return null;
  if (feeds.length === 0) return null;

  return (
    <Card title="Manage Feeds" T={T}>
      <div style={{ fontSize: 12, color: T.textTertiary, marginBottom: 14, lineHeight: 1.6 }}>
        Assign feeds to folders to organise your sources panel.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {feeds.map(feed => {
          const currentFolder = folders.find(f => f.id === feed.folder_id);
          const isSaving = saving === feed.id;
          return (
            <div key={feed.id} style={{ background: T.surface, borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* Favicon */}
                <div style={{ width: 16, height: 16, borderRadius: 3, overflow: "hidden", background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <img src={`https://www.google.com/s2/favicons?domain=${new URL(feed.url).hostname}&sz=32`}
                    alt="" width={12} height={12} style={{ display: "block" }}
                    onError={e => { e.target.style.display = "none"; }} />
                </div>
                {/* Editable name */}
                <FeedNameEditor feed={feed} T={T} onSave={async (name) => {
                  setSaving(feed.id);
                  try {
                    await updateFeedSettings(feed.id, { name });
                    setFeeds(prev => prev.map(f => f.id === feed.id ? { ...f, name } : f));
                  } finally { setSaving(null); }
                }} />
                {isSaving && <span style={{ fontSize: 11, color: T.textTertiary, flexShrink: 0 }}>saving…</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 26 }}>
                {/* Folder select */}
                <select value={feed.folder_id || ""} onChange={e => handleMove(feed.id, e.target.value || null)}
                  style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 7, padding: "4px 8px", fontSize: 12, color: T.text, fontFamily: "inherit", cursor: "pointer", flex: 1 }}>
                  <option value="">No folder</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                {/* Fetch full content toggle */}
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textSecondary, cursor: "pointer", flexShrink: 0 }}>
                  <input type="checkbox" checked={!!feed.fetch_full_content} onChange={async e => {
                    const val = e.target.checked;
                    setSaving(feed.id);
                    try {
                      await updateFeedSettings(feed.id, { fetch_full_content: val });
                      setFeeds(prev => prev.map(f => f.id === feed.id ? { ...f, fetch_full_content: val } : f));
                    } finally { setSaving(null); }
                  }} style={{ accentColor: T.accent }} />
                  Always fetch full content
                </label>
              </div>
            </div>
          );
        })}
      </div>
      {folders.length === 0 && (
        <div style={{ fontSize: 12, color: T.textTertiary, marginTop: 10, fontStyle: "italic" }}>
          Create a folder first using the + button in the sources panel.
        </div>
      )}
    </Card>
  );
}


// ── Reading Stats card ────────────────────────────────────────
function ReadingStatsCard({ T, user }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    if (!user) return;
    getReadingStats(user.id).then(setStats).catch(console.error);
  }, [user]);
  if (!stats) return null;

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const max = Math.max(1, ...days.map(d => stats.perDay[d] || 0));

  return (
    <Card title="Reading Stats" T={T}>
      <div style={{ display: "flex", gap: 20, marginBottom: 18 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.accent, lineHeight: 1 }}>{stats.thisWeek}</div>
          <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 3 }}>This week</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.text, lineHeight: 1 }}>{stats.allTime}</div>
          <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 3 }}>All time</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: stats.streak > 0 ? T.warning : T.textTertiary, lineHeight: 1 }}>
            {stats.streak > 0 ? "🔥" : "—"} {stats.streak}
          </div>
          <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 3 }}>Day streak</div>
        </div>
      </div>
      {/* Mini bar chart — last 7 days */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 40 }}>
        {days.map(day => {
          const count = stats.perDay[day] || 0;
          const h = max > 0 ? Math.max(3, (count / max) * 36) : 3;
          const isToday = day === new Date().toISOString().slice(0, 10);
          return (
            <div key={day} title={`${day}: ${count} articles`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ width: "100%", height: h, borderRadius: 3, background: isToday ? T.accent : T.surface2, transition: "height .3s" }} />
              <span style={{ fontSize: 9, color: T.textTertiary }}>{new Date(day + "T12:00:00").toLocaleDateString("en-US", { weekday: "narrow" })}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Feed Health Dashboard ─────────────────────────────────────
function FeedHealthCard({ T, user }) {
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    getFeeds(user.id).then(setFeeds).catch(console.error).finally(() => setLoading(false));
  }, [user]);
  if (loading || feeds.length === 0) return null;

  return (
    <Card title="Feed Health" T={T}>
      <div style={{ fontSize: 12, color: T.textTertiary, marginBottom: 12, lineHeight: 1.6 }}>
        Overview of your {feeds.length} subscribed feeds.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {feeds.map(feed => {
          const host = (() => { try { return new URL(feed.url).hostname.replace("www.", ""); } catch { return feed.url; } })();
          return (
            <div key={feed.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 8, background: T.surface }}>
              <img src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`} alt="" width={14} height={14} style={{ borderRadius: 2, flexShrink: 0 }} onError={e => e.target.style.display="none"} />
              <span style={{ flex: 1, fontSize: 13, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {feed.name || host}
              </span>
              {feed.fetch_full_content && (
                <span style={{ fontSize: 10, background: T.accentSurface, color: T.accentText, padding: "2px 6px", borderRadius: 5, fontWeight: 600, flexShrink: 0 }}>Full</span>
              )}
              <span style={{ fontSize: 11, color: T.textTertiary, flexShrink: 0 }}>
                {feed.type === "rss" ? "RSS" : feed.type?.toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ApiKeyInput({ label, placeholder, hint, getValue, setValue, T }) {
  const [value, setLocalValue] = useState(() => getValue());
  const [saved, setSaved]      = useState(false);
  const [show, setShow]        = useState(false);

  function handleSave() {
    setValue(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const displayValue = show ? value : value ? value.slice(0, 8) + "•".repeat(Math.max(0, value.length - 8)) : "";

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            type={show ? "text" : "password"}
            value={value}
            onChange={e => { setLocalValue(e.target.value); setSaved(false); }}
            placeholder={placeholder}
            style={{
              width: "100%", boxSizing: "border-box",
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 9, padding: "8px 36px 8px 12px",
              fontSize: 13, color: T.text, fontFamily: "monospace", outline: "none",
            }}
            onFocus={e => { e.target.style.borderColor = T.accent; }}
            onBlur={e => { e.target.style.borderColor = T.border; }}
            onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
          />
          <button onClick={() => setShow(v => !v)} style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer",
            color: T.textTertiary, fontSize: 14, padding: 2,
          }}>{show ? "🙈" : "👁"}</button>
        </div>
        <button onClick={handleSave} style={{
          background: saved ? T.green?.bg || T.accentSurface : T.accent,
          border: "none", borderRadius: 9, padding: "8px 14px",
          cursor: "pointer", fontSize: 12, fontWeight: 700,
          color: saved ? T.green?.text || T.accentText : "#fff", fontFamily: "inherit",
          flexShrink: 0, transition: "all .2s",
        }}>{saved ? "✓ Saved" : "Save"}</button>
      </div>
      <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 5 }}>{hint}</div>
    </div>
  );
}

function Card({ title, children, T }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: T.textTertiary, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}
