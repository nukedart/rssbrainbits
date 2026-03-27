// ── Analytics Dashboard ───────────────────────────────────────
// Admin-only. Access gated by is_admin in user_metadata.
// Set via Supabase SQL editor:
//   UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"is_admin":true}'
//   WHERE email = 'your@email.com';
import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { Spinner } from "../components/UI";
import { getAppConfig, setAppConfig } from "../lib/supabase";

// ── Helpers ───────────────────────────────────────────────────
function isoDate(d) { return d.toISOString().slice(0, 10); }

function last30Days() {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(isoDate(d));
  }
  return days;
}

function startOfDay(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ── Sub-components ────────────────────────────────────────────
function Stat({ label, value, sub, color }) {
  const { T } = useTheme();
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
      padding: "18px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.textTertiary,
        textTransform: "uppercase", letterSpacing: ".07em" }}>{label}</div>
      <div style={{ fontSize: 34, fontWeight: 800, color: color || T.text,
        lineHeight: 1.1, letterSpacing: "-.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: T.textSecondary }}>{sub}</div>}
    </div>
  );
}

function BarChart({ data, label, color }) {
  const { T } = useTheme();
  const max = Math.max(1, ...data.map(d => d.count));
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary,
        textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 16 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 72 }}>
        {data.map((d, i) => (
          <div key={i} title={`${d.day}: ${d.count}`} style={{ flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", gap: 3, height: "100%", justifyContent: "flex-end" }}>
            <div style={{ width: "100%", background: d.count > 0 ? (color || T.accent) : T.border,
              borderRadius: "3px 3px 0 0", height: `${Math.max(2, (d.count / max) * 100)}%`,
              opacity: d.count > 0 ? 1 : 0.3, transition: "height .3s ease" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6,
        fontSize: 10, color: T.textTertiary }}>
        <span>{data[0]?.day?.slice(5)}</span>
        <span>{data[data.length - 1]?.day?.slice(5)}</span>
      </div>
    </div>
  );
}

function EventTable({ events, T }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`,
        fontSize: 12, fontWeight: 700, color: T.textSecondary,
        textTransform: "uppercase", letterSpacing: ".07em" }}>Top events (last 30 days)</div>
      <div>
        {events.map(({ event, count }, i) => (
          <div key={event} style={{ display: "flex", alignItems: "center", padding: "10px 20px",
            borderBottom: i < events.length - 1 ? `1px solid ${T.border}` : "none", gap: 12 }}>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: T.text,
              fontFamily: "monospace" }}>{event}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>{count}</div>
            <div style={{ width: 100, height: 6, background: T.border, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", background: T.accent, borderRadius: 3,
                width: `${(count / events[0]?.count) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelRow({ label, count, pct, color, T }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px",
      borderBottom: `1px solid ${T.border}` }}>
      <div style={{ flex: 1, fontSize: 13, color: T.text }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{count}</div>
      {pct !== null && (
        <div style={{ fontSize: 11, color: T.textTertiary, width: 48, textAlign: "right" }}>
          {pct}%
        </div>
      )}
    </div>
  );
}

// ── AI Settings Tab ───────────────────────────────────────────
const MODELS = {
  anthropic: {
    id: "anthropic",
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    input: "$0.80 / 1M tokens",
    output: "$4.00 / 1M tokens",
    costPerSummary: 0.000840,
    workerSecret: "ANTHROPIC_API_KEY",
    edgeFnSecret: "ANTHROPIC_API_KEY",
    wranglerCmd: "npx wrangler secret put ANTHROPIC_API_KEY",
    supabaseCmd: "supabase secrets set ANTHROPIC_API_KEY=sk-ant-...",
  },
  openai: {
    id: "openai",
    name: "GPT-4o-mini",
    provider: "OpenAI",
    input: "$0.15 / 1M tokens",
    output: "$0.60 / 1M tokens",
    costPerSummary: 0.000195,
    workerSecret: "OPENAI_API_KEY",
    edgeFnSecret: "OPENAI_API_KEY",
    wranglerCmd: "npx wrangler secret put OPENAI_API_KEY",
    supabaseCmd: "supabase secrets set OPENAI_API_KEY=sk-...",
  },
};

function AISettingsTab({ T }) {
  const [provider, setProviderState] = useState("anthropic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [usageLoading, setUsageLoading] = useState(true);

  useEffect(() => {
    async function init() {
      // Load provider from Supabase (source of truth)
      try {
        const val = await getAppConfig("ai_provider");
        if (val) setProviderState(val);
      } catch {}
      setLoading(false);
    }
    init();
    loadUsage();
  }, []);

  async function loadUsage() {
    setUsageLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data } = await supabase
        .from("ai_usage")
        .select("user_id, date, count")
        .gte("date", since.toISOString().slice(0, 10))
        .order("date", { ascending: false });
      setUsageData(data || []);
    } catch {
      setUsageData([]);
    } finally {
      setUsageLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      await setAppConfig("ai_provider", provider);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // Aggregate usage stats
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const totalToday  = usageData?.filter(r => r.date === today).reduce((s, r) => s + r.count, 0) ?? 0;
  const totalWeek   = usageData?.filter(r => r.date >= weekAgo).reduce((s, r) => s + r.count, 0) ?? 0;
  const totalMonth  = usageData?.reduce((s, r) => s + r.count, 0) ?? 0;
  const uniqueUsers = new Set(usageData?.map(r => r.user_id) ?? []).size;
  const activeModel = MODELS[provider];
  const estCost = (activeModel.costPerSummary * totalMonth).toFixed(4);

  const code = (text) => (
    <code style={{ background: T.surface2, padding: "2px 7px", borderRadius: 5,
      fontFamily: "monospace", fontSize: 11, color: T.text, wordBreak: "break-all" }}>
      {text}
    </code>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Usage stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <Stat label="Summaries Today" value={usageLoading ? "…" : totalToday} color={T.accent} />
        <Stat label="This Week" value={usageLoading ? "…" : totalWeek} />
        <Stat label="This Month" value={usageLoading ? "…" : totalMonth} sub={`${uniqueUsers} user${uniqueUsers !== 1 ? "s" : ""}`} />
        <Stat label="Est. Cost (30d)" value={usageLoading ? "…" : `$${estCost}`}
          sub={`at ${activeModel.name} rates`} color={T.warning} />
      </div>

      {/* Provider selector */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, fontSize: 12, fontWeight: 700,
          color: T.textSecondary, textTransform: "uppercase", letterSpacing: ".07em" }}>
          Active AI Model
          {loading && <span style={{ fontWeight: 400, marginLeft: 8 }}>loading…</span>}
        </div>
        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {Object.values(MODELS).map(m => {
            const active = provider === m.id;
            return (
              <button key={m.id} onClick={() => setProviderState(m.id)} style={{
                background: active ? T.accentSurface : T.surface2,
                border: `2px solid ${active ? T.accent : T.border}`,
                borderRadius: 12, padding: "14px 16px", cursor: "pointer", fontFamily: "inherit",
                textAlign: "left", transition: "all .15s",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: active ? T.accent : T.text }}>{m.name}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                    background: active ? T.accent : T.border,
                    color: active ? "#fff" : T.textTertiary }}>
                    {active ? "ACTIVE" : m.provider}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 3, fontSize: 11, color: T.textSecondary }}>
                  <span>In: {m.input}</span>
                  <span>Out: {m.output}</span>
                  <span style={{ color: T.textTertiary, marginTop: 2 }}>
                    ~${(m.costPerSummary * 1000).toFixed(3)} per 1,000 summaries
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={save} disabled={saving || loading} style={{
            background: saved ? T.success : T.accent, border: "none",
            borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600, color: "#fff",
            cursor: saving || loading ? "not-allowed" : "pointer", fontFamily: "inherit",
            opacity: saving || loading ? 0.7 : 1, transition: "background .2s",
          }}>
            {saving ? "Saving…" : saved ? "Saved!" : "Save provider"}
          </button>
          {saveError && <span style={{ fontSize: 12, color: T.danger }}>{saveError}</span>}
          <span style={{ fontSize: 11, color: T.textTertiary }}>
            Stored in Supabase — applies to all users
          </span>
        </div>
      </div>

      {/* API key setup instructions */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, fontSize: 12, fontWeight: 700,
          color: T.textSecondary, textTransform: "uppercase", letterSpacing: ".07em" }}>
          API Key Setup
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.6 }}>
            API keys are stored as <strong style={{ color: T.text }}>server-side secrets</strong> — never in the database or browser.
            Set them once via CLI; the Worker and Edge Function pick them up automatically.
          </div>

          {/* Cloudflare Worker */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8 }}>
              Cloudflare Worker (Tier 1 — recommended)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.values(MODELS).map(m => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: T.textTertiary, width: 110, flexShrink: 0 }}>{m.name}:</span>
                  {code(m.wranglerCmd)}
                </div>
              ))}
            </div>
          </div>

          {/* Supabase Edge Function */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8 }}>
              Supabase Edge Function (Tier 2 — fallback)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.values(MODELS).map(m => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: T.textTertiary, width: 110, flexShrink: 0 }}>{m.name}:</span>
                  {code(m.supabaseCmd)}
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 11, color: T.textTertiary, background: T.surface2, padding: "8px 12px",
            borderRadius: 8, lineHeight: 1.6 }}>
            After updating secrets, redeploy: {code("npx wrangler deploy")} or {code("supabase functions deploy summarize")}
          </div>
        </div>
      </div>

    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────
export default function AnalyticsPage() {
  const { T } = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.user_metadata?.is_admin === true;

  const [tab, setTab] = useState("analytics"); // 'analytics' | 'ai-settings'
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  async function loadData() {
    setLoading(true);
    try {
      const days = last30Days();
      const since30 = new Date(); since30.setDate(since30.getDate() - 30);

      // Try to fetch user metrics from admin-stats edge function
      // Deploy with: supabase functions deploy admin-stats --no-verify-jwt
      let userStats = null;
      let edgeFnError = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: efData, error: efError } = await supabase.functions.invoke("admin-stats", {
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {},
        });
        if (efError) throw efError;
        userStats = efData?.users || null;
      } catch (err) {
        edgeFnError = err?.message || "Edge function unavailable";
        console.warn("admin-stats edge function:", edgeFnError);
      }

      // Fetch all events in the last 30 days
      const { data: rows, error } = await supabase
        .from("analytics_events")
        .select("event, user_id, session_id, created_at")
        .gte("created_at", since30.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Today / this week / this month counts by unique session
      const todayStr = isoDate(new Date());
      const weekAgo  = startOfDay(7);
      const sessions = new Set();
      const sessionsToday = new Set();
      const sessionsWeek  = new Set();
      for (const r of rows) {
        sessions.add(r.session_id);
        if (r.created_at >= startOfDay(0)) sessionsToday.add(r.session_id);
        if (r.created_at >= weekAgo)       sessionsWeek.add(r.session_id);
      }

      // Unique users (by user_id)
      const usersAll   = new Set(rows.map(r => r.user_id).filter(Boolean));
      const usersToday = new Set(rows.filter(r => r.created_at >= startOfDay(0)).map(r => r.user_id).filter(Boolean));
      const usersWeek  = new Set(rows.filter(r => r.created_at >= weekAgo).map(r => r.user_id).filter(Boolean));

      // DAU chart
      const dauByDay = {};
      for (const r of rows) {
        const d = r.created_at.slice(0, 10);
        if (!dauByDay[d]) dauByDay[d] = new Set();
        if (r.user_id) dauByDay[d].add(r.user_id);
      }
      const dauChart = days.map(d => ({ day: d, count: dauByDay[d]?.size || 0 }));

      // Event counts
      const eventCounts = {};
      for (const r of rows) {
        eventCounts[r.event] = (eventCounts[r.event] || 0) + 1;
      }
      const topEvents = Object.entries(eventCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([event, count]) => ({ event, count }));

      // Events chart (total events per day)
      const eventsByDay = {};
      for (const r of rows) {
        const d = r.created_at.slice(0, 10);
        eventsByDay[d] = (eventsByDay[d] || 0) + 1;
      }
      const eventsChart = days.map(d => ({ day: d, count: eventsByDay[d] || 0 }));

      // Upgrade funnel
      const limitHits      = rows.filter(r => r.event === "plan_limit_hit").length;
      const upgradeClicked = rows.filter(r => r.event === "upgrade_initiated").length;

      setData({
        mau: usersAll.size, wau: usersWeek.size, dau: usersToday.size,
        totalEvents: rows.length,
        dauChart, eventsChart, topEvents,
        funnel: { limitHits, upgradeClicked },
        userStats,
        edgeFnError,
      });
    } catch (err) {
      console.error("Analytics load error:", err);
    } finally {
      setLoading(false);
    }
  }

  // ── Access gate ───────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 12, color: T.textTertiary }}>
        <div style={{ fontSize: 32 }}>🔒</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Admin only</div>
        <div style={{ fontSize: 13 }}>Set <code style={{ background: T.surface2, padding: "1px 5px",
          borderRadius: 4 }}>is_admin: true</code> in your user metadata to access this page.</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 40px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: "-.01em" }}>
            Admin
          </div>
          {tab === "analytics" && (
            <button onClick={loadData} style={{ background: T.surface2, border: `1px solid ${T.border}`,
              borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600,
              color: T.textSecondary, cursor: "pointer", fontFamily: "inherit" }}>
              Refresh
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: T.surface2,
          borderRadius: 10, padding: 4, alignSelf: "flex-start", width: "fit-content" }}>
          {[
            { id: "analytics", label: "Analytics" },
            { id: "ai-settings", label: "AI Settings" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: tab === t.id ? T.card : "transparent",
              border: tab === t.id ? `1px solid ${T.border}` : "1px solid transparent",
              borderRadius: 7, padding: "6px 16px", fontSize: 12, fontWeight: 600,
              color: tab === t.id ? T.text : T.textSecondary, cursor: "pointer",
              fontFamily: "inherit", transition: "all .15s",
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* AI Settings tab */}
        {tab === "ai-settings" && <AISettingsTab T={T} />}

        {/* Analytics tab */}
        {tab === "analytics" && loading && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
            <Spinner size={28} />
          </div>
        )}

        {tab === "analytics" && !loading && data && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Edge function error banner */}
            {data.edgeFnError && (
              <div style={{ background: `${T.warning}18`, border: `1px solid ${T.warning}40`, borderRadius: 10, padding: "10px 16px", fontSize: 12, color: T.warning, display: "flex", flexDirection: "column", gap: 6 }}>
                <span><span style={{ fontWeight: 700 }}>⚠ User metrics unavailable</span> — {data.edgeFnError}</span>
                <span style={{ fontFamily: "monospace", background: T.surface2, padding: "4px 10px", borderRadius: 6, color: T.text, display: "inline-block", width: "fit-content" }}>
                  supabase functions deploy admin-stats --no-verify-jwt
                </span>
                {data.edgeFnError.includes("401") && (
                  <span style={{ color: T.textSecondary }}>401 = JWT rejected by gateway. The <code style={{ background: T.surface2, padding: "1px 5px", borderRadius: 4 }}>--no-verify-jwt</code> flag lets the function handle its own auth.</span>
                )}
              </div>
            )}

            {/* User stats — from edge function */}
            {data.userStats && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                <Stat label="Total Users" value={data.userStats.totalUsers} sub={`${data.userStats.newUsers7d} new this week`} color={T.accent} />
                <Stat label="Pro" value={data.userStats.proUsers} sub={`${data.userStats.freeUsers} free`} color={T.success} />
                <Stat label="MRR" value={`$${data.userStats.mrr}`} sub="$9 × pro seats" color={T.warning} />
                <Stat label="New (30d)" value={data.userStats.newUsers30d} sub="Signups" />
              </div>
            )}

            {/* KPI row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <Stat label="MAU" value={data.mau} sub="Unique users, 30d" color={T.accent} />
              <Stat label="WAU" value={data.wau} sub="Unique users, 7d" />
              <Stat label="DAU" value={data.dau} sub="Unique users, today" />
              <Stat label="Events" value={data.totalEvents.toLocaleString()} sub="Total, 30d" />
            </div>

            {/* Charts row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <BarChart data={data.dauChart} label="Daily active users (30d)" />
              <BarChart data={data.eventsChart} label="Events per day (30d)" color={T.warning} />
            </div>

            {/* Upgrade funnel */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`,
                fontSize: 12, fontWeight: 700, color: T.textSecondary,
                textTransform: "uppercase", letterSpacing: ".07em" }}>Upgrade funnel (30d)</div>
              <FunnelRow label="Hit a plan limit" count={data.funnel.limitHits}
                pct={null} color={T.danger} T={T} />
              <FunnelRow
                label="Clicked upgrade"
                count={data.funnel.upgradeClicked}
                pct={data.funnel.limitHits
                  ? Math.round((data.funnel.upgradeClicked / data.funnel.limitHits) * 100)
                  : null}
                color={T.accent} T={T}
              />
            </div>

            {/* Top events */}
            <EventTable events={data.topEvents.slice(0, 12)} T={T} />

            {/* Recent users — from edge function */}
            {data.userStats?.recentUsers?.length > 0 && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, fontSize: 12, fontWeight: 700, color: T.textSecondary, textTransform: "uppercase", letterSpacing: ".07em" }}>
                  Recent signups
                </div>
                {data.userStats.recentUsers.slice(0, 10).map((u, i) => (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", padding: "10px 20px", borderBottom: i < 9 ? `1px solid ${T.border}` : "none", gap: 12 }}>
                    <div style={{ flex: 1, fontSize: 13, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: u.plan === "pro" ? T.accentSurface : T.surface2, color: u.plan === "pro" ? T.accent : T.textTertiary, flexShrink: 0 }}>{u.plan === "pro" ? "PRO" : "free"}</span>
                    <div style={{ fontSize: 11, color: T.textTertiary, flexShrink: 0 }}>{new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
