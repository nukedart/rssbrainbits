// ── ReviewPage — Spaced repetition highlight review ────────────
// SM-2 scheduling stored in localStorage. No new tables needed.
import { useState, useEffect, useMemo } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { getAllHighlights } from "../lib/supabase";
import { Spinner } from "../components/UI";

// ── SM-2 helpers ───────────────────────────────────────────────
const MIN_EASE = 1.3;

function todayStr() { return new Date().toISOString().slice(0, 10); }

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function isDue(entry) {
  if (!entry) return true; // never reviewed = due now
  return entry.nextReview <= todayStr();
}

function rate(entry, rating) {
  // rating: 0=Again, 1=Good, 2=Easy
  const ease = Math.max(MIN_EASE, (entry?.ease ?? 2.5) + (rating === 2 ? 0.1 : rating === 0 ? -0.2 : 0));
  const interval = rating === 0
    ? 1
    : Math.max(1, Math.round((entry?.interval ?? 1) * (rating === 2 ? ease * 1.3 : ease)));
  return { ease, interval, nextReview: addDays(todayStr(), interval) };
}

function loadSchedule(userId) {
  try { return JSON.parse(localStorage.getItem(`fb-sr-${userId}`) || "{}"); }
  catch { return {}; }
}

function saveSchedule(userId, s) {
  localStorage.setItem(`fb-sr-${userId}`, JSON.stringify(s));
}

// ── Color dot for highlight color ─────────────────────────────
const COLOR_MAP = { yellow: "#f6c843", blue: "#60a5fa", green: "#4ade80", pink: "#f472b6", default: "#f6c843" };

export default function ReviewPage() {
  const { T } = useTheme();
  const { user } = useAuth();
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState({});
  const [queueIdx, setQueueIdx] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    setSchedule(loadSchedule(user.id));
    getAllHighlights(user.id)
      .then(setHighlights)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const queue = useMemo(
    () => highlights.filter(h => isDue(schedule[h.id])).slice(0, 20),
    [highlights, schedule]
  );

  const current = queue[queueIdx];
  const done = !loading && queueIdx >= queue.length;
  const total = queue.length;
  const progress = total > 0 ? Math.round((queueIdx / total) * 100) : 100;

  function handleRating(rating) {
    if (!current || !user) return;
    const updated = { ...schedule, [current.id]: rate(schedule[current.id], rating) };
    setSchedule(updated);
    saveSchedule(user.id, updated);
    setQueueIdx(i => i + 1);
    setSessionCount(n => n + 1);
  }

  // ── Next review date label ─────────────────────────────────
  function nextLabel(rating) {
    const s = rate(schedule[current?.id], rating);
    if (s.interval === 1) return "tomorrow";
    if (s.interval < 7) return `${s.interval}d`;
    if (s.interval < 30) return `${Math.round(s.interval / 7)}w`;
    return `${Math.round(s.interval / 30)}mo`;
  }

  const containerStyle = {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: T.bg, padding: "24px 16px", minHeight: 0,
  };

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={containerStyle}>
        <Spinner size={28} />
      </div>
    );
  }

  // ── No highlights yet ──────────────────────────────────────
  if (!loading && highlights.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✦</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 8 }}>No highlights yet</div>
        <div style={{ fontSize: 14, color: T.textSecondary, textAlign: "center", maxWidth: 320 }}>
          Select text while reading to create a highlight. Your highlights will appear here for spaced repetition review.
        </div>
      </div>
    );
  }

  // ── All done ───────────────────────────────────────────────
  if (done) {
    const totalHighlights = highlights.length;
    const dueTomorrow = highlights.filter(h => {
      const s = schedule[h.id];
      return s && s.nextReview === addDays(todayStr(), 1);
    }).length;

    return (
      <div style={containerStyle}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 8 }}>
          {sessionCount > 0 ? `${sessionCount} reviewed!` : "All caught up!"}
        </div>
        <div style={{ fontSize: 14, color: T.textSecondary, marginBottom: 4 }}>
          {sessionCount > 0
            ? `You reviewed ${sessionCount} highlight${sessionCount !== 1 ? "s" : ""} today.`
            : "No highlights are due for review right now."}
        </div>
        {dueTomorrow > 0 && (
          <div style={{ fontSize: 13, color: T.textTertiary, marginTop: 4 }}>
            {dueTomorrow} due tomorrow · {totalHighlights} total
          </div>
        )}
      </div>
    );
  }

  // ── Card review ────────────────────────────────────────────
  const dotColor = COLOR_MAP[current.color] || COLOR_MAP.default;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.bg, minHeight: 0 }}>
      {/* Progress bar */}
      <div style={{ height: 3, background: T.border, flexShrink: 0 }}>
        <div style={{ height: 3, width: `${progress}%`, background: T.accent, transition: "width .3s" }} />
      </div>

      {/* Counter */}
      <div style={{ padding: "12px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.textTertiary }}>
          Daily Review
        </div>
        <div style={{ fontSize: 12, color: T.textTertiary }}>
          {queueIdx + 1} / {total}
        </div>
      </div>

      {/* Card */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px" }}>
        <div style={{
          width: "100%", maxWidth: 560,
          background: T.card, borderRadius: 16,
          boxShadow: "0 4px 24px rgba(0,0,0,.08)",
          border: `1px solid ${T.border}`,
          overflow: "hidden",
        }}>
          {/* Highlight color strip */}
          <div style={{ height: 4, background: dotColor }} />

          <div style={{ padding: "28px 28px 24px" }}>
            {/* Highlight text */}
            <div style={{
              fontSize: 17, lineHeight: 1.65, color: T.text,
              fontStyle: "italic", marginBottom: 20,
            }}>
              "{current.text}"
            </div>

            {/* Note, if any */}
            {current.note && (
              <div style={{
                fontSize: 13, color: T.textSecondary, lineHeight: 1.5,
                borderLeft: `3px solid ${T.border}`, paddingLeft: 12, marginBottom: 20,
              }}>
                {current.note}
              </div>
            )}

            {/* Source */}
            <div style={{ fontSize: 12, color: T.textTertiary, letterSpacing: ".01em" }}>
              {current.article_title || current.article_url}
            </div>
          </div>
        </div>
      </div>

      {/* Rating buttons */}
      <div style={{ padding: "0 16px 32px", display: "flex", gap: 10, justifyContent: "center", flexShrink: 0 }}>
        {[
          { rating: 0, label: "Again", sub: nextLabel(0), bg: T.surface, border: T.border, color: T.text },
          { rating: 1, label: "Good",  sub: nextLabel(1), bg: T.accent, border: T.accent, color: T.accentText },
          { rating: 2, label: "Easy",  sub: nextLabel(2), bg: T.surface, border: T.border, color: T.text },
        ].map(({ rating, label, sub, bg, border, color }) => (
          <button
            key={rating}
            onClick={() => handleRating(rating)}
            style={{
              flex: 1, maxWidth: 160,
              background: bg, border: `1.5px solid ${border}`, borderRadius: 12,
              padding: "12px 8px", cursor: "pointer", fontFamily: "inherit",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color }}>{label}</span>
            <span style={{ fontSize: 11, color: T.textTertiary }}>{sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
