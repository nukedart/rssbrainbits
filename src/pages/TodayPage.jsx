import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import { getReadingStats, getHighlightReviews, getSaved, getHistory } from "../lib/supabase";

function relTime(dateStr) {
  if (!dateStr) return "";
  const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return "yesterday";
}

function daysSince(dateStr) {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

// ── Icons ─────────────────────────────────────────────────────
const Ic = {
  Review: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 8a5.5 5.5 0 0 1-9.9 3.3M2.5 8a5.5 5.5 0 0 1 9.9-3.3"/>
      <path d="M11.5 4.5l.9-2.1 2.1.9"/><path d="M4.5 11.5l-.9 2.1-2.1-.9"/>
    </svg>
  ),
  Saved: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1.5.87L8 11.5l-4.5 2.37A1 1 0 0 1 2 13V3a1 1 0 0 1 1-1z"/>
    </svg>
  ),
  Inbox: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="13" height="13" rx="2.5"/>
      <path d="M1.5 10h3l1.5 2.5h4L11.5 10h3"/>
    </svg>
  ),
  Check: () => (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5l3.5 3.5 6.5-7"/>
    </svg>
  ),
  Article: () => (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="12" height="12" rx="2"/>
      <path d="M5 6h6M5 9h4"/>
    </svg>
  ),
};

export default function TodayPage({ feeds = [], onNavigate, feedUnreadCounts = {}, unreadCount = 0 }) {
  const { T }        = useTheme();
  const { user }     = useAuth();
  const { isMobile } = useBreakpoint();

  const [streak, setStreak]         = useState(0);
  const [thisWeek, setThisWeek]     = useState(0);
  const [reviewDue, setReviewDue]   = useState(0);
  const [savedItems, setSavedItems] = useState([]);
  const [todayLog, setTodayLog]     = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem(`fb-streak-${user.id}`);
      setStreak(raw ? (JSON.parse(raw).streak ?? 0) : 0);
    } catch {}

    setLoading(true);
    Promise.allSettled([
      getReadingStats(user.id),
      getHighlightReviews(user.id),
      getSaved(user.id, 200),
      getHistory(user.id, 100),
    ]).then(([statsRes, reviewsRes, savedRes, historyRes]) => {
      if (statsRes.status === "fulfilled") {
        setThisWeek(statsRes.value.thisWeek ?? 0);
      }
      if (reviewsRes.status === "fulfilled") {
        const today = new Date().toISOString().slice(0, 10);
        setReviewDue(reviewsRes.value.filter(r => !r.next_review || r.next_review <= today).length);
      }
      if (savedRes.status === "fulfilled") {
        setSavedItems(savedRes.value || []);
      }
      if (historyRes.status === "fulfilled") {
        const todayStr = new Date().toISOString().slice(0, 10);
        setTodayLog((historyRes.value || []).filter(h => h.read_at?.startsWith(todayStr)));
      }
    }).finally(() => setLoading(false));
  }, [user]);

  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  // Feed pulse: top feeds sorted by unread
  const feedPulse = Object.entries(feedUnreadCounts)
    .filter(([, n]) => n > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 7)
    .map(([feedId, count]) => {
      const f = feeds.find(f => f.id === feedId || String(f.id) === String(feedId));
      return { name: f?.name || "Unknown feed", color: f?.color, count };
    });
  const maxPulse = feedPulse[0]?.count || 1;

  // Oldest saved item
  const oldestSaved = savedItems.length > 0
    ? daysSince(savedItems[savedItems.length - 1]?.saved_at)
    : 0;

  const pad = isMobile ? "0 16px 96px" : "0 24px 48px";
  const maxW = isMobile ? "100%" : 560;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: pad }}>
      <div style={{ maxWidth: maxW, margin: "0 auto" }}>

        {/* ── Header ────────────────────────────────────────── */}
        <div style={{ padding: "22px 0 18px", borderBottom: `1px solid ${T.border}`, marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 4 }}>
            {dateLabel}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: T.text, letterSpacing: "-.03em", lineHeight: 1 }}>
              Today
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              {streak > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>🔥</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: T.text, letterSpacing: "-.02em" }}>{streak}</span>
                  <span style={{ fontSize: 11, color: T.textTertiary }}>day{streak !== 1 ? "s" : ""}</span>
                </div>
              )}
              {thisWeek > 0 && (
                <div style={{ fontSize: 12, color: T.textTertiary }}>
                  <span style={{ fontWeight: 700, color: T.textSecondary }}>{thisWeek}</span> this week
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Queue ─────────────────────────────────────────── */}
        <SectionLabel T={T}>Your Queue</SectionLabel>
        <div style={{ marginBottom: 32, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
          <QueueRow
            T={T}
            icon={<Ic.Review />}
            accent={reviewDue > 0}
            label={reviewDue > 0 ? `${reviewDue} card${reviewDue !== 1 ? "s" : ""} due` : "No cards due"}
            sub={reviewDue > 0 ? "Spaced repetition · tap to review" : "All caught up"}
            cta={reviewDue > 0 ? "Review" : null}
            onCta={() => onNavigate("review")}
          />
          <QueueRow
            T={T}
            icon={<Ic.Saved />}
            accent={false}
            label={savedItems.length > 0 ? `${savedItems.length} saved` : "Nothing saved"}
            sub={savedItems.length > 0
              ? (oldestSaved > 1 ? `Oldest ${oldestSaved}d ago — don't let it pile up` : "Saved recently")
              : "Bookmark articles to read later"}
            cta={savedItems.length > 0 ? "Read" : null}
            onCta={() => onNavigate("readlater")}
            warn={oldestSaved > 7}
          />
          <QueueRow
            T={T}
            icon={<Ic.Inbox />}
            accent={false}
            label={unreadCount > 0 ? `${unreadCount} unread` : "Inbox clear"}
            sub={unreadCount > 0 ? "New articles in your feeds" : "Nothing new"}
            cta={unreadCount > 0 ? "Open" : null}
            onCta={() => onNavigate("inbox")}
            last
          />
        </div>

        {/* ── Feed Pulse ────────────────────────────────────── */}
        {feedPulse.length > 0 && (
          <>
            <SectionLabel T={T}>Feed Pulse</SectionLabel>
            <div style={{ marginBottom: 32, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
              {feedPulse.map((f, i) => (
                <div
                  key={i}
                  onClick={() => onNavigate("inbox")}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "11px 16px",
                    borderBottom: i < feedPulse.length - 1 ? `1px solid ${T.border}` : "none",
                    cursor: "pointer",
                  }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    background: f.color || T.textTertiary,
                  }} />
                  <div style={{
                    width: isMobile ? 120 : 160, fontSize: 13, fontWeight: 500,
                    color: T.text, overflow: "hidden", textOverflow: "ellipsis",
                    whiteSpace: "nowrap", flexShrink: 0,
                  }}>
                    {f.name}
                  </div>
                  <div style={{ flex: 1, height: 3, background: T.surface2, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 2,
                      width: `${Math.max(4, (f.count / maxPulse) * 100)}%`,
                      background: f.color || T.accent,
                      opacity: 0.7,
                    }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, minWidth: 24, textAlign: "right", flexShrink: 0 }}>
                    {f.count}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Reading Log ───────────────────────────────────── */}
        {!loading && (
          <>
            <SectionLabel T={T}>
              Read Today
              {todayLog.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: T.accent, background: T.accentSurface, padding: "2px 7px", borderRadius: 100 }}>
                  {todayLog.length}
                </span>
              )}
            </SectionLabel>
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 32 }}>
              {todayLog.length === 0 ? (
                <div style={{ padding: "20px 16px", fontSize: 13, color: T.textTertiary }}>
                  Nothing read yet today. Open the Inbox to get started.
                </div>
              ) : (
                todayLog.map((h, i) => (
                  <div
                    key={h.url || i}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 16px",
                      borderBottom: i < todayLog.length - 1 ? `1px solid ${T.border}` : "none",
                    }}
                  >
                    <span style={{ color: T.success, flexShrink: 0 }}><Ic.Check /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 500, color: T.text,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        marginBottom: 1,
                      }}>
                        {h.title || h.url}
                      </div>
                      <div style={{ fontSize: 11, color: T.textTertiary }}>
                        {h.source}{h.read_at ? ` · ${relTime(h.read_at)}` : ""}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {[1, 0.6, 0.35].map((op, i) => (
              <div key={i} className="skeleton" style={{ height: 52, borderRadius: 10, opacity: op }} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function SectionLabel({ T, children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: T.textTertiary,
      textTransform: "uppercase", letterSpacing: ".14em",
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function QueueRow({ T, icon, label, sub, cta, onCta, accent, warn, last }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "13px 16px",
        borderBottom: last ? "none" : `1px solid ${T.border}`,
        background: hov ? T.surface : "transparent",
        transition: "background .1s",
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        background: accent ? T.accentSurface : T.surface,
        color: accent ? T.accent : warn ? T.warning : T.textSecondary,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700,
          color: accent ? T.accent : T.text,
          lineHeight: 1.2, marginBottom: 2,
        }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: warn ? T.warning : T.textTertiary, lineHeight: 1.3 }}>
          {sub}
        </div>
      </div>
      {cta && (
        <button
          onClick={onCta}
          style={{
            background: accent ? T.accent : T.surface2,
            color: accent ? T.accentText : T.textSecondary,
            border: "none", borderRadius: 8,
            padding: "7px 13px", fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
            transition: "opacity .1s",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = ".82"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          {cta} →
        </button>
      )}
    </div>
  );
}
