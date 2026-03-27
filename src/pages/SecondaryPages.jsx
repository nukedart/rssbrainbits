import { useState, useEffect, useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { getHistory, clearHistory, getReadLater, removeReadLater,
         getSaved, unsaveItem, saveItem,
         getFeeds, getFolders, setFeedFolder, updateFeedSettings, deleteFeed,
         updateFolder, deleteFolder,
         getReadingStats } from "../lib/supabase";
import { parseYouTubeUrl, isPodcastUrl } from "../lib/fetchers";
import FeedItem from "../components/FeedItem";
import ContentViewer from "../components/ContentViewer";
import { Button, EmptyState, Spinner } from "../components/UI";
import { feedsToOPML, downloadFile } from "../lib/exportUtils";
import { getCachedFeed, cacheAge, invalidateCachedFeed } from "../lib/feedCache";
import { getPlan, getPlanName, PLANS } from "../lib/plan";
import { track } from "../lib/analytics";
import { getAnthropicKey, setAnthropicKey, getOpenAIKey, setOpenAIKey } from "../lib/apiKeys";

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

  function relTime(iso) {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return m <= 1 ? "just now" : `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <PageShell title="Saved" subtitle={`${items.length} article${items.length !== 1 ? "s" : ""} saved`}>
      <div style={{ width: "100%", maxWidth: 780, padding: "16px 16px 40px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Add URL bar */}
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px",
            borderRadius: 12, border: `1.5px dashed ${T.border}`, background: "transparent",
            cursor: "pointer", color: T.textTertiary, fontSize: 13, fontFamily: "inherit", transition: "all .15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=T.accent; e.currentTarget.style.color=T.accent; e.currentTarget.style.background=T.accentSurface; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.textTertiary; e.currentTarget.style.background="transparent"; }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 2v12M2 8h12"/></svg>
            Save article URL for later…
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input autoFocus value={addUrl}
                onChange={e => { setAddUrl(e.target.value); setAddError(""); }}
                onKeyDown={e => { if (e.key === "Enter") handleAddUrl(); if (e.key === "Escape") { setShowAdd(false); setAddUrl(""); setAddError(""); } }}
                placeholder="Paste an article URL…"
                style={{ flex:1, background:T.surface, border:`1.5px solid ${T.accent}`, borderRadius:10, padding:"10px 14px", fontSize:13, color:T.text, fontFamily:"inherit", outline:"none" }}
              />
              <button onClick={handleAddUrl} disabled={!addUrl.trim() || addLoading}
                style={{ background:T.accent, border:"none", borderRadius:10, padding:"10px 18px", cursor:"pointer", fontSize:13, fontWeight:600, color:"#fff", fontFamily:"inherit", flexShrink:0, opacity:(!addUrl.trim()||addLoading)?0.5:1 }}>
                {addLoading ? "Saving…" : "Save"}
              </button>
              <button onClick={() => { setShowAdd(false); setAddUrl(""); setAddError(""); }}
                style={{ background:T.surface2, border:"none", borderRadius:10, padding:"10px 14px", cursor:"pointer", fontSize:13, color:T.textSecondary, fontFamily:"inherit", flexShrink:0 }}>Cancel</button>
            </div>
            {addError && <div style={{ fontSize:12, color:T.danger, padding:"7px 12px", background:`${T.danger}15`, borderRadius:8 }}>{addError}</div>}
          </div>
        )}

        {loading && <div style={{ display:"flex", justifyContent:"center", paddingTop:60 }}><Spinner size={28} /></div>}

        {!loading && items.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 20px", color:T.textTertiary }}>
            <div style={{ fontSize:40, marginBottom:14 }}>📖</div>
            <div style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:6 }}>Nothing saved yet</div>
            <div style={{ fontSize:13, lineHeight:1.6, maxWidth:320, margin:"0 auto" }}>
              Paste any article URL above, or press <kbd style={{ background:T.surface2, border:`1px solid ${T.border}`, borderRadius:4, padding:"1px 6px", fontSize:12 }}>L</kbd> while reading to save for later.
            </div>
          </div>
        )}

        {/* Stitch list */}
        {items.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
            {items.map((item) => {
              const hostname = (() => { try { return new URL(item.url).hostname; } catch { return ""; } })();
              return (
                <div key={item.url}
                  onClick={() => setOpenItem(item)}
                  style={{
                    display:"flex", alignItems:"center", gap:14,
                    padding:"12px 4px", cursor:"pointer",
                    borderBottom:`1px solid ${T.border}`,
                    transition:"background .12s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background=T.surface2; }}
                  onMouseLeave={e => { e.currentTarget.style.background="transparent"; }}
                >
                  {/* Thumbnail */}
                  {item.image ? (
                    <div style={{ width:72, height:54, flexShrink:0, borderRadius:8, overflow:"hidden", background:T.surface2 }}>
                      <img src={item.image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} onError={e => { e.target.parentElement.style.display="none"; }} />
                    </div>
                  ) : (
                    <div style={{ width:72, height:54, flexShrink:0, borderRadius:8, background:`linear-gradient(135deg, ${T.accent}30, ${T.surface2})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>📄</div>
                  )}

                  {/* Text */}
                  <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:4 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:T.text, lineHeight:1.4, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                      {item.title || item.url}
                    </div>
                    {item.description && (
                      <div style={{ fontSize:12, color:T.textSecondary, lineHeight:1.45, display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                        {item.description}
                      </div>
                    )}
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:11, color:T.textTertiary, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:200 }}>
                        {item.source || hostname}
                      </span>
                      <span style={{ fontSize:11, color:T.textTertiary, flexShrink:0 }}>·</span>
                      <span style={{ fontSize:11, color:T.textTertiary, flexShrink:0 }}>{relTime(item.saved_at)}</span>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={e => { e.stopPropagation(); handleRemove(item.url); }}
                    title="Remove"
                    style={{ background:"none", border:"none", cursor:"pointer", color:T.textTertiary, padding:"6px 8px", borderRadius:7, fontSize:15, lineHeight:1, flexShrink:0, transition:"color .1s, background .1s" }}
                    onMouseEnter={e => { e.currentTarget.style.color=T.danger; e.currentTarget.style.background=`${T.danger}15`; }}
                    onMouseLeave={e => { e.currentTarget.style.color=T.textTertiary; e.currentTarget.style.background="none"; }}
                  >✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
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
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (!user) return;
    getReadingStats(user.id)
      .then(setStats)
      .catch(err => { console.error("StatsPage:", err); setError(true); })
      .finally(() => setLoading(false));
  }, [user]);

  async function handleUpgrade() {
    setUpgrading(true);
    track("upgrade_initiated", { surface: "stats" });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        { method: "POST", headers: { "Authorization": `Bearer ${session?.access_token}`, "Content-Type": "application/json" } }
      );
      const json = await res.json();
      if (json.url) { window.location.href = json.url; return; }
    } catch {}
    setUpgrading(false);
  }

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
          <div style={{ fontSize:13, lineHeight:1.6 }}>Could not load reading data. Try again or contact support.</div>
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
              <button onClick={handleUpgrade} disabled={upgrading} style={{ fontSize:12, color:T.accent, background:"none", border:"none", cursor:"pointer", fontWeight:600, padding:0, fontFamily:"inherit" }}>{upgrading ? "Opening…" : "Upgrade to Pro →"}</button>
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
    track("upgrade_initiated", { surface: "settings" });
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

function NotificationsCard({ T }) {
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [swReady, setSwReady] = useState(false);
  const [digestEnabled, setDigestEnabled] = useState(() => localStorage.getItem("fb-digest-enabled") === "true");
  const [digestTime, setDigestTime] = useState(() => localStorage.getItem("fb-digest-time") || "08:00");
  const timerRef = useRef(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(() => setSwReady(true)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!digestEnabled || permission !== "granted") return;
    scheduleNext();
    return () => clearTimeout(timerRef.current);
  }, [digestEnabled, digestTime, permission]);

  function scheduleNext() {
    clearTimeout(timerRef.current);
    const t = localStorage.getItem("fb-digest-time") || "08:00";
    const [h, m] = t.split(":").map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const ms = target - now;
    timerRef.current = setTimeout(() => {
      if (Notification.permission === "granted" && localStorage.getItem("fb-digest-enabled") === "true") {
        new Notification("Feedbox Digest", {
          body: "Your reading digest is ready. Open Feedbox to see today's highlights.",
          icon: "/feedbox-logo.png",
        });
      }
      scheduleNext();
    }, ms);
  }

  async function handleEnable() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted" && swReady) {
      navigator.serviceWorker.ready.then(sw => sw.sync.register("feedbox-sync").catch(() => {})).catch(() => {});
    }
  }

  function handleTest() {
    if (permission !== "granted") return;
    new Notification("Feedbox", {
      body: "Notifications are working!",
      icon: "/feedbox-logo.png",
    });
  }

  const STATUS = {
    granted:     { text: "Enabled — you'll get alerts for new articles", color: T.accent },
    denied:      { text: "Blocked in browser — enable in site settings", color: "#e53e3e" },
    default:     { text: "Not yet enabled", color: T.textTertiary },
    unsupported: { text: "Not supported in this browser", color: T.textTertiary },
  };
  const s = STATUS[permission] || STATUS.default;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>Browser notifications</div>
          <div style={{ fontSize: 12, color: s.color, marginTop: 2 }}>{s.text}</div>
        </div>
        {permission === "default" && (
          <button onClick={handleEnable} style={{ background: T.accent, color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", flexShrink: 0 }}>Enable</button>
        )}
        {permission === "granted" && (
          <button onClick={handleTest} style={{ background: T.surface2, color: T.textSecondary, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", flexShrink: 0 }}>Test</button>
        )}
      </div>
      <div style={{ fontSize: 12, color: T.textTertiary, lineHeight: 1.7 }}>
        Get notified when new articles arrive in your feeds. Works best with the app installed as a PWA — use your browser's "Add to Home Screen" option.
      </div>

      {/* Digest reminder scheduler */}
      {permission === "granted" && (
        <div style={{ marginTop: 14, padding: "12px 14px", background: T.surface, borderRadius: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 8 }}>Daily digest reminder</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="time"
              value={digestTime}
              onChange={e => { setDigestTime(e.target.value); localStorage.setItem("fb-digest-time", e.target.value); }}
              style={{
                background: T.card, border: `1px solid ${T.border}`, borderRadius: 7,
                padding: "5px 10px", fontSize: 13, color: T.text, fontFamily: "inherit",
                outline: "none", cursor: "pointer", flexShrink: 0,
              }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", flex: 1 }}>
              <input
                type="checkbox"
                checked={digestEnabled}
                onChange={e => { setDigestEnabled(e.target.checked); localStorage.setItem("fb-digest-enabled", e.target.checked ? "true" : "false"); }}
                style={{ accentColor: T.accent, width: 14, height: 14, flexShrink: 0 }}
              />
              <span style={{ fontSize: 12, color: T.textSecondary }}>
                {digestEnabled ? `Reminder set for ${digestTime}` : "Enable daily reminder"}
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingsPage({ feeds: appFeeds = [], folders: appFolders = [], onFeedUpdate, onNavigate }) {
  const { T, theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const planName = getPlanName(user);
  const shortcuts = [
    { key: "J / ↓",   action: "Next article" },
    { key: "K / ↑",   action: "Previous article" },
    { key: "O / Enter", action: "Open article" },
    { key: "R",        action: "Toggle read/unread" },
    { key: "L",        action: "Save article" },
    { key: "S",        action: "Save article" },
    { key: "A",        action: "Add feed / URL" },
    { key: "Esc",      action: "Close reader" },
  ];

  return (
    <PageShell title="Settings">
      <div style={{ maxWidth: 520, width: "100%", padding: "24px 22px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Account + Appearance inline */}
        <Card title="Account" T={T}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            {user?.user_metadata?.avatar_url
              ? <img src={user.user_metadata.avatar_url} alt="" style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0 }} />
              : <div style={{ width: 44, height: 44, borderRadius: "50%", background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>👤</div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.user_metadata?.full_name || user?.user_metadata?.user_name || "GitHub User"}</div>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: ".06em", padding: "2px 7px",
                  borderRadius: 20, flexShrink: 0,
                  background: planName === "Pro" ? T.accent : T.surface2,
                  color: planName === "Pro" ? "#fff" : T.textTertiary,
                  border: `1px solid ${planName === "Pro" ? T.accent : T.border}`,
                }}>{planName === "Pro" ? "⚡ PRO" : "FREE"}</span>
              </div>
              <div style={{ fontSize: 12, color: T.textSecondary }}>{user?.email}</div>
            </div>
            {/* Theme toggle — icon buttons */}
            <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
              {[
                { id: "distilled", title: "Dark", icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M13.5 10.5A6 6 0 0 1 5.5 2.5a6 6 0 1 0 8 8z"/></svg> },
                { id: "light",     title: "Light", icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/></svg> },
              ].map(({ id, title, icon }) => {
                const active = theme === id || (id === "distilled" && theme === "nocturne");
                return (
                  <button key={id} onClick={() => setTheme(id)} title={title} style={{
                    width: 28, height: 28, borderRadius: 7, border: `1px solid ${active ? T.accent : T.border}`,
                    background: active ? T.accentSurface : T.surface, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: active ? T.accent : T.textTertiary, transition: "all .15s",
                  }}>{icon}</button>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={signOut}>Sign out</Button>
            <button onClick={async () => {
              await supabase.auth.refreshSession();
              window.location.reload();
            }} style={{ fontSize: 11, color: T.textTertiary, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "3px 6px", borderRadius: 6, transition: "color .12s" }}
              onMouseEnter={e => e.currentTarget.style.color = T.text}
              onMouseLeave={e => e.currentTarget.style.color = T.textTertiary}
              title="Refresh your account session — use this if your Pro status isn't showing"
            >↺ Refresh account</button>
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

        {/* AI Integration */}
        <Card title="AI Integration" T={T}>
          <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 12, lineHeight: 1.6 }}>
            Add a personal fallback API key — used only if the app's built-in summarization is unavailable. Stored locally in your browser only.
          </div>
          <ApiKeyInput
            label="Anthropic API Key"
            placeholder="sk-ant-api03-…"
            hint="Personal fallback for Claude Haiku. Stored in browser only."
            getValue={getAnthropicKey}
            setValue={setAnthropicKey}
            T={T}
          />
          <div style={{ marginTop: 10 }}>
            <ApiKeyInput
              label="OpenAI API Key"
              placeholder="sk-…"
              hint="Personal fallback for GPT-4o-mini. Stored in browser only."
              getValue={getOpenAIKey}
              setValue={setOpenAIKey}
              T={T}
            />
          </div>
        </Card>

        {/* Reading Stats */}
        {onNavigate && (
          <Card title="Reading Stats" T={T}>
            <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 12 }}>Track your reading habits and most-read sources.</div>
            <Button variant="secondary" size="sm" onClick={() => onNavigate("stats")}>View reading stats →</Button>
          </Card>
        )}

        {/* Notifications */}
        <Card title="Notifications" T={T}>
          <NotificationsCard T={T} />
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

        {/* Manage Feeds link */}
        {appFeeds.length > 0 && onNavigate && (
          <button onClick={() => onNavigate("manage-feeds")} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 18px", background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, cursor: "pointer", fontFamily: "inherit", transition: "border-color .15s",
            textAlign: "left", width: "100%",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=T.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Manage Feeds</div>
              <div style={{ fontSize: 12, color: T.textTertiary, marginTop: 2 }}>{appFeeds.length} feed{appFeeds.length !== 1 ? "s" : ""} · Rename, organise into collections</div>
            </div>
            <span style={{ color: T.textTertiary, fontSize: 16 }}>›</span>
          </button>
        )}

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

        <PlanCard T={T} user={user} feedCount={appFeeds.length} planName={planName} />
        <ReadingStatsCard T={T} user={user} />
        <FeedHealthCard T={T} user={user} feeds={appFeeds} />
        <DataPrivacyCard T={T} user={user} />


        {/* Admin — analytics shortcut */}
        {user?.user_metadata?.is_admin && onNavigate && (
          <button onClick={() => onNavigate("analytics")} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 18px", background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, cursor: "pointer", fontFamily: "inherit", transition: "border-color .15s",
            textAlign: "left", width: "100%",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=T.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Admin Panel</div>
              <div style={{ fontSize: 12, color: T.textTertiary, marginTop: 2 }}>Analytics · AI settings · API keys</div>
            </div>
            <span style={{ color: T.textTertiary, fontSize: 16 }}>›</span>
          </button>
        )}

        {/* About */}
        <Card title="About" T={T}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic", fontSize: 16, fontWeight: 500, color: T.text, letterSpacing: "-.01em" }}>Feed Box</span>
            {/* global __APP_VERSION__ */}
            <span style={{ fontSize: 11, fontWeight: 600, color: T.textTertiary, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 20, padding: "2px 10px" }}>
              v{typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "?"}
            </span>
          </div>
          <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.7 }}>
            A calm reading space for RSS, articles, and YouTube. Built with React + Vite, hosted on GitHub Pages, powered by Supabase.
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

// ── Source Dashboard (Manage Feeds) ───────────────────────────

const FOLDER_COLORS = { gray:"#8A9099", teal:"#2DA66E", blue:"#2F6FED", amber:"#D4820A", red:"#EF4444", purple:"#8B5CF6", green:"#22C55E" };

function feedType(feed) {
  try {
    if (feed.type === "youtube" || feed.url?.includes("youtube.com/feeds/videos.xml") || parseYouTubeUrl(feed.url).isYouTube) return "youtube";
    if (feed.type === "podcast" || isPodcastUrl(feed.url)) return "podcast";
  } catch {}
  return "article";
}

const TYPE_BADGE = {
  youtube: { label: "YouTube", bg: "#FF000018", color: "#CC0000" },
  podcast: { label: "Podcast", bg: "#8B5CF620", color: "#8B5CF6" },
  article: { label: "RSS",     bg: null,        color: null       },
};
function FreqBadge({ T, type = "article" }) {
  const cfg = TYPE_BADGE[type] || TYPE_BADGE.article;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: cfg.bg || T.surface2, color: cfg.color || T.textTertiary, letterSpacing: ".03em", flexShrink: 0 }}>
      {cfg.label}
    </span>
  );
}

function Toggle({ checked, onChange, T }) {
  return (
    <div onClick={() => onChange(!checked)} style={{ width: 34, height: 19, borderRadius: 10, background: checked ? T.accent : T.surface2, cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 2, left: checked ? 17 : 2, width: 15, height: 15, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
    </div>
  );
}

function InlineNameEditor({ name, T, onSave, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(name || "");
  const inputRef = useRef(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setVal(name || ""); }, [name]);
  function commit() {
    const trimmed = val.trim();
    if (trimmed && trimmed !== name) onSave(trimmed);
    setEditing(false);
  }
  if (editing) {
    return (
      <input ref={inputRef} value={val} onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(name || ""); setEditing(false); } }}
        style={{ flex: 1, background: T.surface2, border: `1.5px solid ${T.accent}`, borderRadius: 6, padding: "3px 8px", fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none", minWidth: 0 }}
        onClick={e => e.stopPropagation()}
      />
    );
  }
  return (
    <span title="Click to rename" onClick={e => { e.stopPropagation(); setEditing(true); }}
      style={{ fontSize: 13, fontWeight: 500, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "text", lineHeight: 1.3 }}>
      {name || placeholder || "Unnamed"}
    </span>
  );
}

function SourceRow({ feed, T, onUpdate, onDelete, folders = [], onMoveToFolder }) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const folderRef = useRef(null);
  useEffect(() => {
    if (!folderOpen) return;
    function onOutside(e) { if (folderRef.current && !folderRef.current.contains(e.target)) setFolderOpen(false); }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [folderOpen]);
  const host = (() => { try { return new URL(feed.url).hostname.replace("www.", ""); } catch { return feed.url; } })();
  const age = cacheAge(feed.url);
  const isFresh = age !== null && age < 30;
  const isStale = age !== null && age >= 30;
  const statusColor = isFresh ? T.success : isStale ? T.warning : T.textTertiary;
  const lastSync = age === null ? "Not synced" : age < 1 ? "Just now" : age < 60 ? `${age}m ago` : `${Math.round(age / 60)}h ago`;
  const type = feedType(feed);
  const cachedCount = getCachedFeed(feed.url)?.data?.items?.length ?? null;
  const currentFolder = folders.find(f => f.id === feed.folder_id);

  async function handleMoveToFolder(folderId) {
    setFolderOpen(false);
    try {
      await setFeedFolder(feed.id, folderId);
      onUpdate(feed.id, { folder_id: folderId });
      onMoveToFolder?.(feed.id, folderId);
    } catch (err) { console.error(err); }
  }

  async function handleToggleFull(val) {
    setSaving(true);
    try {
      await updateFeedSettings(feed.id, { fetch_full_content: val });
      onUpdate(feed.id, { fetch_full_content: val });
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!window.confirm(`Remove "${feed.name || host}" from your feeds?`)) return;
    setDeleting(true);
    try {
      await deleteFeed(feed.id);
      onDelete(feed.id);
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  }

  async function handleRename(name) {
    setSaving(true);
    try {
      await updateFeedSettings(feed.id, { name });
      onUpdate(feed.id, { name });
    } finally { setSaving(false); }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: `1px solid ${T.border}`, transition: "background .12s", opacity: deleting ? 0.4 : 1 }}
      onMouseEnter={e => e.currentTarget.style.background = T.surface}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      {/* Favicon */}
      <div style={{ width: 28, height: 28, borderRadius: 8, overflow: "hidden", background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <img src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`} alt="" width={16} height={16}
          onError={e => { e.target.style.display = "none"; }} />
      </div>

      {/* Name + URL */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <InlineNameEditor
          name={feed.name}
          placeholder={(() => { try { return new URL(feed.url).hostname.replace("www.", ""); } catch { return feed.url; } })()}
          T={T}
          onSave={handleRename}
        />
        <span style={{ fontSize: 11, color: T.textTertiary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{host}</span>
      </div>

      {/* Article count */}
      {cachedCount !== null && (
        <span style={{ fontSize: 11, color: T.textTertiary, flexShrink: 0, minWidth: 32, textAlign: "right" }} title="Cached articles">
          {cachedCount}
        </span>
      )}

      {/* Last sync */}
      <span style={{ fontSize: 11, color: statusColor, flexShrink: 0, minWidth: 68, textAlign: "right" }}>{lastSync}</span>

      {/* Type badge */}
      <FreqBadge T={T} type={type} />

      {/* Folder selector */}
      {folders.length > 0 && (
        <div ref={folderRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setFolderOpen(v => !v)}
            title={currentFolder ? `Folder: ${currentFolder.name}` : "Assign to folder"}
            style={{
              background: folderOpen ? T.surface2 : "none", border: "none", cursor: "pointer",
              color: currentFolder ? T.accent : T.textTertiary,
              padding: "4px 6px", borderRadius: 6, display: "flex", alignItems: "center",
              transition: "color .12s, background .12s",
            }}
            onMouseEnter={e => { if (!folderOpen) { e.currentTarget.style.color = T.accent; e.currentTarget.style.background = T.surface; } }}
            onMouseLeave={e => { if (!folderOpen) { e.currentTarget.style.color = currentFolder ? T.accent : T.textTertiary; e.currentTarget.style.background = "none"; } }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1.5 3.5h4.5l1.5 2h7v7.5h-13z"/>
            </svg>
          </button>
          {folderOpen && (
            <div
              style={{
                position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 200,
                background: T.card, border: `1px solid ${T.border}`, borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,.16)", minWidth: 160, overflow: "hidden",
              }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => handleMoveToFolder(null)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "8px 12px", border: "none", background: !currentFolder ? T.accentSurface : "transparent",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: !currentFolder ? T.accent : T.textSecondary,
                  transition: "background .1s",
                }}
                onMouseEnter={e => { if (currentFolder) e.currentTarget.style.background = T.surface; }}
                onMouseLeave={e => { if (currentFolder) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: 10, color: T.textTertiary }}>No folder</span>
              </button>
              {folders.map(f => {
                const FCOLS = { gray:"#8A9099", teal:"#accfae", blue:"#2F6FED", amber:"#AA8439", red:"#EF4444", purple:"#8B5CF6", green:"#22C55E" };
                const dot = FCOLS[f.color] || "#8A9099";
                const isCurrent = feed.folder_id === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => handleMoveToFolder(f.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, width: "100%",
                      padding: "8px 12px", border: "none", background: isCurrent ? T.accentSurface : "transparent",
                      cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: isCurrent ? T.accent : T.textSecondary,
                      transition: "background .1s",
                    }}
                    onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = T.surface; }}
                    onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: dot, flexShrink: 0 }} />
                    {f.name}
                    {isCurrent && <span style={{ marginLeft: "auto", fontSize: 10 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Full content toggle */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
        <Toggle checked={!!feed.fetch_full_content} onChange={handleToggleFull} T={T} />
        <span style={{ fontSize: 9, color: T.textTertiary, textAlign: "center" }}>Full</span>
      </div>

      {/* Delete */}
      <button onClick={handleDelete} disabled={deleting}
        title="Remove feed"
        style={{ background: "none", border: "none", cursor: "pointer", color: T.textTertiary, padding: "4px 6px", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "color .12s, background .12s", fontSize: 13 }}
        onMouseEnter={e => { e.currentTarget.style.color = T.danger; e.currentTarget.style.background = `${T.danger}15`; }}
        onMouseLeave={e => { e.currentTarget.style.color = T.textTertiary; e.currentTarget.style.background = "none"; }}
      >
        {deleting ? "…" : (
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4h12M6 4V2h4v2M5 4v9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4"/>
          </svg>
        )}
      </button>
    </div>
  );
}

function FeedGroup({ title, icon, feeds, T, onUpdate, onDelete, folders, onMoveToFolder }) {
  const [collapsed, setCollapsed] = useState(false);
  if (feeds.length === 0) return null;
  return (
    <div style={{ marginBottom: 0 }}>
      <button onClick={() => setCollapsed(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: T.text, letterSpacing: "-.01em" }}>{title}</span>
        <span style={{ fontSize: 11, color: T.textTertiary, marginLeft: 4 }}>{feeds.length}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: T.textTertiary, transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", display: "inline-block", transition: "transform .15s" }}>▼</span>
      </button>
      {!collapsed && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 16px", borderBottom: `1px solid ${T.border}`, background: T.surface }}>
          <div style={{ width: 28, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: T.textTertiary }}>Source</span>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: T.textTertiary, minWidth: 32, textAlign: "right" }}>Items</span>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: T.textTertiary, minWidth: 68, textAlign: "right" }}>Last Sync</span>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: T.textTertiary, width: 62 }}>Type</span>
          {folders?.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: T.textTertiary, width: 25 }}>Folder</span>}
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: T.textTertiary, width: 36, textAlign: "center" }}>Full</span>
          <div style={{ width: 25 }} />
        </div>
      )}
      {!collapsed && feeds.map(feed => (
        <SourceRow key={feed.id} feed={feed} T={T} onUpdate={onUpdate} onDelete={onDelete} folders={folders} onMoveToFolder={onMoveToFolder} />
      ))}
    </div>
  );
}

// ── Folder row for folder management tab ─────────────────────
function FolderRow({ folder, feedCount, T, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [deleting, setDeleting] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const dot = FOLDER_COLORS[folder.color] || FOLDER_COLORS.gray;

  async function handleRename(name) {
    try {
      const updated = await updateFolder(folder.id, { name });
      onUpdate(folder.id, updated);
    } catch (err) { console.error(err); }
  }

  async function handleColorChange(color) {
    setShowColors(false);
    try {
      const updated = await updateFolder(folder.id, { color });
      onUpdate(folder.id, updated);
    } catch (err) { console.error(err); }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete collection "${folder.name}"? Feeds inside will become uncategorized.`)) return;
    setDeleting(true);
    try {
      await deleteFolder(folder.id);
      onDelete(folder.id);
    } catch (err) { console.error(err); setDeleting(false); }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${T.border}`, transition: "background .12s", opacity: deleting ? 0.4 : 1, position: "relative" }}
      onMouseEnter={e => e.currentTarget.style.background = T.surface}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; setShowColors(false); }}
    >
      {/* Reorder arrows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
        <button onClick={onMoveUp} disabled={isFirst} title="Move up"
          style={{ background: "none", border: "none", cursor: isFirst ? "default" : "pointer", color: isFirst ? T.border : T.textTertiary, padding: "1px 3px", fontSize: 10, lineHeight: 1, transition: "color .1s" }}
          onMouseEnter={e => { if (!isFirst) e.currentTarget.style.color = T.accent; }}
          onMouseLeave={e => e.currentTarget.style.color = isFirst ? T.border : T.textTertiary}
        >▲</button>
        <button onClick={onMoveDown} disabled={isLast} title="Move down"
          style={{ background: "none", border: "none", cursor: isLast ? "default" : "pointer", color: isLast ? T.border : T.textTertiary, padding: "1px 3px", fontSize: 10, lineHeight: 1, transition: "color .1s" }}
          onMouseEnter={e => { if (!isLast) e.currentTarget.style.color = T.accent; }}
          onMouseLeave={e => e.currentTarget.style.color = isLast ? T.border : T.textTertiary}
        >▼</button>
      </div>

      {/* Color dot — click to pick */}
      <div style={{ position: "relative" }}>
        <button onClick={() => setShowColors(v => !v)} title="Change color"
          style={{ width: 20, height: 20, borderRadius: "50%", background: dot, border: `2px solid ${showColors ? T.text : "transparent"}`, cursor: "pointer", flexShrink: 0, transition: "border .12s" }}
        />
        {showColors && (
          <div style={{ position: "absolute", top: 26, left: 0, display: "flex", gap: 5, background: T.card, border: `1px solid ${T.borderStrong}`, borderRadius: 10, padding: "7px 9px", boxShadow: "0 4px 16px rgba(0,0,0,.15)", zIndex: 20 }}>
            {Object.entries(FOLDER_COLORS).map(([key, hex]) => (
              <button key={key} onClick={() => handleColorChange(key)} title={key}
                style={{ width: 18, height: 18, borderRadius: "50%", background: hex, border: folder.color === key ? `2px solid ${T.text}` : "2px solid transparent", cursor: "pointer", transition: "border .1s" }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Name (inline editable) */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <InlineNameEditor name={folder.name} T={T} onSave={handleRename} placeholder="Untitled Collection" />
      </div>

      {/* Feed count */}
      <span style={{ fontSize: 12, color: T.textTertiary, flexShrink: 0, minWidth: 60, textAlign: "right" }}>
        {feedCount} {feedCount === 1 ? "feed" : "feeds"}
      </span>

      {/* Delete */}
      <button onClick={handleDelete} disabled={deleting} title="Delete collection"
        style={{ background: "none", border: "none", cursor: "pointer", color: T.textTertiary, padding: "4px 6px", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "color .12s, background .12s" }}
        onMouseEnter={e => { e.currentTarget.style.color = T.danger; e.currentTarget.style.background = `${T.danger}15`; }}
        onMouseLeave={e => { e.currentTarget.style.color = T.textTertiary; e.currentTarget.style.background = "none"; }}
      >
        {deleting ? "…" : (
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4h12M6 4V2h4v2M5 4v9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4"/>
          </svg>
        )}
      </button>
    </div>
  );
}

export function ManageFeedsPage({ feeds: appFeeds = [], folders: appFolders = [], onFeedUpdate, onFeedDeleted, onNavigate, onAddFolder, onFolderUpdate, onFolderDeleted, onAddSource }) {
  const { T } = useTheme();
  const { user } = useAuth();
  const [feeds, setFeeds] = useState(appFeeds);
  const [folders, setFolders] = useState(appFolders);
  const [filterType, setFilterType] = useState("all");
  const [activeTab, setActiveTab] = useState("feeds"); // "feeds" | "folders"
  const [syncingAll, setSyncingAll] = useState(false);

  useEffect(() => { setFeeds(appFeeds); }, [appFeeds]);
  useEffect(() => { setFolders(appFolders); }, [appFolders]);

  function handleUpdate(feedId, data) {
    setFeeds(prev => prev.map(f => f.id === feedId ? { ...f, ...data } : f));
    onFeedUpdate?.(feedId, data);
  }

  function handleDelete(feedId) {
    setFeeds(prev => prev.filter(f => f.id !== feedId));
    onFeedDeleted?.(feedId);
  }

  function handleFolderUpdate(folderId, updated) {
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, ...updated } : f));
    onFolderUpdate?.(folderId, updated);
  }

  function handleFolderDelete(folderId) {
    setFolders(prev => prev.filter(f => f.id !== folderId));
    onFolderDeleted?.(folderId);
  }

  function moveFolder(idx, dir) {
    const next = [...folders];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setFolders(next);
  }

  async function handleSyncAll() {
    setSyncingAll(true);
    try {
      const { fetchRSSFeed } = await import("../lib/fetchers");
      await Promise.allSettled(feeds.map(f => {
        invalidateCachedFeed(f.url);
        return fetchRSSFeed(f.url, { forceRefresh: true });
      }));
    } finally { setSyncingAll(false); }
  }

  // Stats
  const totalItems = feeds.reduce((sum, f) => {
    const cached = getCachedFeed(f.url);
    return sum + (cached?.data?.items?.length || 0);
  }, 0);
  const freshCount = feeds.filter(f => { const a = cacheAge(f.url); return a !== null && a < 30; }).length;
  const syncHealth = feeds.length > 0 ? Math.round((freshCount / feeds.length) * 100) : 0;
  const healthLabel = syncHealth >= 90 ? "OPTIMAL" : syncHealth >= 60 ? "GOOD" : syncHealth >= 30 ? "FAIR" : "POOR";
  const healthColor = syncHealth >= 90 ? T.success : syncHealth >= 60 ? T.accent : syncHealth >= 30 ? T.warning : T.danger;
  const staleFeedsCount = feeds.filter(f => { const a = cacheAge(f.url); return a !== null && a > 120; }).length;

  const filtered = filterType === "all" ? feeds : feeds.filter(f => feedType(f) === filterType);
  const ytFeeds  = filtered.filter(f => feedType(f) === "youtube");
  const podFeeds = filtered.filter(f => feedType(f) === "podcast");
  const artFeeds = filtered.filter(f => feedType(f) === "article");

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
      {/* ── Header ── */}
      <div style={{ padding: "14px 24px 0", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: "-.01em" }}>Source Dashboard</div>
            <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 1 }}>{feeds.length} source{feeds.length !== 1 ? "s" : ""} · {folders.length} collection{folders.length !== 1 ? "s" : ""}</div>
          </div>
          <button onClick={onAddSource}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 100, border: `1.5px solid ${T.accent}`, background: T.accentSurface, color: T.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = T.accent; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = T.accentSurface; e.currentTarget.style.color = T.accent; }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 1v10M1 6h10"/></svg>
            Add Source
          </button>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 0 }}>
          {[["feeds", `Feeds (${feeds.length})`], ["folders", `Collections (${folders.length})`]].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              style={{ padding: "7px 16px", fontSize: 13, fontWeight: activeTab === id ? 600 : 400, color: activeTab === id ? T.accent : T.textTertiary, background: "none", border: "none", borderBottom: `2px solid ${activeTab === id ? T.accent : "transparent"}`, cursor: "pointer", fontFamily: "inherit", transition: "all .15s", marginBottom: -1 }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {activeTab === "feeds" ? (
          <>
            {/* Stats bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, padding: "20px 24px 0" }}>
              {[
                { label: "Total Sources", value: feeds.length, color: T.text },
                { label: "Articles Loaded", value: totalItems, color: T.accent },
                { label: "Sync Health", value: `${syncHealth}%`, badge: healthLabel, color: healthColor },
                { label: "Fresh Feeds", value: freshCount, color: T.success },
              ].map(({ label, value, badge, color }) => (
                <div key={label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                    {value}
                    {badge && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: `${color}20`, color, letterSpacing: ".08em" }}>{badge}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: T.textTertiary }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Stale alert */}
            {staleFeedsCount > 0 && (
              <div style={{ margin: "16px 24px 0", padding: "12px 16px", background: `${T.warning}18`, border: `1px solid ${T.warning}40`, borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14 }}>⚠️</span>
                <div style={{ flex: 1, fontSize: 13, color: T.text }}>
                  <span style={{ fontWeight: 600 }}>Stale Feeds — </span>
                  <span style={{ color: T.textSecondary }}>{staleFeedsCount} feed{staleFeedsCount !== 1 ? "s have" : " has"} not synced in over 2 hours.</span>
                </div>
                <button onClick={handleSyncAll} disabled={syncingAll}
                  style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 7, border: `1px solid ${T.warning}`, background: "transparent", color: T.warning, cursor: "pointer", fontFamily: "inherit" }}>
                  {syncingAll ? "Syncing…" : "Sync All"}
                </button>
              </div>
            )}

            {/* Filter + Sync row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 24px 12px" }}>
              <div style={{ display: "flex", background: T.surface, borderRadius: 100, padding: 2 }}>
                {[["all","All"],["youtube","YouTube"],["podcast","Podcasts"],["article","Articles"]].map(([v, label]) => (
                  <button key={v} onClick={() => setFilterType(v)}
                    style={{ padding: "4px 12px", borderRadius: 100, border: "none", background: filterType === v ? T.bg : "transparent", color: filterType === v ? T.text : T.textTertiary, fontSize: 12, fontWeight: filterType === v ? 600 : 400, cursor: "pointer", fontFamily: "inherit", transition: "all .12s", boxShadow: filterType === v ? "0 1px 3px rgba(0,0,0,.12)" : "none" }}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1 }} />
              <button onClick={handleSyncAll} disabled={syncingAll}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: syncingAll ? T.accentSurface : T.surface, color: syncingAll ? T.accent : T.textSecondary, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}
                onMouseEnter={e => { if (!syncingAll) { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; } }}
                onMouseLeave={e => { if (!syncingAll) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSecondary; } }}
              >
                <span style={{ display: "inline-block", animation: syncingAll ? "spin .7s linear infinite" : "none" }}>↺</span>
                {syncingAll ? "Syncing…" : "Sync All"}
              </button>
            </div>

            {/* Feed groups */}
            {feeds.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: T.textTertiary }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📡</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>No sources yet</div>
                <div style={{ fontSize: 13, marginBottom: 20 }}>Add your first RSS feed, podcast, or YouTube channel.</div>
                <button onClick={onAddSource}
                  style={{ padding: "9px 20px", borderRadius: 100, border: `1.5px solid ${T.accent}`, background: T.accentSurface, color: T.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  + Add Source
                </button>
              </div>
            ) : ytFeeds.length === 0 && podFeeds.length === 0 && artFeeds.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: T.textTertiary, fontSize: 13 }}>
                No {filterType} sources found.
              </div>
            ) : (
              <div style={{ margin: "0 24px 40px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                <FeedGroup title="YouTube Channels" icon="▶" feeds={ytFeeds} T={T} onUpdate={handleUpdate} onDelete={handleDelete} folders={folders} onMoveToFolder={(feedId, folderId) => { handleUpdate(feedId, { folder_id: folderId }); }} />
                <FeedGroup title="Podcasts" icon="🎙" feeds={podFeeds} T={T} onUpdate={handleUpdate} onDelete={handleDelete} folders={folders} onMoveToFolder={(feedId, folderId) => { handleUpdate(feedId, { folder_id: folderId }); }} />
                <FeedGroup title="Article Feeds" icon="📰" feeds={artFeeds} T={T} onUpdate={handleUpdate} onDelete={handleDelete} folders={folders} onMoveToFolder={(feedId, folderId) => { handleUpdate(feedId, { folder_id: folderId }); }} />
              </div>
            )}
          </>
        ) : (
          /* ── Folders tab ── */
          <div style={{ padding: "20px 24px 40px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Collections</div>
                <div style={{ fontSize: 12, color: T.textTertiary, marginTop: 2 }}>Group your feeds into collections. Click a name to rename, click the dot to change color.</div>
              </div>
              <button onClick={onAddFolder}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 100, border: `1.5px solid ${T.accent}`, background: T.accentSurface, color: T.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .15s", flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.background = T.accent; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = T.accentSurface; e.currentTarget.style.color = T.accent; }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 1v10M1 6h10"/></svg>
                New Collection
              </button>
            </div>

            {folders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, color: T.textTertiary }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📁</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 6 }}>No collections yet</div>
                <div style={{ fontSize: 13, marginBottom: 18 }}>Organize your feeds into collections to keep things tidy.</div>
                <button onClick={onAddFolder}
                  style={{ padding: "8px 18px", borderRadius: 100, border: `1.5px solid ${T.accent}`, background: T.accentSurface, color: T.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  + New Collection
                </button>
              </div>
            ) : (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                {/* Column headers */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", borderBottom: `1px solid ${T.border}`, background: T.surface }}>
                  <div style={{ width: 28, flexShrink: 0 }} />
                  <div style={{ width: 20, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: T.textTertiary }}>Name</span>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: T.textTertiary, minWidth: 60, textAlign: "right" }}>Feeds</span>
                  <div style={{ width: 25 }} />
                </div>
                {folders.map((folder, idx) => (
                  <FolderRow
                    key={folder.id}
                    folder={folder}
                    feedCount={feeds.filter(f => f.folder_id === folder.id).length}
                    T={T}
                    onUpdate={handleFolderUpdate}
                    onDelete={handleFolderDelete}
                    onMoveUp={() => moveFolder(idx, -1)}
                    onMoveDown={() => moveFolder(idx, 1)}
                    isFirst={idx === 0}
                    isLast={idx === folders.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
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
