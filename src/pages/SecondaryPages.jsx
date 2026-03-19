import { useState, useEffect, useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { getHistory, clearHistory, getReadLater, removeReadLater,
         getSaved, unsaveItem, saveItem,
         getFeeds, getFolders, setFeedFolder, updateFeedSettings,
         getReadingStats } from "../lib/supabase";
import FeedItem from "../components/FeedItem";
import ContentViewer from "../components/ContentViewer";
import { Button, EmptyState, Spinner } from "../components/UI";
import { getAnthropicKey, setAnthropicKey } from "../lib/apiKeys";
import { feedsToOPML, downloadFile } from "../lib/exportUtils";
import { getCachedFeed, cacheAge, invalidateCachedFeed } from "../lib/feedCache";
import { getPlan, getPlanName, PLANS } from "../lib/plan";

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
      <div style={{ flex: 1, overflowY: "auto", display:"flex", flexDirection:"column", alignItems:"center" }}>{children}</div>
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
  const [showAdd, setShowAdd]   = useState(false);
  const [addUrl, setAddUrl]     = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError]   = useState("");

  useEffect(() => {
    if (!user) return;
    getReadLater(user.id).then(setItems).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  async function handleRemove(url) {
    await removeReadLater(user.id, url);
    setItems((prev) => prev.filter((s) => s.url !== url));
  }

  async function handleAddUrl() {
    if (!addUrl.trim()) return;
    setAddLoading(true); setAddError("");
    try {
      const url = addUrl.trim();
      let item = { url, type: "article", title: url, source: (() => { try { return new URL(url).hostname; } catch { return url; } })() };
      try {
        const { fetchArticleContent } = await import("../lib/fetchers");
        const content = await fetchArticleContent(url);
        item = { url, type: "article", title: content.title || url, source: new URL(url).hostname, description: content.description, image: content.image };
      } catch {}
      await addReadLater(user.id, item);
      setItems(prev => [{ ...item, saved_at: new Date().toISOString(), is_read_later: true }, ...prev]);
      setAddUrl(""); setShowAdd(false);
    } catch (err) {
      setAddError(err.message || "Failed to save article.");
    } finally {
      setAddLoading(false);
    }
  }

  return (
    <PageShell title="Read Later" subtitle={`${items.length} article${items.length !== 1 ? "s" : ""} queued`}>
      {/* Add URL bar */}
      <div style={{ padding: "12px 16px 0" }}>
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", borderRadius: 10, border: `1.5px dashed ${T.border}`, background: "transparent", cursor: "pointer", color: T.textTertiary, fontSize: 13, fontFamily: "inherit", transition: "all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; e.currentTarget.style.background = T.accentSurface; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textTertiary; e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ fontSize: 16 }}>+</span> Save an article URL for later…
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexDirection: "column" }}>
            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <input
                autoFocus
                value={addUrl}
                onChange={e => { setAddUrl(e.target.value); setAddError(""); }}
                onKeyDown={e => { if (e.key === "Enter") handleAddUrl(); if (e.key === "Escape") { setShowAdd(false); setAddUrl(""); setAddError(""); } }}
                placeholder="Paste an article URL…"
                style={{ flex: 1, background: T.surface, border: `1.5px solid ${T.accent}`, borderRadius: 9, padding: "9px 13px", fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none" }}
              />
              <button onClick={handleAddUrl} disabled={!addUrl.trim() || addLoading}
                style={{ background: T.accent, border: "none", borderRadius: 9, padding: "9px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#fff", fontFamily: "inherit", flexShrink: 0, opacity: (!addUrl.trim() || addLoading) ? 0.5 : 1 }}>
                {addLoading ? "Saving…" : "Save"}
              </button>
              <button onClick={() => { setShowAdd(false); setAddUrl(""); setAddError(""); }}
                style={{ background: T.surface2, border: "none", borderRadius: 9, padding: "9px 12px", cursor: "pointer", fontSize: 13, color: T.textSecondary, fontFamily: "inherit", flexShrink: 0 }}>
                Cancel
              </button>
            </div>
            {addError && <div style={{ fontSize: 12, color: T.danger, padding: "6px 12px", background: `${T.danger}15`, borderRadius: 7, width: "100%", boxSizing: "border-box" }}>{addError}</div>}
          </div>
        )}
      </div>

      {loading && <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spinner size={28} /></div>}
      {!loading && items.length === 0 && (
        <EmptyState icon="⏱" title="Nothing queued" subtitle="Paste any article URL above, or press L while reading to save for later." />
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

// ── Reading Stats Page ────────────────────────────────────────
export function StatsPage() {
  const { T } = useTheme();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    getReadingStats(user.id)
      .then(setStats)
      .catch(err => { console.error("StatsPage:", err); setError(true); })
      .finally(() => setLoading(false));
  }, [user]);

  const planName = getPlanName(user);

  // Build last 30 days
  const days30 = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days30.push(d.toISOString().slice(0, 10));
  }
  const max30 = stats ? Math.max(1, ...days30.map(d => stats.perDay[d] || 0)) : 1;

  // Top sources from perDay keys — we don't have per-source data in stats yet, show placeholder
  const weekTotal = stats?.thisWeek || 0;
  const dailyAvg  = stats ? Math.round((stats.thisWeek || 0) / 7 * 10) / 10 : 0;

  return (
    <PageShell title="Reading Stats" subtitle="Your reading activity">
      {loading && <div style={{ display:"flex", justifyContent:"center", paddingTop:80 }}><Spinner size={28} /></div>}
      {!loading && error && (
        <div style={{ padding:"40px 24px", textAlign:"center", color:T.textTertiary, maxWidth:400, margin:"0 auto" }}>
          <div style={{ fontSize:28, marginBottom:12 }}>📊</div>
          <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:6 }}>Stats unavailable</div>
          <div style={{ fontSize:13, lineHeight:1.6 }}>
            Reading stats require the <code style={{ background:T.surface2, padding:"1px 5px", borderRadius:4, fontSize:12 }}>read_at</code> column on <code style={{ background:T.surface2, padding:"1px 5px", borderRadius:4, fontSize:12 }}>read_items</code>.
            Run the database migration in Settings → About to enable this.
          </div>
        </div>
      )}
      {!loading && !error && stats && (
        <div style={{ padding:"16px 16px 32px", maxWidth:680, margin:"0 auto", display:"flex", flexDirection:"column", gap:16 }}>

          {/* Plan badge */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:11, fontWeight:700, background: planName==="pro" ? T.accent : T.surface2, color: planName==="pro" ? "#fff" : T.textTertiary, padding:"2px 10px", borderRadius:20, letterSpacing:".05em" }}>
              {planName.toUpperCase()}
            </span>
            {planName !== "pro" && (
              <a href="mailto:hello@brainbits.us?subject=Feedbox Pro" style={{ fontSize:12, color:T.accent, textDecoration:"none", fontWeight:600 }}>Upgrade to Pro →</a>
            )}
          </div>

          {/* Big stats row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10 }}>
            {[
              { label:"This week",  value:weekTotal,         unit:"articles", color:T.accent },
              { label:"All time",   value:stats.allTime,     unit:"total",    color:T.text },
              { label:"Day streak", value:`${stats.streak > 0 ? "🔥 " : ""}${stats.streak}`, unit:"days", color: stats.streak > 0 ? T.warning : T.textTertiary },
            ].map(({ label, value, unit, color }) => (
              <div key={label} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:"16px 14px", textAlign:"center" }}>
                <div style={{ fontSize:30, fontWeight:800, color, lineHeight:1.1, letterSpacing:"-.02em" }}>{value}</div>
                <div style={{ fontSize:10, fontWeight:700, color:T.textTertiary, marginTop:4, textTransform:"uppercase", letterSpacing:".06em" }}>{unit}</div>
                <div style={{ fontSize:11, color:T.textSecondary, marginTop:2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Daily avg */}
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:22 }}>📈</span>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{dailyAvg} articles/day average this week</div>
              <div style={{ fontSize:12, color:T.textTertiary, marginTop:1 }}>Keep it up — consistency beats volume</div>
            </div>
          </div>

          {/* 30-day bar chart */}
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:"16px" }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.textSecondary, marginBottom:12, textTransform:"uppercase", letterSpacing:".06em" }}>Last 30 days</div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:64 }}>
              {days30.map((day, i) => {
                const count = stats.perDay[day] || 0;
                const h = Math.max(count > 0 ? 4 : 1, (count / max30) * 60);
                const isToday = i === 29;
                const isWeekend = [0,6].includes(new Date(day+"T12:00:00").getDay());
                return (
                  <div key={day} title={`${new Date(day+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}: ${count} article${count!==1?"s":""}`}
                    style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2, cursor:"default" }}>
                    <div style={{ width:"100%", height:h, borderRadius:2, transition:"height .4s ease",
                      background: isToday ? T.accent : count > 0 ? (isWeekend ? T.accentSurface : T.surface2) : T.border,
                      border: isToday ? "none" : count > 0 ? `1px solid ${T.borderStrong}` : "none",
                      opacity: count > 0 ? 1 : 0.4,
                    }} />
                    {(i === 0 || i === 9 || i === 19 || i === 29) && (
                      <span style={{ fontSize:8, color:T.textTertiary, whiteSpace:"nowrap" }}>
                        {new Date(day+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Streak motivation */}
          {stats.streak === 0 && (
            <div style={{ background:`${T.warning}15`, border:`1px solid ${T.warning}40`, borderRadius:14, padding:"14px 16px", display:"flex", gap:10, alignItems:"center" }}>
              <span style={{ fontSize:20 }}>💪</span>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:T.text }}>Start your streak today</div>
                <div style={{ fontSize:12, color:T.textTertiary, marginTop:2 }}>Read one article to kick off your daily streak.</div>
              </div>
            </div>
          )}
          {stats.streak >= 7 && (
            <div style={{ background:`${T.accent}15`, border:`1px solid ${T.accent}40`, borderRadius:14, padding:"14px 16px", display:"flex", gap:10, alignItems:"center" }}>
              <span style={{ fontSize:20 }}>🏆</span>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:T.accentText }}>{stats.streak}-day streak!</div>
                <div style={{ fontSize:12, color:T.textTertiary, marginTop:2 }}>Outstanding consistency. Keep it going.</div>
              </div>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}


// ── Plan / Billing card ───────────────────────────────────────
function PlanCard({ T, user, feedCount, planName }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // Check for redirect back from Stripe
  const params = new URLSearchParams(window.location.search);
  const upgradeStatus = params.get("upgrade");

  async function handleUpgrade() {
    setLoading(true); setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url; // redirect to Stripe Checkout
      } else {
        setError(json.error || "Failed to start checkout. Please try again.");
      }
    } catch (e) {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isPro = planName === "pro";

  return (
    <Card title="Plan & Billing" T={T}>
      {upgradeStatus === "success" && (
        <div style={{ background: T.accentSurface, border:`1px solid ${T.accent}`, borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:13, color:T.accentText, fontWeight:600 }}>
          🎉 Welcome to Pro! Your account has been upgraded.
        </div>
      )}
      {upgradeStatus === "cancelled" && (
        <div style={{ background:`${T.warning}18`, border:`1px solid ${T.warning}40`, borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:13, color:T.warning }}>
          Checkout cancelled — no charge made. You're still on the Free plan.
        </div>
      )}

      {/* Current plan */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:T.surface, borderRadius:10, marginBottom:14 }}>
        <div style={{ width:36, height:36, borderRadius:9, background: isPro ? T.accent : T.surface2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
          {isPro ? "⚡" : "🆓"}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{isPro ? "Feedbox Pro" : "Feedbox Free"}</div>
          <div style={{ fontSize:12, color:T.textTertiary, marginTop:1 }}>
            {isPro ? "Unlimited feeds · Unlimited AI summaries · Priority support" : `${feedCount}/10 feeds · 5 AI summaries/day · 3 smart feeds`}
          </div>
        </div>
        {isPro && <span style={{ fontSize:11, fontWeight:700, background:T.accent, color:"#fff", padding:"2px 10px", borderRadius:20 }}>ACTIVE</span>}
      </div>

      {/* Feature comparison */}
      {!isPro && (
        <div style={{ marginBottom:14 }}>
          {[
            ["Feeds",         `${feedCount}/10`,    "Unlimited"],
            ["Smart Feeds",   "3",                  "Unlimited"],
            ["Folders",       "2",                  "Unlimited"],
            ["AI Summaries",  "5/day",              "Unlimited"],
            ["Full-text fetch","—",                 "✓"],
            ["Reading stats", "—",                  "✓"],
            ["Priority support","—",                "✓"],
          ].map(([feat, free, pro]) => (
            <div key={feat} style={{ display:"flex", alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${T.border}` }}>
              <span style={{ flex:1, fontSize:12, color:T.textSecondary }}>{feat}</span>
              <span style={{ fontSize:12, color:T.textTertiary, minWidth:70, textAlign:"center" }}>{free}</span>
              <span style={{ fontSize:12, color:T.accentText, fontWeight:600, minWidth:70, textAlign:"center" }}>{pro}</span>
            </div>
          ))}
          <div style={{ display:"flex", fontSize:11, color:T.textTertiary, paddingTop:4 }}>
            <span style={{ flex:1 }}></span>
            <span style={{ minWidth:70, textAlign:"center" }}>Free</span>
            <span style={{ minWidth:70, textAlign:"center", color:T.accentText, fontWeight:700 }}>Pro</span>
          </div>
        </div>
      )}

      {error && <div style={{ fontSize:12, color:T.danger, marginBottom:10, padding:"7px 12px", background:`${T.danger}15`, borderRadius:8 }}>{error}</div>}

      {!isPro && (
        <button onClick={handleUpgrade} disabled={loading} style={{
          width:"100%", padding:"12px 0", borderRadius:12, border:"none",
          background: loading ? T.surface2 : T.accent,
          color: loading ? T.textTertiary : "#fff",
          fontSize:14, fontWeight:700, cursor: loading ? "wait" : "pointer",
          fontFamily:"inherit", transition:"all .2s",
          display:"flex", alignItems:"center", justifyContent:"center", gap:8,
        }}>
          {loading ? "Redirecting to checkout…" : "⚡ Upgrade to Pro — $9/month"}
        </button>
      )}
      {!isPro && (
        <p style={{ fontSize:11, color:T.textTertiary, textAlign:"center", margin:"8px 0 0", lineHeight:1.5 }}>
          7-day free trial · Cancel anytime · Secure checkout via Stripe
        </p>
      )}
      {isPro && (
        <button onClick={async () => {
          setLoading(true); setError("");
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`,
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${session?.access_token}`,
                  "Content-Type": "application/json",
                },
              }
            );
            const json = await res.json();
            if (json.url) {
              window.location.href = json.url;
            } else {
              setError(json.error || "Could not open billing portal.");
            }
          } catch {
            setError("Network error — please try again.");
          } finally {
            setLoading(false);
          }
        }} disabled={loading} style={{
          width:"100%", padding:"11px 0", borderRadius:10, border:`1px solid ${T.border}`,
          background:"transparent", color:T.textSecondary, fontSize:13, fontWeight:600,
          cursor: loading ? "wait" : "pointer", fontFamily:"inherit", transition:"all .2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor=T.accent; e.currentTarget.style.color=T.accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.textSecondary; }}
        >
          {loading ? "Opening portal…" : "Manage billing & subscription →"}
        </button>
      )}
    </Card>
  );
}

export function SettingsPage({ feeds: appFeeds = [], folders: appFolders = [], onFeedUpdate }) {
  const { T, isDark, setIsDark } = useTheme();
  const { user, signOut } = useAuth();
  const planName = getPlanName(user);
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
      <div style={{ maxWidth: 520, width: "100%", padding: "24px 22px", display: "flex", flexDirection: "column", gap: 14 }}>

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
        {/* Plan / Billing card */}
        <PlanCard T={T} user={user} feedCount={appFeeds.length} planName={planName} />
        <ReadingStatsCard T={T} user={user} />

        {/* Feed Health */}
        <FeedHealthCard T={T} user={user} feeds={appFeeds} />
        <DataPrivacyCard T={T} user={user} />

        {/* Manage Feeds */}
        <ManageFeedsCard T={T} user={user} initialFeeds={appFeeds} initialFolders={appFolders} onFeedUpdate={onFeedUpdate} />

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



        {/* Database migrations */}
        <Card title="Database Migrations" T={T}>
          <div style={{ fontSize: 12, color: T.textTertiary, marginBottom: 12, lineHeight: 1.6 }}>
            Run these SQL statements in <strong style={{ color: T.textSecondary }}>Supabase → SQL Editor</strong> if any features are missing.
          </div>
          {[
            { label: "Read timestamps (reading stats)", sql: "ALTER TABLE read_items ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT NOW();" },
            { label: "Feed folders table", sql: "CREATE TABLE IF NOT EXISTS feed_folders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, name TEXT NOT NULL, color TEXT DEFAULT 'gray', position INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW()); ALTER TABLE feed_folders ENABLE ROW LEVEL SECURITY; CREATE POLICY \"own folders\" ON feed_folders FOR ALL USING (auth.uid() = user_id);" },
            { label: "Folder column on feeds", sql: "ALTER TABLE feeds ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES feed_folders(id) ON DELETE SET NULL;" },
            { label: "Full content flag on feeds", sql: "ALTER TABLE feeds ADD COLUMN IF NOT EXISTS fetch_full_content BOOLEAN DEFAULT FALSE;" },
            { label: "Smart feed scoping", sql: "ALTER TABLE smart_feeds ADD COLUMN IF NOT EXISTS feed_ids TEXT[] DEFAULT NULL;" },
          ].map(({ label, sql }) => (
            <div key={label} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: T.text, marginBottom: 4 }}>{label}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <code style={{ flex: 1, fontSize: 10, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 7, padding: "6px 10px", color: T.textSecondary, lineHeight: 1.5, wordBreak: "break-all", display: "block" }}>
                  {sql}
                </code>
                <button onClick={() => { navigator.clipboard?.writeText(sql); }}
                  style={{ flexShrink: 0, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 7, padding: "5px 10px", fontSize: 11, color: T.textSecondary, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                  Copy
                </button>
              </div>
            </div>
          ))}
        </Card>

        {/* About */}
        <Card title="About" T={T}>
          <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.7 }}>
            Feedbox — a calm reading space for RSS, articles, and YouTube. Built with React + Vite, hosted on GitHub Pages, powered by Supabase.
          </div>
          <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 8 }}>v1.17.0</div>
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
function ManageFeedsCard({ T, user, initialFeeds = [], initialFolders = [], onFeedUpdate }) {
  const [feeds, setFeeds]     = useState(initialFeeds);
  const [folders, setFolders] = useState(initialFolders);
  const [saving, setSaving]   = useState(null);
  const FCOLS = { gray:"#8A9099", teal:"#4BBFAF", blue:"#2F6FED", amber:"#AA8439", red:"#EF4444", purple:"#8B5CF6", green:"#22C55E" };

  // Sync if parent feeds change
  useEffect(() => { if (initialFeeds.length > 0) setFeeds(initialFeeds); }, [initialFeeds]);
  useEffect(() => { if (initialFolders.length > 0) setFolders(initialFolders); }, [initialFolders]);

  async function handleMove(feedId, folderId) {
    setSaving(feedId);
    try {
      await setFeedFolder(feedId, folderId);
      const updated = feeds.map(f => f.id === feedId ? { ...f, folder_id: folderId } : f);
      setFeeds(updated);
      onFeedUpdate?.(feedId, { folder_id: folderId });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(null);
    }
  }

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
                    onFeedUpdate?.(feed.id, { name });
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
                      onFeedUpdate?.(feed.id, { fetch_full_content: val });
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
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!user) return;
    getReadingStats(user.id)
      .then(setStats)
      .catch(err => { console.error("ReadingStats:", err); setFailed(true); });
  }, [user]);
  if (failed || !stats) return null;

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
function FeedHealthCard({ T, user, feeds = [] }) {
  const [refreshing, setRefreshing] = useState({});
  const [, forceUpdate] = useState(0);
  if (feeds.length === 0) return null;

  async function handleRefreshFeed(feed) {
    setRefreshing(prev => ({ ...prev, [feed.id]: true }));
    invalidateCachedFeed(feed.url);
    try {
      const { fetchRSSFeed } = await import("../lib/fetchers");
      await fetchRSSFeed(feed.url, { forceRefresh: true });
    } catch {}
    setRefreshing(prev => ({ ...prev, [feed.id]: false }));
    forceUpdate(n => n + 1);
  }

  const totalItems = feeds.reduce((sum, feed) => {
    const cached = getCachedFeed(feed.url);
    return sum + (cached?.data?.items?.length || 0);
  }, 0);
  const freshCount = feeds.filter(f => {
    const age = cacheAge(f.url);
    return age !== null && age < 30;
  }).length;
  const staleCount = feeds.filter(f => {
    const age = cacheAge(f.url);
    return age !== null && age >= 30;
  }).length;
  const uncachedCount = feeds.filter(f => cacheAge(f.url) === null).length;

  return (
    <Card title="Feed Health" T={T}>
      {/* Summary row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[
          { label: "Total feeds", value: feeds.length, color: T.text },
          { label: "Fresh", value: freshCount, color: T.success },
          { label: "Stale", value: staleCount, color: T.warning },
          { label: "Uncached", value: uncachedCount, color: T.textTertiary },
          { label: "Articles", value: totalItems, color: T.accent },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ flex: 1, background: T.surface, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 10, color: T.textTertiary, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Per-feed rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {feeds.map(feed => {
          const host = (() => { try { return new URL(feed.url).hostname.replace("www.", ""); } catch { return feed.url; } })();
          const age = cacheAge(feed.url);
          const cached = getCachedFeed(feed.url);
          const itemCount = cached?.data?.items?.length || 0;
          const isFresh = age !== null && age < 30;
          const isStale = age !== null && age >= 30;
          const statusColor = isFresh ? T.success : isStale ? T.warning : T.textTertiary;
          const statusLabel = age === null ? "Not loaded" : age < 1 ? "Just now" : age < 60 ? `${age}m ago` : `${Math.round(age/60)}h ago`;
          return (
            <div key={feed.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, background: T.surface }}
              onMouseEnter={e => e.currentTarget.style.background = T.surface2}
              onMouseLeave={e => e.currentTarget.style.background = T.surface}
            >
              <img src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`} alt="" width={14} height={14} style={{ borderRadius: 2, flexShrink: 0 }} onError={e => e.target.style.display="none"} />
              <span style={{ flex: 1, fontSize: 13, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {feed.name || host}
              </span>
              {feed.fetch_full_content && (
                <span style={{ fontSize: 9, background: T.accentSurface, color: T.accentText, padding: "1px 5px", borderRadius: 4, fontWeight: 600, flexShrink: 0 }}>Full</span>
              )}
              {itemCount > 0 && (
                <span style={{ fontSize: 10, color: T.textTertiary, flexShrink: 0 }}>{itemCount} items</span>
              )}
              <span style={{ fontSize: 10, color: statusColor, flexShrink: 0, minWidth: 56, textAlign: "right" }}>{statusLabel}</span>
              <button
                onClick={() => handleRefreshFeed(feed)}
                disabled={refreshing[feed.id]}
                title="Force refresh"
                style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 5, width: 22, height: 22, cursor: "pointer", color: T.textTertiary, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .12s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textTertiary; }}
              >
                {refreshing[feed.id] ? <span style={{ display: "inline-block", animation: "spin .7s linear infinite" }}>↺</span> : "↺"}
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}


// ── Data Privacy & Account ────────────────────────────────────
function DataPrivacyCard({ T, user }) {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [msg, setMsg] = useState("");

  async function handleExportAll() {
    setExporting(true); setMsg("");
    try {
      const [history, saved, highlights, tags, feeds] = await Promise.all([
        supabase.from("history").select("*").eq("user_id", user.id).then(r => r.data || []),
        supabase.from("saved").select("*").eq("user_id", user.id).then(r => r.data || []),
        supabase.from("highlights").select("*").eq("user_id", user.id).then(r => r.data || []),
        supabase.from("article_tags").select("*").eq("user_id", user.id).then(r => r.data || []),
        supabase.from("feeds").select("*").eq("user_id", user.id).then(r => r.data || []),
      ]);
      const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), user_id: user.id, history, saved, highlights, tags, feeds }, null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `feedbox-export-${new Date().toISOString().slice(0,10)}.json`; a.click();
      setMsg("✓ Export downloaded");
    } catch (e) { setMsg("Export failed: " + e.message); }
    finally { setExporting(false); }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm.toLowerCase() !== "delete my account") return;
    setDeleting(true);
    try {
      // Delete all user data first (RLS cascade handles most, but explicit for safety)
      await Promise.all([
        supabase.from("history").delete().eq("user_id", user.id),
        supabase.from("saved").delete().eq("user_id", user.id),
        supabase.from("highlights").delete().eq("user_id", user.id),
        supabase.from("article_tags").delete().eq("user_id", user.id),
        supabase.from("read_items").delete().eq("user_id", user.id),
        supabase.from("feeds").delete().eq("user_id", user.id),
        supabase.from("smart_feeds").delete().eq("user_id", user.id),
        supabase.from("feed_folders").delete().eq("user_id", user.id),
      ]);
      await supabase.auth.signOut();
      window.location.reload();
    } catch (e) { setMsg("Deletion failed: " + e.message); setDeleting(false); }
  }

  return (
    <Card title="Data & Privacy" T={T}>
      <div style={{ fontSize:12, color:T.textTertiary, marginBottom:14, lineHeight:1.6 }}>
        Your data is yours. Export everything or permanently delete your account.{" "}
        <a href="/privacy.html" target="_blank" style={{ color:T.accent, textDecoration:"none" }}>Privacy Policy ↗</a>{" · "}<a href="/terms.html" target="_blank" style={{ color:T.accent, textDecoration:"none" }}>Terms ↗</a>
      </div>

      {/* Export */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.textTertiary, textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>Export your data</div>
        <p style={{ fontSize:12, color:T.textSecondary, margin:"0 0 10px", lineHeight:1.5 }}>Downloads a JSON file with all your history, saved articles, highlights, tags, and feed list.</p>
        <button onClick={handleExportAll} disabled={exporting} style={{ background:T.accent, border:"none", borderRadius:9, padding:"9px 18px", cursor:"pointer", fontSize:13, fontWeight:600, color:"#fff", fontFamily:"inherit", opacity:exporting?0.6:1 }}>
          {exporting ? "Exporting…" : "⬇ Download all data"}
        </button>
      </div>

      {msg && <div style={{ fontSize:12, color:msg.startsWith("✓") ? T.success : T.danger, marginBottom:12, padding:"7px 12px", background:msg.startsWith("✓")?`${T.success}15`:`${T.danger}15`, borderRadius:8 }}>{msg}</div>}

      {/* Delete account */}
      <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.danger, textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>Delete account</div>
        <p style={{ fontSize:12, color:T.textSecondary, margin:"0 0 10px", lineHeight:1.5 }}>This permanently deletes all your data and cannot be undone. Type <strong style={{color:T.text}}>delete my account</strong> to confirm.</p>
        <div style={{ display:"flex", gap:8 }}>
          <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="delete my account"
            style={{ flex:1, background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:9, padding:"8px 12px", fontSize:13, color:T.text, fontFamily:"inherit", outline:"none" }}
            onFocus={e => e.target.style.borderColor=T.danger}
            onBlur={e => e.target.style.borderColor=T.border}
          />
          <button onClick={handleDeleteAccount} disabled={deleteConfirm.toLowerCase() !== "delete my account" || deleting}
            style={{ background: deleteConfirm.toLowerCase()==="delete my account" ? T.danger : T.surface2, border:"none", borderRadius:9, padding:"8px 16px", cursor:"pointer", fontSize:13, fontWeight:600, color: deleteConfirm.toLowerCase()==="delete my account" ? "#fff" : T.textTertiary, fontFamily:"inherit", transition:"all .2s", flexShrink:0 }}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
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
